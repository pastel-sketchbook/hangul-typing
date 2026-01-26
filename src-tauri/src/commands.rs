//! Tauri commands for Copilot integration.
//!
//! These commands are invoked from the frontend via `invoke()`.

use crate::copilot::{self, AssistantResponse, CopilotError, LearningContext};
use serde::Serialize;
use tracing::{debug, error, info, warn};

/// Response wrapper for frontend
#[derive(Debug, Serialize)]
pub struct CommandResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> CommandResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

/// Status of the Copilot service
#[derive(Debug, Serialize)]
pub struct CopilotStatus {
    pub available: bool,
    pub running: bool,
    pub cli_installed: bool,
    pub cli_authenticated: bool,
    pub message: String,
}

/// Check Copilot availability without starting the service
#[tauri::command]
pub async fn copilot_check() -> CommandResponse<CopilotStatus> {
    debug!("Checking Copilot availability...");

    let availability = copilot::check_availability();

    CommandResponse::ok(CopilotStatus {
        available: availability.available,
        running: false,
        cli_installed: availability.cli_installed,
        cli_authenticated: availability.cli_authenticated,
        message: availability.message,
    })
}

/// Initialize the Copilot service
#[tauri::command]
pub async fn copilot_init() -> CommandResponse<CopilotStatus> {
    debug!("Initializing Copilot service...");

    // First check availability
    let availability = copilot::check_availability();

    if !availability.available {
        info!("Copilot not available: {}", availability.message);
        return CommandResponse::ok(CopilotStatus {
            available: false,
            running: false,
            cli_installed: availability.cli_installed,
            cli_authenticated: availability.cli_authenticated,
            message: availability.message,
        });
    }

    // Try to initialize
    match copilot::init().await {
        Ok(()) => {
            CommandResponse::ok(CopilotStatus {
                available: true,
                running: true,
                cli_installed: true,
                cli_authenticated: true,
                message: "AI assistant ready".to_string(),
            })
        }
        Err(e) => {
            let (cli_installed, cli_authenticated, message) = match &e {
                CopilotError::CliNotFound => (
                    false,
                    false,
                    "GitHub Copilot CLI not found. Install it to enable AI assistant.".to_string(),
                ),
                CopilotError::NotAuthenticated => (
                    true,
                    false,
                    "GitHub CLI not authenticated. Run 'gh auth login' first.".to_string(),
                ),
                _ => (true, true, format!("Failed to start: {}", e)),
            };

            warn!("Copilot init failed: {}", message);
            CommandResponse::ok(CopilotStatus {
                available: false,
                running: false,
                cli_installed,
                cli_authenticated,
                message,
            })
        }
    }
}

/// Check if Copilot is available and running
#[tauri::command]
pub async fn copilot_status() -> CommandResponse<CopilotStatus> {
    let service = copilot::get_service();
    let running = service.is_running().await;
    let availability = copilot::check_availability();

    CommandResponse::ok(CopilotStatus {
        available: availability.available && running,
        running,
        cli_installed: availability.cli_installed,
        cli_authenticated: availability.cli_authenticated,
        message: if running {
            "AI assistant ready".to_string()
        } else if !availability.cli_installed {
            "GitHub Copilot CLI not installed".to_string()
        } else if !availability.cli_authenticated {
            "GitHub CLI not authenticated".to_string()
        } else {
            "AI assistant not running".to_string()
        },
    })
}

/// Ask a general question to the Copilot assistant
#[tauri::command]
pub async fn copilot_ask(
    prompt: String,
    context: Option<LearningContext>,
) -> CommandResponse<AssistantResponse> {
    debug!("Copilot ask: {}", prompt);

    let service = copilot::get_service();

    if !service.is_running().await {
        return CommandResponse::err("AI assistant not running. Copilot CLI may not be installed.".to_string());
    }

    match service.ask(&prompt, context).await {
        Ok(response) => CommandResponse::ok(response),
        Err(e) => {
            error!("Copilot ask failed: {}", e);
            CommandResponse::err(e.to_string())
        }
    }
}

/// Get a hint for the current typing target
#[tauri::command]
pub async fn copilot_hint(
    target: String,
    user_input: String,
    level: u32,
) -> CommandResponse<AssistantResponse> {
    debug!("Copilot hint: target='{}', input='{}'", target, user_input);

    let service = copilot::get_service();

    if !service.is_running().await {
        return CommandResponse::err("AI assistant not available".to_string());
    }

    match service.get_hint(&target, &user_input, level).await {
        Ok(response) => CommandResponse::ok(response),
        Err(e) => {
            error!("Copilot hint failed: {}", e);
            CommandResponse::err(e.to_string())
        }
    }
}

/// Explain a Korean character or word
#[tauri::command]
pub async fn copilot_explain(text: String) -> CommandResponse<AssistantResponse> {
    debug!("Copilot explain: '{}'", text);

    let service = copilot::get_service();

    if !service.is_running().await {
        return CommandResponse::err("AI assistant not available".to_string());
    }

    match service.explain(&text).await {
        Ok(response) => CommandResponse::ok(response),
        Err(e) => {
            error!("Copilot explain failed: {}", e);
            CommandResponse::err(e.to_string())
        }
    }
}

/// Analyze a typing mistake
#[tauri::command]
pub async fn copilot_analyze_mistake(
    expected: String,
    actual: String,
) -> CommandResponse<AssistantResponse> {
    debug!("Copilot analyze: expected='{}', actual='{}'", expected, actual);

    let service = copilot::get_service();

    if !service.is_running().await {
        return CommandResponse::err("AI assistant not available".to_string());
    }

    match service.analyze_mistake(&expected, &actual).await {
        Ok(response) => CommandResponse::ok(response),
        Err(e) => {
            error!("Copilot analyze failed: {}", e);
            CommandResponse::err(e.to_string())
        }
    }
}

/// Shutdown the Copilot service
#[tauri::command]
pub async fn copilot_shutdown() -> CommandResponse<()> {
    debug!("Shutting down Copilot service...");

    match copilot::shutdown().await {
        Ok(()) => {
            info!("Copilot service stopped");
            CommandResponse::ok(())
        }
        Err(e) => {
            error!("Copilot shutdown failed: {}", e);
            CommandResponse::err(e.to_string())
        }
    }
}
