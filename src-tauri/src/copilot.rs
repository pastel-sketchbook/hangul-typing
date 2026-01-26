//! Copilot SDK integration for AI-powered learning assistance.
//!
//! This module provides a managed Copilot client with session pooling
//! and Hangul-specific tools for the typing trainer.
//!
//! The feature is conditionally enabled based on whether GitHub Copilot CLI
//! is installed and authenticated on the user's machine.

use copilot_sdk::{
    Client, SessionConfig, SessionEventData, SystemMessageConfig, SystemMessageMode,
};
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::{Mutex, RwLock};
use tracing::{debug, error, info, warn};

/// Global Copilot service instance
static COPILOT_SERVICE: OnceCell<CopilotService> = OnceCell::new();

/// Errors that can occur during Copilot operations
#[derive(Debug, Error)]
pub enum CopilotError {
    #[error("Copilot service not initialized")]
    NotInitialized,
    #[error(
        "GitHub Copilot CLI not found. Please install it from https://docs.github.com/en/copilot/github-copilot-in-the-cli"
    )]
    CliNotFound,
    #[error(
        "GitHub Copilot CLI not authenticated. Run 'gh auth login' and 'gh extension install github/gh-copilot'"
    )]
    NotAuthenticated,
    #[error("Failed to start Copilot client: {0}")]
    StartFailed(String),
    #[error("Failed to create session: {0}")]
    SessionFailed(String),
    #[error("Failed to send message: {0}")]
    SendFailed(String),
    #[error("Session timeout")]
    Timeout,
}

/// Context about the user's current learning state
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LearningContext {
    pub current_level: u32,
    pub current_target: Option<String>,
    pub recent_mistakes: Vec<String>,
    pub accuracy: f32,
    pub total_attempts: u32,
}

/// Response from the Copilot assistant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssistantResponse {
    pub content: String,
    pub tool_used: Option<String>,
}

/// Result of checking Copilot CLI availability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopilotAvailability {
    pub cli_installed: bool,
    pub cli_authenticated: bool,
    pub available: bool,
    pub message: String,
}

