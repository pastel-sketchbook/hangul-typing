# Hangul Typing

Learn Korean typing by playing. Break levels. Master Hangul.

## About

A gamified typing trainer designed for non-Korean speakers. Progress through levels, build muscle memory, and unlock new challenges as you learn to type Hangul naturally.

## Features

- **Level-based progression** - Start from basic jamo and advance to full sentences
- **Game mechanics** - Score points, break levels, track your improvement
- **Instant feedback** - Real-time Hangul composition as you type

## Screenshots

| Level Selection                                  | Typing                               |
|--------------------------------------------------|--------------------------------------|
| ![Level Selection](screenshots/level-select.png) | ![Typing](screenshots/typing.png)    |

## Design Principles

- **Professional presentation** - Clean, polished interface
- **60:30:10 color rule** - Visual harmony through balanced color distribution
  - 60% warm cream backgrounds (`#faf8f5`)
  - 30% white cards and neutral text (`#ffffff`, `#1a1a1a`)
  - 10% soft teal accent for CTAs and highlights (`#5eb3b3`)
- **Line-only icons** - Minimal, consistent iconography

## Tech Stack

| Layer    | Technology         |
|----------|--------------------|
| Core     | Zig                |
| Runtime  | WebAssembly        |
| Desktop  | Tauri (macOS)      |
| Frontend | HTML / CSS / JS    |

Powered by [hangul.wasm](https://github.com/pastel-sketchbook/hangul-wasm) for Hangul decomposition, composition, and IME.

## Getting Started

### Prerequisites

- [Zig](https://ziglang.org/) (0.13+)
- [Bun](https://bun.sh/) (for TypeScript build)
- [Task](https://taskfile.dev/) (task runner)
- [Rust](https://rustup.rs/) (for Tauri desktop app)

### Development

```bash
# Build WASM and TypeScript
task default

# Run desktop app (development mode)
task run:dev

# Run as web app
task run:web
```

### Building

```bash
# Build Tauri desktop app for macOS
task build:tauri

# Output: target/release/bundle/macos/Hangul Typing.app
```

### Release

```bash
task release:patch  # Bug fixes (0.3.0 → 0.3.1)
task release:minor  # New features (0.3.0 → 0.4.0)
task release:major  # Breaking changes (0.3.0 → 1.0.0)
```

## License

GPL-2.0-or-later