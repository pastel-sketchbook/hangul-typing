# 0006: GitHub Copilot AI Assistant Integration

This document explains how **hangul-typing** integrates GitHub Copilot as an AI-powered Korean typing tutor assistant, and the architectural decisions behind the implementation.

## Overview

The Copilot integration adds an **AI assistant panel** that helps users learn Korean typing through:
- Contextual explanations of Hangul characters and composition
- Typing hints when users are stuck
- Mistake analysis with personalized feedback
- Natural language Q&A about Korean typing
- **Markdown-rendered responses** for rich formatting

The assistant is **conditionally enabled** based on whether the user has GitHub Copilot CLI installed and authenticated.

## Architecture

```
+------------------------------------------------------------------+
|                    Tauri App (Desktop)                            |
|  +------------------------------------------------------------+  |
|  |                 WebView (Frontend)                         |  |
|  |  +--------------------------------------------------+      |  |
|  |  |          assistant-ui.ts                         |      |  |
|  |  |  - Collapsible panel UI (480px, 70vh max)        |      |  |
|  |  |  - Markdown rendering for responses              |      |  |
|  |  |  - Quick action buttons                          |      |  |
|  |  |  - Warm gradient background                      |      |  |
|  |  +--------------------------------------------------+      |  |
|  |                         |                                   |  |
|  |  +--------------------------------------------------+      |  |
|  |  |          copilot-client.ts                       |      |  |
|  |  |  - CopilotClient class                           |      |  |
|  |  |  - Tauri invoke wrappers                         |      |  |
|  |  |  - Graceful degradation                          |      |  |
|  |  +--------------------------------------------------+      |  |
|  +-----------------------------+------------------------------+  |
|                                | IPC (invoke)                    |
|  +-----------------------------v------------------------------+  |
|  |               Rust Backend (src-tauri/)                    |  |
|  |  +--------------------------------------------------+      |  |
|  |  |          commands.rs                             |      |  |
|  |  |  - copilot_check: CLI availability check         |      |  |
|  |  |  - copilot_init: Initialize service              |      |  |
|  |  |  - copilot_ask: General questions                |      |  |
|  |  |  - copilot_hint: Get typing hints                |      |  |
|  |  |  - copilot_explain: Explain characters           |      |  |
|  |  |  - copilot_analyze_mistake: Error analysis       |      |  |
|  |  +--------------------------------------------------+      |  |
|  |                         |                                   |  |
|  |  +--------------------------------------------------+      |  |
|  |  |          copilot.rs                              |      |  |
|  |  |  - CopilotService: Session management            |      |  |
|  |  |  - CLI detection (copilot, gh copilot)           |      |  |
|  |  |  - Authentication verification (text parsing)    |      |  |
|  |  |  - Korean tutor system prompt                    |      |  |
|  |  +--------------------------------------------------+      |  |
|  +-----------------------------+------------------------------+  |
|                                | JSON-RPC (stdio)               |
|  +-----------------------------v------------------------------+  |
|  |       Copilot CLI (external, user-installed)               |  |
|  |       - copilot OR gh copilot extension                    |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

## Why Copilot SDK?

### Decision Context

We wanted to add intelligent assistance for Korean typing learners. We evaluated these approaches:

| Approach                    | Pros                                  | Cons                                      |
|-----------------------------|---------------------------------------|-------------------------------------------|
| **Static hints database**   | Fast, no dependencies, works offline  | Limited responses, no personalization     |
| **OpenAI API directly**     | Flexible, well-documented             | Requires API key, costs money, privacy    |
| **Local LLM (llama.cpp)**   | Offline, private                      | Large models (~4GB), slow on CPU          |
| **GitHub Copilot SDK**      | Free for subscribers, high quality    | Requires CLI, only desktop                |

**We chose GitHub Copilot** because:
1. **Target users likely have Copilot** - Developers learning Korean often have GitHub Copilot subscriptions
2. **No API keys to manage** - Uses existing Copilot authentication
3. **High quality responses** - Powered by state-of-the-art models
4. **Free for existing subscribers** - No additional cost

### Why Not Client-Side?

The `@github/copilot-sdk` (JavaScript) **cannot run in browsers** because:
- It spawns the Copilot CLI as a child process
- Browsers don't have process spawning capabilities
- WebAssembly can't access system processes

Therefore, we **must use the Tauri Rust backend** to communicate with Copilot CLI.

### Why Not Official Rust SDK?

GitHub's official SDK is JavaScript-only. We use `copilot-sdk-rust`, a community Rust implementation that:
- Follows the same JSON-RPC protocol
- Communicates with Copilot CLI via stdio
- Provides async/await API compatible with Tauri

## Implementation Details

### CLI Detection Strategy

The assistant only appears if the user has Copilot access. Detection happens in three steps:

**Step 1: Check for Copilot CLI** (`copilot.rs`)
```rust
fn is_copilot_cli_installed() -> bool {
    // Try standalone copilot command
    if Command::new("copilot").arg("--version").output()
        .map(|o| o.status.success()).unwrap_or(false) {
        return true;
    }
    // Try gh copilot extension
    Command::new("gh").args(["copilot", "--version"]).output()
        .map(|o| o.status.success()).unwrap_or(false)
}
```

**Step 2: Check GitHub CLI Authentication** (`copilot.rs`)

Note: `gh auth status` returns non-zero if ANY account has issues, even if the active account is fine. We parse the output text instead:

```rust
fn is_gh_authenticated() -> bool {
    let output = Command::new("gh").args(["auth", "status"]).output();
    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stderr = String::from_utf8_lossy(&o.stderr);
            let combined = format!("{}{}", stdout, stderr);
            // Check for active logged-in account
            combined.contains("Logged in to") && combined.contains("Active account: true")
        }
        Err(_) => false,
    }
}
```

**Step 3: Return Status to Frontend** (`commands.rs`)
```rust
#[tauri::command]
pub async fn copilot_check() -> CommandResponse<CopilotStatus> {
    let availability = copilot::check_availability();
    CommandResponse::ok(CopilotStatus { ... })
}
```

### System Prompt Design

The Copilot assistant uses a specialized system prompt to act as a Korean typing tutor:

```rust
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
</your_style>

