# 0005: Tauri Desktop App

This document explains how **hangul-typing** uses [Tauri](https://tauri.app/) to provide a native macOS desktop application experience, and why Tauri was selected over alternative approaches.

## Overview

hangul-typing ships as both a **web application** and a **native macOS application**. The desktop version uses Tauri v2.9.5, which wraps the existing web frontend in a native macOS window using the system's WebKit rendering engine.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    macOS Application Bundle                      │
│                      Hangul Typing.app                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │              Tauri Rust Backend (src-tauri/)              │   │
│  │  ┌──────────────────┐  ┌─────────────────────────────┐    │   │
│  │  │  lib.rs (30 LOC) │→ │  close_splash command       │    │   │
│  │  │  - Logging       │  │  - Window management        │    │   │
│  │  │  - Window setup  │  │  - Splash → Main transition │    │   │
│  │  └──────────────────┘  └─────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│                             ↕                                    │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │           WebKit WebView (macOS System WebView)           │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │        Frontend (www/ - served from bundle)        │   │   │
│  │  │  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │   │   │
│  │  │  │ HTML/CSS  │→ │ app.ts   │→ │ hangul.wasm     │  │   │   │
│  │  │  │ UI layers │  │ Game     │  │ Hangul IME      │  │   │   │
│  │  │  └───────────┘  └──────────┘  └─────────────────┘  │   │   │
│  │  │                                                    │   │   │
│  │  │  ┌─────────────────────────────────────────────┐   │   │   │
│  │  │  │  tauri.ts - Bridge Layer                    │   │   │   │
│  │  │  │  - isTauri() detection                      │   │   │   │
│  │  │  │  - tauriInvoke() wrapper                    │   │   │   │
│  │  │  │  - closeSplashAfterDelay()                  │   │   │   │
│  │  │  └─────────────────────────────────────────────┘   │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Why Tauri?

### Decision Context

When we decided to ship a native desktop version, we evaluated these approaches:

| Approach                | Pros                              | Cons                                    |
|-------------------------|-----------------------------------|-----------------------------------------|
| **Pure Web App**        | No extra work, universal access   | Feels less professional, no dock icon   |
| **Electron**            | Mature ecosystem, easy packaging  | ~170MB bundle, bundles Chromium         |
| **Native Swift/AppKit** | Best macOS integration, smallest  | Complete rewrite, complex WASM bridge   |
| **Tauri**               | Native feel, small bundle, reuse  | Newer ecosystem, Rust learning curve    |

**We chose Tauri** because it offered the best balance of:
1. **Code reuse**: Zero changes to core frontend required
2. **Native experience**: System WebView, proper macOS app bundle
3. **Bundle size**: ~3-5MB vs Electron's ~170MB
4. **Professional presentation**: Dock icon, proper window chrome, DMG distribution
5. **Minimal backend code**: Only 30 lines of Rust for our use case

### Why Not Electron?

Electron was the most mature option, but:
- **Bundle bloat**: Electron bundles an entire Chromium engine (~120MB) + Node.js (~50MB)
- **Memory usage**: Higher baseline memory (~100MB idle) vs Tauri (~30MB idle)
- **Overkill**: We don't need Node.js backend or Chromium-specific features
- **Startup time**: Slower cold start due to Chromium initialization

### Why Not Native Swift/AppKit?

A pure native app would be ideal for size and integration, but:
- **Complete rewrite**: ~2000 lines of TypeScript + game logic
- **WASM bridge complexity**: Swift → WASM interop is non-trivial
- **Duplication**: Would need to maintain web version separately
- **Time investment**: Weeks of work vs hours with Tauri

### Why Tauri Won

Tauri gave us:
- **90% native feel** with 5% of the effort
- **Instant compatibility** with existing WASM + TypeScript codebase
- **Small learning curve**: Only needed to learn basic Rust for 30 lines
- **Future flexibility**: Could add native features (filesystem, notifications) if needed

## Implementation Details

### Two-Window Splash Pattern

The app uses a **splash screen → main window** pattern for professional startup:

**Splash Window** (`tauri.conf.json:14-27`):
```json
{
  "label": "splash",
  "url": "splash.html",
  "width": 400,
  "height": 420,
  "resizable": false,
  "decorations": false,  // No title bar
  "transparent": true,    // Gradient background
  "alwaysOnTop": true,
  "center": true
}
```

**Main Window** (`tauri.conf.json:28-40`):
```json
{
  "label": "main",
  "url": "index.html",
  "width": 1024,
  "height": 800,
  "minWidth": 800,
  "minHeight": 600,
  "resizable": true,
  "visible": false  // Hidden until splash completes
}
```

### Splash Transition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. App launches                                                 │
│    → Tauri shows splash window immediately                      │
│    → Main window created but hidden                             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Splash screen loads (www/splash.html)                        │
│    → Shows app icon, name, loading animation                    │
│    → Displays "Powered by hangul.wasm" attribution              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Main window loads in background (www/index.html)             │
│    → Loads app.ts, hangul.wasm, game state                      │
│    → Calls closeSplashAfterDelay() (tauri.ts:32-48)             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. After minimum 3 seconds (ensures splash visibility)          │
│    → Frontend invokes 'close_splash' command                    │
│    → tauriInvoke('close_splash') (tauri.ts:20-27)               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Rust backend handles command (lib.rs:5-14)                   │
│    → Closes splash window                                       │
│    → Shows main window                                          │
│    → Sets focus to main window                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why 3 seconds minimum?** (`www/src/tauri.ts:32-48`)
- Prevents jarring flash if app loads instantly
- Gives users time to see branding and loading state
- Ensures smooth perceived performance

### Tauri Commands

Tauri commands are the **only** way for frontend JavaScript to call backend Rust:

**Backend Definition** (`src-tauri/src/lib.rs:5-14`):
```rust
#[tauri::command]
fn close_splash(window: tauri::Window) {
    if let Some(splash) = window.get_webview_window("splash") {
        let _ = splash.close();
    }
    if let Some(main) = window.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}
```

**Frontend Invocation** (`www/src/tauri.ts:20-27`):
```typescript
export async function tauriInvoke(command: string): Promise<void> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as TauriInternals | undefined;

  if (internals?.invoke) {
    await internals.invoke(command);
  }
}
```

**Registration** (`src-tauri/src/lib.rs:25-26`):
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![close_splash])
```

### Environment Detection

The frontend needs to know if it's running in Tauri vs browser:

**Detection** (`www/src/tauri.ts:13-15`):
```typescript
export function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window;
}
```

**Usage** (`www/src/tauri.ts:36`):
```typescript
export function closeSplashAfterDelay(splashStart: number, minTime: number): void {
  if (!isTauri()) return;  // Graceful no-op in browser
  
  const elapsed = Date.now() - splashStart;
  const remaining = Math.max(0, minTime - elapsed);
  
  setTimeout(async () => {
    try {
      await tauriInvoke('close_splash');
    } catch (_e) {
      console.log('Not running in Tauri or splash already closed');
    }
  }, remaining);
}
```

This allows the **same codebase** to run in both browser and desktop with zero configuration.

### Build Integration

Tauri hooks into the existing Taskfile-based build:

**Development Mode** (`task run:dev`):
```yaml
run:dev:
  desc: "Run Tauri app in development mode"
  deps: [build:wasm, build:ts]
  cmds:
    - cargo tauri dev