/// Check if GitHub Copilot CLI is installed
fn is_copilot_cli_installed() -> bool {
    // Try to find 'copilot' in PATH
    if Command::new("copilot")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        return true;
    }

    // Also check for 'gh copilot' (GitHub CLI extension)
    Command::new("gh")
        .args(["copilot", "--version"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Check if GitHub CLI is authenticated
/// Note: `gh auth status` returns non-zero if ANY account has issues,
/// even if the active account is fine. So we check the output text instead.
fn is_gh_authenticated() -> bool {
    let output = Command::new("gh").args(["auth", "status"]).output();

    match output {
        Ok(o) => {
            // Combine stdout and stderr (gh auth status writes to stderr)
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stderr = String::from_utf8_lossy(&o.stderr);
            let combined = format!("{}{}", stdout, stderr);

            // Check if there's at least one logged-in account with active status
            let logged_in = combined.contains("Logged in to");
            let active = combined.contains("Active account: true");

            debug!(
                "GitHub CLI auth check: logged_in={}, active={}, exit_code={:?}",
                logged_in,
                active,
                o.status.code()
            );

            logged_in && active
        }
        Err(e) => {
            warn!("Failed to run gh auth status: {}", e);
            false
        }
    }
}

/// Check full Copilot availability
pub fn check_availability() -> CopilotAvailability {
    let cli_installed = is_copilot_cli_installed();
    let cli_authenticated = is_gh_authenticated();

    let (available, message) = match (cli_installed, cli_authenticated) {
        (true, true) => (true, "GitHub Copilot is ready".to_string()),
        (true, false) => (
            false,
            "GitHub CLI not authenticated. Run 'gh auth login' to enable AI assistant.".to_string(),
        ),
        (false, _) => (
            false,
            "GitHub Copilot CLI not found. Install it to enable AI assistant.".to_string(),
        ),
    };

    CopilotAvailability {
        cli_installed,
        cli_authenticated,
        available,
        message,
    }
}

/// The Copilot service manages client lifecycle and sessions
pub struct CopilotService {
    client: Arc<Mutex<Option<Client>>>,
    is_running: Arc<RwLock<bool>>,
    system_prompt: String,
}

impl CopilotService {
    /// Create a new Copilot service (does not start the client)
    pub fn new() -> Self {
        let system_prompt = r#"You are a friendly Korean typing tutor helping non-Korean speakers learn to type Hangul.

<your_knowledge>
- The 2-Bulsik (두벌식) keyboard layout standard in Korea
- How jamo (자모) combine to form syllables: initial + vowel + optional final
- Common typing mistakes English speakers make
- Korean pronunciation basics (romanization)
</your_knowledge>

<your_style>
- Encouraging and patient - learning a new writing system is hard!
- Use simple explanations with concrete examples
- Break down complex syllables step-by-step
- Celebrate progress, never punish mistakes
- Keep responses concise (1-3 sentences unless explaining in detail)
- When showing keyboard keys, use the English letter equivalent
- IMPORTANT: Always respond in the same language the user writes in. If they ask in Spanish, respond in Spanish. If they ask in Japanese, respond in Japanese. Only the Korean characters being taught should remain in Korean.
</your_style>

<keyboard_layout>
The 2-Bulsik layout maps English keys to Korean jamo:
- Consonants (left hand): ㅂ(q) ㅈ(w) ㄷ(e) ㄱ(r) ㅅ(t) ㅁ(a) ㄴ(s) ㅇ(d) ㄹ(f) ㅎ(g) ㅋ(z) ㅌ(x) ㅊ(c) ㅍ(v)
- Vowels (right hand): ㅛ(y) ㅕ(u) ㅑ(i) ㅐ(o) ㅔ(p) ㅗ(h) ㅓ(j) ㅏ(k) ㅣ(l) ㅠ(b) ㅜ(n) ㅡ(m)
- Double consonants: Shift + base consonant (ㄲ=Shift+r, ㄸ=Shift+e, etc.)
</keyboard_layout>

When the user asks about typing a character or word, explain which English keys to press in order."#.to_string();

        Self {
            client: Arc::new(Mutex::new(None)),
            is_running: Arc::new(RwLock::new(false)),
            system_prompt,
        }
    }

    /// Initialize and start the Copilot client
    /// Returns error if Copilot CLI is not installed or not authenticated
    pub async fn start(&self) -> Result<(), CopilotError> {
        let mut client_lock = self.client.lock().await;

        if client_lock.is_some() {
            debug!("Copilot client already running");
            return Ok(());
        }

        // Check if Copilot CLI is available before attempting to start
        debug!("Checking Copilot CLI availability...");
        let availability = check_availability();
        debug!(
            "Availability: cli_installed={}, cli_authenticated={}, available={}",
            availability.cli_installed, availability.cli_authenticated, availability.available
        );

        if !availability.cli_installed {
            warn!("Copilot CLI not installed");
            return Err(CopilotError::CliNotFound);
        }

        if !availability.cli_authenticated {
            warn!("GitHub CLI not authenticated");
            return Err(CopilotError::NotAuthenticated);
        }

        debug!("Starting Copilot client with stdio transport...");

        let client = Client::builder().use_stdio(true).build().map_err(|e| {
            error!("Failed to build client: {}", e);
            CopilotError::StartFailed(e.to_string())
        })?;

        debug!("Client built, starting...");

        client.start().await.map_err(|e| {
            error!("Failed to start client: {}", e);
            CopilotError::StartFailed(e.to_string())
        })?;

        *client_lock = Some(client);
        *self.is_running.write().await = true;

        info!("Copilot AI assistant ready");
        Ok(())
    }

    /// Stop the Copilot client
    pub async fn stop(&self) -> Result<(), CopilotError> {
        let mut client_lock = self.client.lock().await;

        if let Some(client) = client_lock.take() {
            info!("Stopping Copilot client...");
            *self.is_running.write().await = false;
            client
                .stop()
                .await
                .map_err(|e| CopilotError::SendFailed(e.to_string()))?;
            info!("Copilot client stopped");
        }

        Ok(())
    }

    /// Check if the service is running
    pub async fn is_running(&self) -> bool {
        *self.is_running.read().await
    }

    /// Send a message to Copilot and get a response
    pub async fn ask(
        &self,
        prompt: &str,
        context: Option<LearningContext>,
    ) -> Result<AssistantResponse, CopilotError> {
        let client_lock = self.client.lock().await;
        let client = client_lock.as_ref().ok_or(CopilotError::NotInitialized)?;

        // Build context-aware prompt
        let full_prompt = if let Some(ctx) = context {
            format!(
                "{}\n\n<current_context>\nLevel: {}\nTarget: {}\nRecent mistakes: {:?}\nAccuracy: {:.0}%\n</current_context>",
                prompt,
                ctx.current_level,
                ctx.current_target.unwrap_or_default(),
                ctx.recent_mistakes,
                ctx.accuracy * 100.0
            )
        } else {
            prompt.to_string()
        };

        debug!("Creating Copilot session...");

        // Create session with our tutor persona
        let config = SessionConfig {
            system_message: Some(SystemMessageConfig {
                mode: Some(SystemMessageMode::Replace),
                content: Some(self.system_prompt.clone()),
            }),
            ..Default::default()
        };

        let session = client.create_session(config).await.map_err(|e| {
            error!("Failed to create session: {}", e);
            CopilotError::SessionFailed(e.to_string())
        })?;

        debug!("Session created, subscribing to events...");

        // Subscribe BEFORE sending to not miss any events
        let mut events = session.subscribe();

        debug!("Sending message ({} chars)...", full_prompt.len());

        // Send the message
        let message_id = session.send(full_prompt.as_str()).await.map_err(|e| {
            error!("Failed to send message: {}", e);
            CopilotError::SendFailed(e.to_string())
        })?;

        debug!("Message sent (id={}), waiting for response...", message_id);

        // Collect response from events
        let mut response_content = String::new();

        loop {
            match tokio::time::timeout(std::time::Duration::from_secs(60), events.recv()).await {
                Ok(Ok(event)) => {
                    debug!("Event: {:?}", std::mem::discriminant(&event.data));
                    match &event.data {
                        SessionEventData::AssistantMessageDelta(delta) => {
                            debug!("Delta: +{} chars", delta.delta_content.len());
                            response_content.push_str(&delta.delta_content);
                        }
                        SessionEventData::AssistantMessage(msg) => {
                            debug!("Full message: {} chars", msg.content.len());
                            if response_content.is_empty() {
                                response_content = msg.content.clone();
                            }
                        }
                        SessionEventData::SessionIdle(_) => {
                            debug!("Session idle");
                            break;
                        }
                        SessionEventData::SessionError(err) => {
                            error!("Copilot session error: {}", err.message);
                            return Err(CopilotError::SendFailed(err.message.clone()));
                        }
                        _ => {}
                    }
                }
                Ok(Err(e)) => {
                    warn!("Event channel error: {:?}", e);
                    break;
                }
                Err(_) => {
                    error!("Timeout waiting for Copilot response");
                    return Err(CopilotError::Timeout);
                }
            }
        }

        info!("Copilot response: {} chars", response_content.len());

        Ok(AssistantResponse {
            content: response_content,
            tool_used: None,
        })
    }

    /// Get a hint for the current typing target
    pub async fn get_hint(
        &self,
        target: &str,
        user_input: &str,
        level: u32,
    ) -> Result<AssistantResponse, CopilotError> {
        let prompt = format!(
            "The student is trying to type \"{}\" but typed \"{}\". They are on level {}. Give a brief, encouraging hint about which key to press next. Don't give away the full answer.",
            target, user_input, level
        );

        self.ask(&prompt, None).await
    }

    /// Explain a specific jamo or syllable
    pub async fn explain(&self, text: &str) -> Result<AssistantResponse, CopilotError> {
        let prompt = format!(
            "Explain the Korean character or word \"{}\": what it is, how to pronounce it (romanization), and exactly which English keys to press to type it on a 2-Bulsik keyboard.",
            text
        );

        self.ask(&prompt, None).await
    }

    /// Analyze a typing mistake
    pub async fn analyze_mistake(
        &self,
        expected: &str,
        actual: &str,
    ) -> Result<AssistantResponse, CopilotError> {
        let prompt = format!(
            "The student tried to type \"{}\" but typed \"{}\". Briefly explain what went wrong and how to fix it.",
            expected, actual
        );

        self.ask(&prompt, None).await
    }
}

/// Get or initialize the global Copilot service
pub fn get_service() -> &'static CopilotService {
    COPILOT_SERVICE.get_or_init(CopilotService::new)
}

/// Initialize the Copilot service (call on app startup)
pub async fn init() -> Result<(), CopilotError> {
    let service = get_service();
    service.start().await
}

/// Shutdown the Copilot service (call on app exit)
pub async fn shutdown() -> Result<(), CopilotError> {
    let service = get_service();
    service.stop().await
}