<keyboard_layout>
The 2-Bulsik layout maps English keys to Korean jamo:
- Consonants (left hand): ㅂ(q) ㅈ(w) ㄷ(e) ㄱ(r) ㅅ(t) ...
- Vowels (right hand): ㅛ(y) ㅕ(u) ㅑ(i) ㅐ(o) ㅔ(p) ...
</keyboard_layout>

When the user asks about typing a character or word, explain which English keys to press in order."#;
```

### Logging Strategy

The integration uses a two-tier logging approach:

**INFO Level** (always shown) - Important state changes:
```
INFO hangul_typing_lib::copilot: Copilot AI assistant ready
INFO hangul_typing_lib::copilot: Copilot response: 847 chars
INFO hangul_typing_lib::copilot: Copilot service stopped
```

**DEBUG Level** (with `RUST_LOG=debug`) - Verbose internals:
```
DEBUG hangul_typing_lib::copilot: GitHub CLI auth check: logged_in=true, active=true
DEBUG hangul_typing_lib::copilot: Creating Copilot session...
DEBUG hangul_typing_lib::copilot: Event: AssistantMessageDelta
DEBUG hangul_typing_lib::copilot: Delta: +42 chars
```

To enable debug logging:
```bash
RUST_LOG=debug task run:dev
```

### UI Design

The assistant panel follows the app's design principles:

**Visual Consistency (60:30:10 rule):**
- Panel background: Warm gradient (`#fdfcfb` → `#f7f4ef` → `#f3f0eb`)
- Message bubbles: Cream (`var(--bg-cream)`) for assistant, teal for user
- Toggle button: Soft teal (`#5eb3b3`) - 10% accent

**Panel Dimensions:**
- Width: 480px
- Max height: 70vh (responsive)
- Messages area: 50vh max with scroll

**Markdown Rendering:**

Assistant responses support rich formatting:
- **Headers** (`#`, `##`, `###`)
- **Bold** (`**text**`) and *italic* (`*text*`)
- **Lists** (unordered `-` and ordered `1.`)
- **Code** (inline `` `code` `` and blocks ` ``` `)

```typescript
function parseMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks, inline code, headers, bold, italic, lists...
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  // ... etc
  return html;
}
```

### Graceful Degradation

The assistant handles missing Copilot gracefully:

**Scenario 1: Not in Tauri (web browser)**
```typescript
if (!isTauri()) {
  // Hide assistant toggle entirely
  // App works normally without AI features
}
```

**Scenario 2: Copilot CLI not installed**
```typescript
const status = await copilot.check();
if (!status.cli_installed) {
  showMessage("Install GitHub Copilot CLI to enable AI assistance");
  // Toggle button shows but panel explains how to install
}
```

**Scenario 3: Not authenticated**
```typescript
if (!status.cli_authenticated) {
  showMessage("Run 'gh auth login' to enable AI assistance");
}
```

**Scenario 4: Copilot unavailable at runtime**
```typescript
try {
  const response = await copilot.ask(question);
  displayResponse(response);
} catch (error) {
  displayError("AI assistant temporarily unavailable");
  // App continues to function without AI
}
```

### Session Management

Copilot sessions are managed efficiently:

```rust
pub struct CopilotService {
    client: Option<CopilotClient>,
    initialized: bool,
}