```

This runs:
1. `task build:wasm` - Compiles Zig → WASM
2. `task build:ts` - Compiles TypeScript → JavaScript
3. `cargo tauri dev` - Starts:
   - `task dev:server` (localhost:8230) via `beforeDevCommand`
   - Tauri dev window pointing to dev server
   - Rust hot reload on file changes

**Production Build** (`task build:tauri`):
```yaml
build:tauri:
  desc: "Build Tauri desktop app for macOS (release)"
  cmds:
    - cargo tauri build --target universal-apple-darwin
```

This runs:
1. `task default` (builds WASM + TS) via `beforeBuildCommand`
2. Compiles Rust with release optimizations
3. Bundles `www/` directory into .app
4. Creates universal binary (Intel + Apple Silicon)
5. Generates DMG installer
6. Outputs to `src-tauri/target/release/bundle/`

### Version Synchronization

The app version appears in three places and must stay in sync:

1. **VERSION file** (source of truth): `0.3.9`
2. **tauri.conf.json** (`"version": "0.3.9"`)
3. **Cargo.toml** (`version = "0.3.9"`)

**Automated by** `Taskfile.yml:_bump-version`:
```yaml
_bump-version:
  internal: true
  cmds:
    - echo "{{.NEW_VERSION}}" > VERSION
    - jq '.version = "{{.NEW_VERSION}}"' src-tauri/tauri.conf.json > tmp.json && mv tmp.json src-tauri/tauri.conf.json
    - sed -i '' 's/^version = ".*"/version = "{{.NEW_VERSION}}"/' src-tauri/Cargo.toml
```

Invoked by `task release:patch|minor|major`.

### Security Configuration

**Content Security Policy** (`tauri.conf.json:42-44`):
```json
"security": {
  "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'"
}
```

This prevents:
- Loading external scripts/styles (XSS protection)
- Inline scripts (except styles for performance)
- External font loading

**Exception**: `'unsafe-inline'` for styles is needed because the game uses dynamic styling for keyboard visualization and level progress indicators.

**Capabilities** (`src-tauri/capabilities/default.json`):
```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

