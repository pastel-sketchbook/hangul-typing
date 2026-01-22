/**
 * Unified Hangul IME Loader
 * 
 * Tries to load the WASM-based IME first (hangul.wasm + HangulIme wrapper),
 * falls back to pure TypeScript implementation if WASM is unavailable.
 * 
 * This provides resilient Korean typing support across all browsers and environments.
 */

import { HangulImeFallback, type IHangulIme } from './hangul-ime-fallback';

// Re-export the interface for consumers
export type { IHangulIme } from './hangul-ime-fallback';

// IME configuration options
export interface ImeOptions {
  debug?: boolean;
  layout?: '2bulsik' | '3bulsik';
  wasmPath?: string;
}

// Extended interface for WASM-based IME
interface IHangulImeWasm extends IHangulIme {
  setLayoutMode?(mode: '2bulsik' | '3bulsik'): void;
  getLayoutMode?(): '2bulsik' | '3bulsik';
  setDebug?(enabled: boolean): void;
  commit?(field?: { value: string; selectionStart: number; selectionEnd: number }): string | null;
  destroy?(): void;
}

/**
 * WASM-based IME wrapper
 * Matches the interface from hangul-ime.js but with IHangulIme interface
 */
class HangulImeWasm implements IHangulImeWasm {
  private wasm: WebAssembly.Exports & {
    memory: WebAssembly.Memory;
    wasm_ime_create(): number;
    wasm_ime_destroy(handle: number): void;
    wasm_ime_reset(handle: number): void;
    wasm_ime_processKey(handle: number, jamoIndex: number, resultBuffer: number): boolean;
    wasm_ime_processKey3(handle: number, ascii: number, resultBuffer: number): boolean;
    wasm_ime_backspace(handle: number): number;
    wasm_ime_commit(handle: number): number;
    wasm_ime_getState(handle: number, outputPtr: number): void;
    wasm_alloc(size: number): number;
    wasm_free(ptr: number, size: number): void;
  };
  private memory: WebAssembly.Memory;
  private handle: number;
  private resultBuffer: number;
  private enabled = false;
  public hasComposition = false;
  private compositionStart = -1;
  private debug: boolean;
  private layoutMode: '2bulsik' | '3bulsik';

  // 2-Bulsik layout mapping
  private static readonly LAYOUT_2BULSIK: Record<string, number> = {
    a: 17, b: 48, c: 26, d: 23, e: 7, f: 9, g: 30, h: 39, i: 33, j: 35,
    k: 31, l: 51, m: 49, n: 44, o: 32, p: 36, q: 18, r: 1, s: 4, t: 21,
    u: 37, v: 29, w: 24, x: 28, y: 43, z: 27,
    A: 17, B: 48, C: 26, D: 23, E: 8, F: 11, G: 30, H: 39, I: 33, J: 35,
    K: 31, L: 51, M: 49, N: 44, O: 34, P: 38, Q: 19, R: 2, S: 6, T: 22,
    U: 37, V: 29, W: 25, X: 28, Y: 43, Z: 27,
  };

  private static readonly ACTION_NO_CHANGE = 0;
  private static readonly ACTION_REPLACE = 1;
  private static readonly ACTION_EMIT_AND_NEW = 2;
  private static readonly ACTION_LITERAL = 3;

  constructor(wasmModule: WebAssembly.WebAssemblyInstantiatedSource, options: ImeOptions = {}) {
    this.wasm = wasmModule.instance.exports as typeof this.wasm;
    this.memory = this.wasm.memory;
    this.handle = this.wasm.wasm_ime_create();
    this.resultBuffer = this.wasm.wasm_alloc(16);
    this.debug = options.debug ?? false;
    this.layoutMode = options.layout ?? '2bulsik';

    if (this.handle === 0 || this.resultBuffer === 0) {
      throw new Error('Failed to initialize IME (WASM allocation failed)');
    }
  }

