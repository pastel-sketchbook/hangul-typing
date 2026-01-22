# Hangul Typing

Learn Korean typing by playing. Break levels. Master Hangul.

## About

A gamified typing trainer designed for non-Korean speakers. Progress through levels, build muscle memory, and unlock new challenges as you learn to type Hangul naturally.

## Features

- **Level-based progression** - Start from basic jamo and advance to full sentences
- **Game mechanics** - Score points, break levels, track your improvement
- **Instant feedback** - Real-time Hangul composition as you type

## Design Principles

- **Professional presentation** - Clean, polished interface
- **Pastel color palette** - Soft, focused visual tone
- **Line-only icons** - Minimal, consistent iconography

## Tech Stack

| Layer | Technology |
|-------|------------|
| Core | Zig |
| Runtime | WebAssembly |
| Server | Zig HTTP (static) |
| Frontend | HTML / CSS / JS |

Built on [hangul-wasm](https://github.com/pastel-sketchbook/hangul-wasm) for Hangul decomposition, composition, and IME.

## License

GPL-2.0-or-later