Tauri v2 uses a **capability-based permission system**. By default, windows have minimal permissions. We only grant `core:default` (window management, app lifecycle).

### macOS Integration

**Bundle Configuration** (`tauri.conf.json:47-62`):
```json
"bundle": {
  "active": true,
  "targets": ["dmg", "app"],
  "category": "Education",
  "shortDescription": "Learn Korean typing by playing",
  "copyright": "© 2025 Pastel Sketchbook",
  "macOS": {
    "minimumSystemVersion": "11.0"  // macOS Big Sur
  }
}
```

**Why Big Sur minimum?**
- Tauri v2 requires WebKit features from macOS 11.0+
- Covers ~95% of active macOS users (as of 2025)
- Allows use of modern CSS features (grid, flexbox, CSS variables)

**App Icon** (`src-tauri/icons/icon.icns`):
- Custom design: '한' character in line-art style
- Matches 60:30:10 color palette (warm cream background, soft teal accent)
- Generated from high-res PNG using `iconutil` (macOS standard)

## Memory Management

### WASM in Tauri WebView

The existing `hangul.wasm` module loads identically in Tauri's WebKit view:

```javascript
// Works in both browser and Tauri (www/app.ts:169-182)
const response = await fetch('hangul.wasm');
const bytes = await response.arrayBuffer();
wasmModule = await WebAssembly.instantiate(bytes);
```

**In browser**: Fetches from HTTP server (Zig server or dev server)  
**In Tauri**: Fetches from bundled assets (`www/hangul.wasm` in .app bundle)

No code changes needed. Tauri intercepts `fetch()` and serves from local bundle.

### localStorage Persistence

Game state is saved to `localStorage`:

```javascript
// Same code in browser and Tauri
localStorage.setItem('hangul-typing-progress', JSON.stringify(progress));
```

**In browser**: Persisted in browser profile (domain-scoped)  
**In Tauri**: Persisted in `~/Library/WebKit/com.pastelsketchbook.hangul-typing/`

Data survives app restarts and updates. Each Tauri app has isolated storage.

## Logging and Debugging

**Rust Backend Logging** (`src-tauri/src/lib.rs:17-21`):
```rust
tracing_subscriber::registry()
    .with(fmt::layer())
    .with(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
    .init();

info!("Starting Hangul Typing");
```

**View logs**:
- **Dev mode**: Logs appear in terminal running `cargo tauri dev`
- **Production**: Logs go to `~/Library/Logs/com.pastelsketchbook.hangul-typing/`

**Frontend Debugging**:
- **Dev mode**: Open DevTools with `Cmd+Option+I` (WebKit Inspector)
- **Production**: DevTools disabled by default (enable with `tauri.conf.json` setting)

## Distribution

### DMG Creation

`cargo tauri build` automatically creates a DMG installer:

**Output**: `src-tauri/target/release/bundle/dmg/Hangul Typing_0.3.9_universal.dmg`

**Contents**:
- `Hangul Typing.app` (universal binary)
- Background image with drag-to-Applications instructions
- Symlink to `/Applications` folder

**Size**: ~3-5MB (vs ~170MB for Electron equivalent)

### Code Signing (Future)

Currently **not implemented**, but planned for macOS distribution:

```yaml
# Future Taskfile task
sign:
  desc: "Code sign the macOS app"
  cmds:
    - codesign --force --deep --sign "Developer ID Application: Your Name" 
        "src-tauri/target/release/bundle/macos/Hangul Typing.app"
```

Required for:
- Gatekeeper approval (avoiding "unidentified developer" warning)
- macOS App Store distribution
- Notarization (macOS 10.15+)

## Performance Characteristics

| Metric              | Browser (Web) | Tauri (Desktop) | Notes                          |
|---------------------|---------------|-----------------|--------------------------------|
| **Bundle size**     | ~10KB HTML/CSS/JS<br>~7KB WASM | ~3-5MB .app | Includes Rust runtime + WebKit bridge |
| **Memory (idle)**   | ~40MB         | ~30MB           | System WebView vs browser overhead |
| **Startup time**    | <100ms        | ~200ms          | Splash pattern masks 99% of delay |
| **WASM load**       | ~10ms         | ~10ms           | Identical (same WebAssembly.instantiate) |
| **Rendering**       | WebKit/Blink  | WebKit (native) | Slightly faster on macOS due to system integration |

## Limitations and Trade-offs

