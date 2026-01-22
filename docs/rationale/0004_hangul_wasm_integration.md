# 0004: hangul-wasm Integration

This document explains how **hangul-typing** integrates the [hangul-wasm](https://github.com/pastel-sketchbook/hangul-wasm) library to provide authentic Korean IME (Input Method Editor) functionality.

## Overview

hangul-typing uses hangul-wasm v0.7.0 as its core Korean text processing engine. The integration follows a **hybrid WASM + JavaScript architecture** where:

- **WASM (hangul.wasm)**: Handles all Korean text algorithms - composition, decomposition, and IME state management
- **JavaScript (hangul-ime.js)**: Provides browser integration - keyboard events, DOM manipulation, and layout mapping

## Why hangul-wasm?

### Problem: Korean Input is Complex

Korean (Hangul) has a unique writing system where:

1. **Syllable blocks** are composed of 2-3 jamo (자모) components:
   - Initial consonant (초성): 19 possible values
   - Medial vowel (중성): 21 possible values  
   - Final consonant (종성): 28 possible values (including none)

2. **Real-time composition** requires tracking partial syllables as the user types

3. **Syllable splitting** occurs when adding a vowel after a complete syllable (e.g., 한 + ㅏ → 하 + ㄴㅏ)

4. **Backspace decomposition** must undo composition step-by-step (한 → 하 → ㅎ → empty)

### Solution: WASM-based IME

hangul-wasm provides:

- **O(1) composition/decomposition** using mathematical formulas
- **Full Unicode support** for all 11,172 valid Hangul syllables (U+AC00 to U+D7A3)
- **Stateful IME engine** that tracks composition state
- **~7KB binary size** (ReleaseSmall optimization)
- **1.5-2x faster** than pure JavaScript for single operations (IME use case)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Environment                      │
├─────────────────────────────────────────────────────────────────┤
│  User presses 'g' on keyboard                                   │
│         ↓                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              JavaScript Layer (hangul-ime.js)               ││
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ Keyboard Event  │→ │ 2-Bulsik Layout Mapping          │ ││
│  │  │ Handler         │  │ 'g' → jamo index 30 (ㅎ)         │ ││
│  │  └─────────────────┘  └──────────────────────────────────┘ ││
│  │         ↓                                                   ││
│  └─────────│───────────────────────────────────────────────────┘│
│            ↓                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                WASM Layer (hangul.wasm)                     ││
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ IME State       │→ │ Composition Engine               │ ││
│  │  │ Machine         │  │ compose(ㅎ, ㅏ, ㄴ) → 한 (0xD55C) │ ││
│  │  └─────────────────┘  └──────────────────────────────────┘ ││
│  │         ↓                                                   ││
│  │  Returns: {action: REPLACE, codepoint: 0xD55C}              ││
│  └─────────│───────────────────────────────────────────────────┘│
│            ↓                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              JavaScript Layer (app.js)                      ││
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐ ││
│  │  │ DOM Updater     │→ │ Input Display                    │ ││
│  │  │                 │  │ Shows: 한                        │ ││
│  │  └─────────────────┘  └──────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. WASM Module Loading (`app.js:169-182`)

```javascript
async function init() {
    try {
        const response = await fetch('hangul.wasm');
        const bytes = await response.arrayBuffer();
        wasmModule = await WebAssembly.instantiate(bytes);
        
        // Create IME instance
        ime = new HangulIme(wasmModule, { debug: false });
        ime.enable();
        
        console.log('hangul-wasm IME loaded successfully');
    } catch (err) {
        console.error('Failed to load hangul-wasm:', err);
        // Game will still work but without proper IME composition
    }
}
```

The WASM module is loaded asynchronously at application startup. If loading fails, the game continues but without proper Korean composition (fallback behavior).

### 2. HangulIme Class (`hangul-ime.js`)

The `HangulIme` class wraps the WASM module and provides a high-level API:

```javascript
class HangulIme {
    constructor(wasmModule, options = {}) {
        this.wasm = wasmModule.instance.exports;
        this.memory = wasmModule.instance.exports.memory;
        this.handle = this.wasm.wasm_ime_create();  // Create IME instance
        this.resultBuffer = this.wasm.wasm_alloc(16);  // Allocate result buffer
    }
}
```

Key methods:
- `handleKeyPress(event, field)` - Process keyboard input
- `handleBackspace(field)` - Handle backspace with decomposition
- `reset()` - Clear composition state
- `commit()` - Finalize current composition

### 3. Keyboard Layout Mapping (`hangul-ime.js:12-69`)

The 2-Bulsik (두벌식) layout maps QWERTY keys to jamo indices:

```javascript
const LAYOUT_2BULSIK = {
    // Lowercase (unshifted)
    r: 1,   // ㄱ
    s: 4,   // ㄴ
    e: 7,   // ㄷ
    f: 9,   // ㄹ
    a: 17,  // ㅁ
    q: 18,  // ㅂ
    // ... etc
    
    // Uppercase (shifted) - Double consonants
    R: 2,   // ㄲ
    E: 8,   // ㄸ
    Q: 19,  // ㅃ
    T: 22,  // ㅆ
    W: 25,  // ㅉ
};
```

### 4. WASM Function Calls

#### Processing Keystrokes (`hangul-ime.js:226-259`)

```javascript
handleKeyPress2Bulsik(char, field) {
    const jamoIndex = LAYOUT_2BULSIK[char];
    if (jamoIndex === undefined) return false;

    // Call WASM to process the keystroke
    const handled = this.wasm.wasm_ime_processKey(
        this.handle,      // IME instance handle
        jamoIndex,        // Jamo index (0-67)
        this.resultBuffer // Output buffer pointer
    );

    if (!handled) return false;

    // Read result from WASM memory
    const view = new Uint32Array(this.memory.buffer, this.resultBuffer, 3);
    const action = view[0];         // ACTION_REPLACE or ACTION_EMIT_AND_NEW
    const prevCodepoint = view[1];  // Previously composed syllable
    const currentCodepoint = view[2]; // Current composed syllable
    
    // Update DOM based on action...
}
```

#### Backspace Handling (`hangul-ime.js:388-445`)

```javascript
handleBackspace(field) {
    if (!this.hasComposition) return false;

    // WASM decomposes the current syllable
    const newCodepoint = this.wasm.wasm_ime_backspace(this.handle);
    
    if (newCodepoint !== 0) {
        // Replace current char with decomposed version
        // 한 → 하
        this.replaceComposition(field, newCodepoint);
        return true;
    }
    
    // Composition is now empty, delete the character
    // ㅎ → (empty)
    this.deleteComposition(field);
    return true;
}
```

### 5. Game Integration (`app.js:276-331`)

The game uses a "fake field" pattern to work with the IME without a real input element:

```javascript
function processKeyWithIme(char) {
    // Create a fake input field for IME
    const fakeField = {
        value: session.inputBuffer,
        selectionStart: session.inputBuffer.length,
        selectionEnd: session.inputBuffer.length,
    };

    // Process through IME
    const handled = ime.handleKeyPress({ key: char }, fakeField);
    
    if (handled) {
        session.inputBuffer = fakeField.value;
        updateInputDisplay();
    }
}
```

This allows the game to display Korean input in a styled `<div>` rather than an `<input>` element.

## WASM Exports Used

| Export                                        | Purpose                                  |
|-----------------------------------------------|------------------------------------------|
| `wasm_ime_create()`                           | Create new IME instance, returns handle  |
| `wasm_ime_destroy(handle)`                    | Destroy IME instance                     |
| `wasm_ime_reset(handle)`                      | Reset composition state                  |
| `wasm_ime_processKey(handle, jamo, resultPtr)`| Process 2-Bulsik keystroke               |
| `wasm_ime_backspace(handle)`                  | Handle backspace, returns new codepoint  |
| `wasm_ime_commit(handle)`                     | Commit composition, returns final codepoint |
| `wasm_alloc(size)`                            | Allocate WASM memory                     |
| `wasm_free(ptr, size)`                        | Free WASM memory                         |

## Memory Management

The IME uses a simple allocation pattern:

1. **At construction**: Allocate a 16-byte result buffer (`wasm_alloc(16)`)
2. **Per keystroke**: WASM writes action + codepoints to the buffer
3. **At destruction**: Free the buffer (`wasm_free(ptr, 16)`)

The WASM module uses a 16KB bump allocator that auto-resets when all allocations are freed.

## Action Types

WASM returns one of these actions after processing a keystroke:

| Action             | Value | Meaning                                        |
|--------------------|-------|------------------------------------------------|
| `ACTION_NO_CHANGE` | 0     | No visible change                              |
| `ACTION_REPLACE`   | 1     | Replace current composition character          |
| `ACTION_EMIT_AND_NEW` | 2  | Emit completed syllable, start new composition |
| `ACTION_LITERAL`   | 3     | Insert literal character (3-Bulsik only)       |

### Example: Typing "한글"

```
Keystroke: 'g' (ㅎ)
  → ACTION_REPLACE, current=ㅎ
  → Display: ㅎ

Keystroke: 'k' (ㅏ)
  → ACTION_REPLACE, current=하
  → Display: 하

Keystroke: 's' (ㄴ)
  → ACTION_REPLACE, current=한
  → Display: 한

Keystroke: 'r' (ㄱ)
  → ACTION_EMIT_AND_NEW, prev=한, current=ㄱ
  → Display: 한ㄱ

Keystroke: 'm' (ㅡ)
  → ACTION_REPLACE, current=그
  → Display: 한그

Keystroke: 'f' (ㄹ)
  → ACTION_REPLACE, current=글
  → Display: 한글
```

## Fallback Behavior

If WASM fails to load, the game continues with degraded functionality:

```javascript
if (ime) {
    processKeyWithIme(e.key);
} else {
    // Fallback: just add the character directly
    session.inputBuffer += e.key;
    updateInputDisplay();
}
```

In fallback mode:
- Keys are added directly without composition
- Korean characters won't compose into syllables
- The game becomes significantly harder for syllable levels

## File Dependencies

```
www/
├── hangul.wasm          # WASM binary (~7KB)
├── hangul-ime.js        # IME wrapper class (648 lines)
└── app.js               # Game logic, imports HangulIme
```

## Version Compatibility

- **hangul-wasm**: v0.7.0
- **hangul-ime.js**: Copied from hangul-wasm repository
- **API stability**: The WASM exports are stable; changes follow semver

## Performance Characteristics

| Operation   | Time    | Notes                 |
|-------------|---------|---------------------- |
| WASM load   | ~10ms   | Async, non-blocking   |
| IME create  | <1ms    | Single allocation     |
| Keystroke   | <0.1ms  | O(1) operations       |
| Memory      | 16KB    | Static bump allocator |

## Future Considerations

1. **3-Bulsik support**: hangul-wasm supports 3-Bulsik via `wasm_ime_processKey3()`, not yet exposed in hangul-typing

2. **Syllable decomposition display**: Could use `wasm_decompose()` to show jamo breakdown for educational purposes

3. **Input validation**: Could use `wasm_isHangulSyllable()` to validate target characters

## References

- [hangul-wasm Repository](https://github.com/pastel-sketchbook/hangul-wasm)
- [hangul-wasm README](../hangul-wasm-codebase.md) - Full API documentation
- [0002: Keyboard Layout Support](./0002_keyboard_layout_support.md) - 2-Bulsik layout details
- [Unicode Hangul Syllables](https://www.unicode.org/charts/PDF/UAC00.pdf) - U+AC00 to U+D7A3