  enable(): void {
    this.enabled = true;
    this.reset();
  }

  disable(): void {
    this.enabled = false;
    this.reset();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  reset(): void {
    this.wasm.wasm_ime_reset(this.handle);
    this.hasComposition = false;
    this.compositionStart = -1;
  }

  setLayoutMode(mode: '2bulsik' | '3bulsik'): void {
    this.layoutMode = mode;
    this.reset();
  }

  getLayoutMode(): '2bulsik' | '3bulsik' {
    return this.layoutMode;
  }

  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  commit(field?: { value: string; selectionStart: number; selectionEnd: number }): string | null {
    const codepoint = this.wasm.wasm_ime_commit(this.handle);
    
    if (codepoint === 0) {
      this.hasComposition = false;
      this.compositionStart = -1;
      return null;
    }

    const char = String.fromCodePoint(codepoint);
    this.hasComposition = false;
    this.compositionStart = -1;
    return char;
  }

  destroy(): void {
    if (this.resultBuffer !== 0) {
      this.wasm.wasm_free(this.resultBuffer, 16);
      this.resultBuffer = 0;
    }
    if (this.handle !== 0) {
      this.wasm.wasm_ime_destroy(this.handle);
      this.handle = 0;
    }
  }

  handleKeyPress(
    event: { key: string },
    field: { value: string; selectionStart: number; selectionEnd: number }
  ): boolean {
    if (!this.enabled) return false;
    if (event.key.length !== 1) return false;
    if (event.key === ' ') return false;

    if (this.layoutMode === '3bulsik') {
      return this.handleKeyPress3Bulsik(event.key, field);
    }
    return this.handleKeyPress2Bulsik(event.key, field);
  }

  private handleKeyPress2Bulsik(
    char: string,
    field: { value: string; selectionStart: number; selectionEnd: number }
  ): boolean {
    const jamoIndex = HangulImeWasm.LAYOUT_2BULSIK[char];
    if (jamoIndex === undefined) return false;

    if (this.debug) {
      console.log(`[HangulImeWasm] 2-Bulsik key: '${char}' -> jamo: ${jamoIndex}`);
    }

    const handled = this.wasm.wasm_ime_processKey(this.handle, jamoIndex, this.resultBuffer);
    if (!handled) return false;

    const view = new Uint32Array(this.memory.buffer, this.resultBuffer, 3);
    const action = view[0];
    const prevCodepoint = view[1];
    const currentCodepoint = view[2];

    return this.handleResult(field, action, prevCodepoint, currentCodepoint);
  }

  private handleKeyPress3Bulsik(
    char: string,
    field: { value: string; selectionStart: number; selectionEnd: number }
  ): boolean {
    const ascii = char.charCodeAt(0);
    if (ascii < 33 || ascii > 126) return false;

    const handled = this.wasm.wasm_ime_processKey3(this.handle, ascii, this.resultBuffer);
    if (!handled) return false;

    const view = new Uint32Array(this.memory.buffer, this.resultBuffer, 4);
    const action = view[0];
    const prevCodepoint = view[1];
    const currentCodepoint = view[2];
    const literalCodepoint = view[3];

    if (action === HangulImeWasm.ACTION_LITERAL) {
      if (literalCodepoint !== 0) {
        this.insertChar(field, literalCodepoint);
      }
      return true;
    }

    if (action === HangulImeWasm.ACTION_EMIT_AND_NEW && literalCodepoint !== 0) {
      this.handleResult(field, action, prevCodepoint, 0);
      this.insertChar(field, literalCodepoint);
      this.hasComposition = false;
      this.compositionStart = -1;
      return true;
    }

    return this.handleResult(field, action, prevCodepoint, currentCodepoint);
  }

  private handleResult(
    field: { value: string; selectionStart: number; selectionEnd: number },
    action: number,
    prevCodepoint: number,
    currentCodepoint: number
  ): boolean {
    if (this.debug) {
      console.log(`[HangulImeWasm] action=${action}, prev=U+${prevCodepoint.toString(16)}, curr=U+${currentCodepoint.toString(16)}`);
    }

    switch (action) {
      case HangulImeWasm.ACTION_REPLACE:
        if (this.hasComposition && this.compositionStart >= 0) {
          this.replaceComposition(field, currentCodepoint);
        } else {
          this.compositionStart = field.selectionStart;
          this.insertChar(field, currentCodepoint);
        }
        this.hasComposition = true;
        break;

      case HangulImeWasm.ACTION_EMIT_AND_NEW:
        if (prevCodepoint !== 0 && this.hasComposition && this.compositionStart >= 0) {
          this.replaceComposition(field, prevCodepoint);
        }
        this.compositionStart = this.compositionStart >= 0 ? this.compositionStart + 1 : field.selectionStart;
        if (currentCodepoint !== 0) {
          this.insertChar(field, currentCodepoint);
          this.hasComposition = true;
        } else {
          this.hasComposition = false;
          this.compositionStart = -1;
        }
        break;
    }

    return true;
  }

  handleBackspace(
    field: { value: string; selectionStart: number; selectionEnd: number }
  ): boolean {
    if (!this.enabled) return false;
    if (!this.hasComposition || this.compositionStart < 0) return false;

    const newCodepoint = this.wasm.wasm_ime_backspace(this.handle);

    if (newCodepoint !== 0) {
      this.replaceComposition(field, newCodepoint);
      return true;
    }

    // IME state is empty, delete the composition character
    const pos = this.compositionStart;
    if (pos >= 0 && pos < field.value.length) {
      field.value = field.value.slice(0, pos) + field.value.slice(pos + 1);
      field.selectionStart = field.selectionEnd = pos;
    }

    this.hasComposition = false;
    this.compositionStart = -1;
    return true;
  }

  private insertChar(
    field: { value: string; selectionStart: number; selectionEnd: number },
    codepoint: number
  ): void {
    const char = String.fromCodePoint(codepoint);
    const start = field.selectionStart;
    const end = field.selectionEnd;
    field.value = field.value.slice(0, start) + char + field.value.slice(end);
    field.selectionStart = field.selectionEnd = start + char.length;
  }

  private replaceComposition(
    field: { value: string; selectionStart: number; selectionEnd: number },
    codepoint: number
  ): void {
    const char = String.fromCodePoint(codepoint);
    const pos = this.compositionStart;

    if (pos < 0 || pos >= field.value.length) {
      this.compositionStart = field.selectionStart;
      this.insertChar(field, codepoint);
      return;
    }

    field.value = field.value.slice(0, pos) + char + field.value.slice(pos + 1);
    field.selectionStart = field.selectionEnd = pos + 1;
  }
}

/**
 * Load result with IME instance and metadata
 */
export interface ImeLoadResult {
  ime: IHangulIme;
  type: 'wasm' | 'fallback';
  version?: string;
}

/**
 * Create an IME instance
 * Tries WASM first, falls back to TypeScript implementation
 */
export async function createIme(options: ImeOptions = {}): Promise<ImeLoadResult> {
  const wasmPath = options.wasmPath ?? 'hangul.wasm';

  try {
    // Try to load WASM
    const response = await fetch(wasmPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${wasmPath}: ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(bytes);

    const ime = new HangulImeWasm(wasmModule, options);
    ime.enable();

    console.log('[HangulIME] WASM IME loaded successfully');

    return {
      ime,
      type: 'wasm',
    };
  } catch (err) {
    console.warn('[HangulIME] WASM load failed, using TypeScript fallback:', err);

    // Fall back to pure TypeScript implementation
    const ime = new HangulImeFallback({ debug: options.debug });
    ime.enable();

    console.log('[HangulIME] TypeScript fallback IME loaded');

    return {
      ime,
      type: 'fallback',
    };
  }
}

// Default export for simple usage
export default createIme;