### Pros
- Professional native app experience
- Small bundle size (3-5MB vs Electron's 170MB)
- 100% code reuse from web version
- System WebView (always up-to-date)
- Minimal Rust code (30 lines)
- Fast development cycle (cargo tauri dev)

### Cons
- macOS-only (no Windows/Linux yet)
- Rust toolchain required for builds
- Smaller ecosystem than Electron
- WebKit-only (no Chromium fallback)
- No code signing yet (Gatekeeper warnings)

### Why macOS-Only?

We prioritized macOS because:
1. **Target audience**: Language learners often use Macs
2. **Development environment**: We develop on macOS
3. **Testing scope**: Single platform = faster iteration
4. **WebKit quality**: macOS WebKit is excellent for WASM + modern CSS

**Future**: Could add Windows/Linux targets with minimal changes to `tauri.conf.json`.

## Future Enhancements

### Planned (TODO.md:94-97)

1. **Font optimization**: Use system Korean fonts instead of bundling
   - macOS ships with Apple SD Gothic Neo (high-quality Korean font)
   - Could reduce bundle by ~1-2MB

2. **Auto-update**: Tauri supports built-in updater
   - Check for updates on launch
   - Download and install in background
   - Requires code signing + update server

3. **Native menus**: Add macOS menu bar
   - File → About, Preferences, Quit
   - Edit → Reset Progress
   - View → Toggle Fullscreen

4. **Notification support**: Achievement unlocked notifications
   - Use macOS notification center
   - Requires additional Tauri permission

### Not Planned

- **Cross-platform**: Windows/Linux support adds complexity without clear user demand
- **Native UI**: HTML/CSS serves us well; rewriting in Swift is overkill
- **Background services**: This is a single-window game, not a system utility

## File Structure

```
src-tauri/
├── Cargo.toml              # Rust package manifest
├── Cargo.lock              # Dependency lock file
├── tauri.conf.json         # Main Tauri configuration
├── build.rs                # Build script (invokes tauri_build)
├── capabilities/
│   └── default.json        # Permission grants
├── icons/                  # Platform-specific icons
│   ├── icon.icns           # macOS app icon
│   ├── icon.png            # Cross-platform fallback
│   └── [various PNGs]      # Windows/Linux sizes
├── src/
│   ├── main.rs             # Entry point (calls lib::run)
│   └── lib.rs              # Core Tauri logic (30 LOC)
└── target/                 # Build output (gitignored)
    └── release/bundle/
        ├── macos/Hangul Typing.app
        └── dmg/Hangul Typing_X.Y.Z_universal.dmg

www/src/
└── tauri.ts                # Frontend Tauri bridge (49 LOC)
```

**Total Tauri-specific code**: ~80 lines (30 Rust + 49 TypeScript + 1 config file)

## Alternative Considered: Capacitor

[Capacitor](https://capacitorjs.com/) is similar to Tauri (web-to-native wrapper), but:

| Feature           | Tauri                  | Capacitor              |
|-------------------|------------------------|------------------------|
| **Backend**       | Rust                   | Node.js                |
| **Bundle size**   | ~3-5MB                 | ~50-80MB               |
| **Primary target**| Desktop                | Mobile (iOS/Android)   |
| **macOS support** | Excellent              | Limited                |

We chose Tauri because Capacitor is optimized for mobile, and we wanted a **desktop-first** experience.

## Relationship to Other Components

### hangul.wasm Integration

Tauri has **zero impact** on WASM usage:
- WASM loads identically in Tauri's WebView
- Same `hangul-ime.js` wrapper
- Same performance characteristics

See [0004: hangul-wasm Integration](./0004_hangul_wasm_integration.md) for details.

### Visual Design System

Tauri respects the existing design:
- 60:30:10 color rule works perfectly in WebKit
- Line-only icons render crisply
- Gradient backgrounds use CSS (no native drawing)

See [0003: Visual Design System](./0003_visual_design_system.md) for design principles.

### Level Progression

Game mechanics are **unchanged**:
- Same level data
- Same scoring algorithm
- Same localStorage persistence (just different storage location)

See [0001: Level Progression Design](./0001_level_progression_design.md) for game design.

## Summary

Tauri gives us **90% of a native app's benefits with 5% of the effort**. By reusing our existing web frontend and adding 80 lines of bridge code, we ship a professional macOS application with:

- Small bundle size (~3-5MB)
- Native performance (system WebView)
- Splash screen polish
- DMG distribution
- Zero changes to core game logic

This allows us to reach **desktop users who prefer native apps** while maintaining a single codebase shared with the web version.

**Trade-off**: We accept the Rust learning curve and smaller ecosystem in exchange for bundle size savings and code reuse. For our use case (single-window game with no complex native integrations), Tauri is the optimal choice.

## References

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Tauri v2 Migration Guide](https://tauri.app/v2/guides/migrate/)
- [WebKit Feature Status](https://webkit.org/status/) - macOS WebView capabilities
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/macos) - macOS app design