impl CopilotService {
    // Lazy initialization - only start when first used
    pub async fn init(&mut self) -> Result<(), CopilotError> {
        if self.initialized {
            return Ok(());
        }
        
        let status = Self::check_availability().await;
        if !status.cli_installed || !status.cli_authenticated {
            return Err(CopilotError::NotAvailable);
        }
        
        self.client = Some(CopilotClient::new(SYSTEM_PROMPT).await?);
        self.initialized = true;
        Ok(())
    }
    
    // Clean shutdown on app exit
    pub async fn shutdown(&mut self) {
        if let Some(client) = self.client.take() {
            let _ = client.close().await;
        }
        self.initialized = false;
    }
}
```

### Tauri Command Registration

All Copilot commands are registered in `lib.rs`:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        close_splash,
        // Copilot commands
        copilot_check,
        copilot_init,
        copilot_status,
        copilot_ask,
        copilot_hint,
        copilot_explain,
        copilot_analyze_mistake,
        copilot_shutdown,
    ])
```

## Use Cases

### 1. Character Explanation

**User action:** Clicks "Explain current character" when target is "한"

**Request:**
```typescript
copilot.explain("한", "Level 5: Basic Syllables");
```

**Response:**
```
The syllable 한 (han) is composed of three jamo:
- ㅎ (h) - initial consonant, typed with 'g' key
- ㅏ (a) - vowel, typed with 'k' key  
- ㄴ (n) - final consonant, typed with 's' key

Key sequence: g → k → s

This is a common syllable meaning "one" or "Korean" (as in 한국).
```

### 2. Typing Hints

**User action:** Stuck on typing "가", clicks "Give me a hint"

**Request:**
```typescript
copilot.hint("가", "Level 1, accuracy 60%");
```

**Response:**
```
To type 가 (ga):
1. Press 'r' for ㄱ (g sound)
2. Press 'k' for ㅏ (a sound)

That's it! Just two keys: r → k

Remember: On the Korean keyboard, 'r' is where 'r' is on QWERTY, 
and 'k' is in the same spot too.
```

### 3. Mistake Analysis

**User action:** Types "기" instead of "가" multiple times

**Automatic trigger:**
```typescript
copilot.analyzeMistake("가", "기", "Vowel confusion");
```

**Response:**
```
I see you typed 기 (gi) instead of 가 (ga). 

The difference is the vowel:
- ㅏ (a) - vertical line with branch on RIGHT, typed with 'k'
- ㅣ (i) - just a vertical line, typed with 'l'

Both start with ㄱ (r key), but:
- 가 = r + k
- 기 = r + l

Try focusing on which vowel you need before typing!
```

### 4. General Questions

**User action:** Types "What's the difference between ㅓ and ㅗ?"

**Response:**
```
Great question! Both are "o" sounds but different:

ㅓ (eo): 
- Sounds like "uh" in "butter"
- Typed with 'j' key
- Vertical line with branch on LEFT

ㅗ (o):
- Sounds like "o" in "go"  
- Typed with 'h' key
- Horizontal line with branch on TOP

Visual trick: ㅗ points UP (like "oh, look up!"), ㅓ points LEFT.
```

## Security Considerations

### Data Privacy

- **No data storage:** Conversations are not persisted
- **Local processing:** All Copilot communication happens locally via CLI
- **No external servers:** We don't run our own AI backend
- **User's own subscription:** Uses their existing Copilot authentication

### Content Security Policy

The existing CSP remains unchanged:
```json
"csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; ..."
```

Copilot communication happens via Tauri IPC, not HTTP requests.

### Input Sanitization

User input is passed through Tauri's serialization:
```rust
#[tauri::command]
pub async fn copilot_ask(question: String, context: String) -> Result<String, String> {
    // question and context are automatically escaped by Tauri
    let service = COPILOT_SERVICE.lock().await;
    service.ask(&question, &context).await.map_err(|e| e.to_string())
}
```

## Performance Characteristics

| Metric                  | Value                    | Notes                              |
|-------------------------|--------------------------|-------------------------------------|
| **CLI detection**       | ~50-100ms                | One-time on app start              |
| **Session init**        | ~500ms-1s                | Spawns CLI process                 |
| **Response latency**    | 1-5 seconds              | Depends on Copilot backend load    |
| **Memory overhead**     | ~20-50MB                 | Copilot CLI process                |
| **No Copilot overhead** | 0                        | Feature completely disabled        |

### Optimization: Lazy Loading

The Copilot session is **not** started until the user:
1. Opens the assistant panel, OR
2. Triggers a quick action

This means users who don't use the assistant pay no performance cost.

## Limitations and Trade-offs

### Pros
- High-quality contextual assistance
- Free for existing Copilot subscribers
- No API keys to manage
- Graceful degradation when unavailable
- Privacy-respecting (local CLI)

### Cons
- **Desktop only:** Cannot work in web browser
- **Requires Copilot subscription:** Not available to all users
- **CLI dependency:** User must install Copilot CLI
- **Latency:** 1-5 second response times
- **No offline support:** Requires internet connection

### Why Desktop-Only is Acceptable

1. **Primary distribution is Tauri app** - Most users will use desktop version
2. **Web version still fully functional** - Core typing practice works without AI
3. **Clear value proposition** - Desktop = premium experience with AI

### Why Not Include Fallback LLM?

We considered bundling a small local LLM for offline/non-subscriber use, but:
- Adds 500MB+ to bundle size
- Slower responses on CPU
- Lower quality than Copilot
- Complexity of maintaining two AI backends

Decision: Ship with Copilot-only, consider local LLM in future version.

## Future Enhancements

### Planned

1. **Streaming responses:** Show text as it generates instead of waiting
   - Better perceived performance
   - Requires WebSocket-like pattern in Tauri

2. **Conversation history:** Remember context within a session
   - "Can you explain that again?"
   - "What about the next syllable?"

3. **Auto-suggestions:** Proactive hints after repeated mistakes
   - Detect frustration patterns (many retries)
   - Offer help without being asked

4. **Voice pronunciation:** Integrate TTS for audio feedback
   - "Click to hear how 한 sounds"
   - Uses system TTS API

### Not Planned

- **Offline AI:** Local LLM adds too much complexity
- **Multi-model support:** Copilot is sufficient for our use case
- **Conversation persistence:** Sessions are ephemeral by design

## File Structure

```
src-tauri/src/
+-- copilot.rs           # CopilotService, CLI detection, session management
+-- commands.rs          # Tauri command handlers for all Copilot operations
+-- lib.rs               # Command registration

www/src/
+-- copilot-client.ts    # TypeScript client wrapping Tauri invoke calls
+-- assistant-ui.ts      # UI panel, quick actions, message display
+-- app.ts               # Integration with game state (context updates)

www/
+-- index.html           # Assistant panel HTML structure
+-- style.css            # Assistant panel styles (60:30:10 compliant)
```

**Total Copilot-specific code:** ~800 lines
- Rust: ~300 lines (copilot.rs + commands.rs)
- TypeScript: ~300 lines (copilot-client.ts + assistant-ui.ts)
- HTML/CSS: ~200 lines

## Relationship to Other Components

### Tauri Desktop App

Copilot integration **extends** the Tauri architecture:
- Uses same IPC pattern (invoke/commands)
- Follows same async patterns
- Respects same security constraints

See [0005: Tauri Desktop App](./0005_tauri_desktop_app.md) for Tauri architecture.

### Visual Design System

Assistant UI **follows** the design system:
- 60:30:10 color distribution
- Line-only icons for buttons
- Consistent typography and spacing

See [0003: Visual Design System](./0003_visual_design_system.md) for design principles.

### Level Progression

Assistant **enhances** the learning experience:
- Receives current level context
- Explains level-appropriate content
- Adapts hints to user's progress

See [0001: Level Progression Design](./0001_level_progression_design.md) for level system.

## Testing Strategy

### Unit Tests (Rust)
- CLI detection with mocked commands
- Error handling for unavailable Copilot
- Service state transitions

### Integration Tests
- Tauri command invocation
- Frontend-backend communication
- Context serialization

### Manual Testing Checklist
- [ ] Toggle button hidden when Copilot unavailable
- [ ] Panel opens/closes smoothly
- [ ] Quick actions return relevant responses
- [ ] Typing in chat sends messages
- [ ] Error states display gracefully
- [ ] Context updates when level changes

## Summary

The GitHub Copilot integration adds **intelligent tutoring** to hangul-typing while maintaining the app's core principles:

- **Progressive difficulty:** AI adapts explanations to user's level
- **Immediate feedback:** Quick actions provide instant help
- **Encouraging tone:** System prompt ensures supportive responses
- **Professional presentation:** UI follows 60:30:10 design system

The integration is **entirely optional** - users without Copilot CLI experience the full typing practice without any degradation. For users with Copilot, they get a personalized Korean typing tutor that understands their context and mistakes.

**Trade-off:** We accept desktop-only AI features in exchange for high-quality, free (for subscribers) assistance without managing our own AI infrastructure.

## References

- [GitHub Copilot SDK](https://github.com/github/copilot-sdk) - Official JavaScript SDK
- [copilot-sdk-rust](https://github.com/copilot-community-sdk/copilot-sdk-rust) - Community Rust SDK
- [Tauri Commands](https://tauri.app/v1/guides/features/command/) - Tauri IPC documentation
- [Korean Keyboard Layout](https://en.wikipedia.org/wiki/Keyboard_layout#Dubeolsik) - Dubeolsik standard
