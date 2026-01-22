// www/src/hangul-ime-fallback.ts
var HANGUL_BASE = 44032;
var MEDIAL_COUNT = 21;
var FINAL_COUNT = 28;
var COMPAT_INITIAL = [
  12593,
  12594,
  12596,
  12599,
  12600,
  12601,
  12609,
  12610,
  12611,
  12613,
  12614,
  12615,
  12616,
  12617,
  12618,
  12619,
  12620,
  12621,
  12622
];
var COMPAT_MEDIAL = [
  12623,
  12624,
  12625,
  12626,
  12627,
  12628,
  12629,
  12630,
  12631,
  12632,
  12633,
  12634,
  12635,
  12636,
  12637,
  12638,
  12639,
  12640,
  12641,
  12642,
  12643
];
var COMPAT_FINAL = [
  0,
  12593,
  12594,
  12595,
  12596,
  12597,
  12598,
  12599,
  12601,
  12602,
  12603,
  12604,
  12605,
  12606,
  12607,
  12608,
  12609,
  12610,
  12612,
  12613,
  12614,
  12615,
  12616,
  12618,
  12619,
  12620,
  12621,
  12622
];
var LAYOUT_2BULSIK = {
  a: 17,
  b: 48,
  c: 26,
  d: 23,
  e: 7,
  f: 9,
  g: 30,
  h: 39,
  i: 33,
  j: 35,
  k: 31,
  l: 51,
  m: 49,
  n: 44,
  o: 32,
  p: 36,
  q: 18,
  r: 1,
  s: 4,
  t: 21,
  u: 37,
  v: 29,
  w: 24,
  x: 28,
  y: 43,
  z: 27,
  A: 17,
  B: 48,
  C: 26,
  D: 23,
  E: 8,
  F: 11,
  G: 30,
  H: 39,
  I: 33,
  J: 35,
  K: 31,
  L: 51,
  M: 49,
  N: 44,
  O: 34,
  P: 38,
  Q: 19,
  R: 2,
  S: 6,
  T: 22,
  U: 37,
  V: 29,
  W: 25,
  X: 28,
  Y: 43,
  Z: 27
};
var OHI_TO_INITIAL = {
  1: 0,
  2: 1,
  4: 2,
  7: 3,
  8: 4,
  9: 5,
  17: 6,
  18: 7,
  19: 8,
  21: 9,
  22: 10,
  23: 11,
  24: 12,
  25: 13,
  26: 14,
  27: 15,
  28: 16,
  29: 17,
  30: 18
};
var OHI_TO_MEDIAL = {
  31: 0,
  32: 1,
  33: 2,
  34: 3,
  35: 4,
  36: 5,
  37: 6,
  38: 7,
  39: 8,
  40: 9,
  41: 10,
  42: 11,
  43: 12,
  44: 13,
  45: 14,
  46: 15,
  47: 16,
  48: 17,
  49: 18,
  50: 19,
  51: 20
};
var OHI_TO_FINAL = {
  1: 1,
  2: 2,
  4: 4,
  7: 7,
  9: 8,
  17: 16,
  18: 17,
  21: 19,
  22: 20,
  23: 21,
  24: 22,
  26: 23,
  27: 24,
  28: 25,
  29: 26,
  30: 27
};
var DOUBLE_FINAL_SPLIT = {
  3: [1, 21],
  5: [4, 24],
  6: [4, 30],
  9: [8, 1],
  10: [8, 17],
  11: [8, 18],
  12: [8, 21],
  13: [8, 28],
  14: [8, 29],
  15: [8, 30],
  18: [17, 21]
};
var DOUBLE_MEDIAL = {
  "8,31": 9,
  "8,32": 10,
  "8,51": 11,
  "13,35": 14,
  "13,36": 15,
  "13,51": 16,
  "18,51": 19
};

class HangulImeFallback {
  enabled = false;
  state = { initial: -1, medial: -1, final: 0 };
  hasComposition = false;
  compositionStart = -1;
  debug;
  constructor(options = {}) {
    this.debug = options.debug ?? false;
  }
  enable() {
    this.enabled = true;
    this.reset();
  }
  disable() {
    this.enabled = false;
    this.reset();
  }
  isEnabled() {
    return this.enabled;
  }
  reset() {
    this.state = { initial: -1, medial: -1, final: 0 };
    this.hasComposition = false;
    this.compositionStart = -1;
  }
  compose() {
    if (this.state.initial < 0 || this.state.medial < 0) {
      if (this.state.initial >= 0) {
        return COMPAT_INITIAL[this.state.initial];
      }
      if (this.state.medial >= 0) {
        return COMPAT_MEDIAL[this.state.medial];
      }
      return 0;
    }
    return HANGUL_BASE + this.state.initial * MEDIAL_COUNT * FINAL_COUNT + this.state.medial * FINAL_COUNT + this.state.final;
  }
  isInitial(ohiIndex) {
    return OHI_TO_INITIAL[ohiIndex] !== undefined;
  }
  isMedial(ohiIndex) {
    return OHI_TO_MEDIAL[ohiIndex] !== undefined;
  }
  isFinal(ohiIndex) {
    return OHI_TO_FINAL[ohiIndex] !== undefined;
  }
  handleKeyPress(event, field) {
    if (!this.enabled)
      return false;
    if (event.key.length !== 1)
      return false;
    if (event.key === " ")
      return false;
    const ohiIndex = LAYOUT_2BULSIK[event.key];
    if (ohiIndex === undefined)
      return false;
    if (this.debug) {
      console.log(`[FallbackIME] Key: '${event.key}' → OHI: ${ohiIndex}`);
    }
    const isInit = this.isInitial(ohiIndex);
    const isMed = this.isMedial(ohiIndex);
    const isFin = this.isFinal(ohiIndex);
    if (this.state.initial < 0) {
      if (isInit) {
        this.state.initial = OHI_TO_INITIAL[ohiIndex];
        this.compositionStart = field.selectionStart;
        this.insertChar(field, this.compose());
        this.hasComposition = true;
      } else if (isMed) {
        this.state.medial = OHI_TO_MEDIAL[ohiIndex];
        this.compositionStart = field.selectionStart;
        this.insertChar(field, this.compose());
        this.hasComposition = true;
      }
    } else if (this.state.medial < 0) {
      if (isMed) {
        this.state.medial = OHI_TO_MEDIAL[ohiIndex];
        this.replaceComposition(field, this.compose());
      } else if (isInit) {
        this.compositionStart = field.selectionStart;
        this.state = { initial: OHI_TO_INITIAL[ohiIndex], medial: -1, final: 0 };
        this.insertChar(field, this.compose());
      }
    } else if (this.state.final === 0) {
      if (isMed) {
        const key = `${this.state.medial},${ohiIndex}`;
        if (DOUBLE_MEDIAL[key] !== undefined) {
          this.state.medial = DOUBLE_MEDIAL[key];
          this.replaceComposition(field, this.compose());
        } else {
          const prevCodepoint = this.compose();
          this.replaceComposition(field, prevCodepoint);
          this.compositionStart = field.selectionStart;
          this.state = { initial: -1, medial: OHI_TO_MEDIAL[ohiIndex], final: 0 };
          this.insertChar(field, this.compose());
        }
      } else if (isFin) {
        this.state.final = OHI_TO_FINAL[ohiIndex];
        this.replaceComposition(field, this.compose());
      } else if (isInit) {
        const prevCodepoint = this.compose();
        this.replaceComposition(field, prevCodepoint);
        this.compositionStart = field.selectionStart;
        this.state = { initial: OHI_TO_INITIAL[ohiIndex], medial: -1, final: 0 };
        this.insertChar(field, this.compose());
      }
    } else {
      if (isMed) {
        const splitInfo = DOUBLE_FINAL_SPLIT[this.state.final];
        let newInitialOhi;
        if (splitInfo) {
          this.state.final = splitInfo[0];
          newInitialOhi = splitInfo[1];
        } else {
          newInitialOhi = this.finalToInitialOhi(this.state.final);
          this.state.final = 0;
        }
        const prevCodepoint = this.compose();
        this.replaceComposition(field, prevCodepoint);
        this.compositionStart = field.selectionStart;
        this.state = {
          initial: OHI_TO_INITIAL[newInitialOhi],
          medial: OHI_TO_MEDIAL[ohiIndex],
          final: 0
        };
        this.insertChar(field, this.compose());
      } else if (isInit) {
        const prevCodepoint = this.compose();
        this.replaceComposition(field, prevCodepoint);
        this.compositionStart = field.selectionStart;
        this.state = { initial: OHI_TO_INITIAL[ohiIndex], medial: -1, final: 0 };
        this.insertChar(field, this.compose());
      } else if (isFin) {
        const prevCodepoint = this.compose();
        this.replaceComposition(field, prevCodepoint);
        this.compositionStart = field.selectionStart;
        this.state = { initial: OHI_TO_INITIAL[ohiIndex] ?? -1, medial: -1, final: 0 };
        this.insertChar(field, this.compose());
      }
    }
    if (this.debug) {
      console.log(`[FallbackIME] State: ${JSON.stringify(this.state)}, char: ${String.fromCodePoint(this.compose() || 32)}`);
    }
    return true;
  }
  finalToInitialOhi(finalIdx) {
    const finalCodepoint = COMPAT_FINAL[finalIdx];
    for (const [ohi, initIdx] of Object.entries(OHI_TO_INITIAL)) {
      if (COMPAT_INITIAL[initIdx] === finalCodepoint) {
        return parseInt(ohi);
      }
    }
    return 1;
  }
  handleBackspace(field) {
    if (!this.enabled)
      return false;
    if (!this.hasComposition || this.compositionStart < 0)
      return false;
    if (this.debug) {
      console.log(`[FallbackIME] Backspace, state: ${JSON.stringify(this.state)}`);
    }
    if (this.state.final > 0) {
      const splitInfo = DOUBLE_FINAL_SPLIT[this.state.final];
      if (splitInfo) {
        this.state.final = splitInfo[0];
      } else {
        this.state.final = 0;
      }
      this.replaceComposition(field, this.compose());
      return true;
    }
    if (this.state.medial >= 0) {
      this.state.medial = -1;
      if (this.state.initial >= 0) {
        this.replaceComposition(field, this.compose());
      } else {
        this.deleteComposition(field);
        this.hasComposition = false;
        this.compositionStart = -1;
      }
      return true;
    }
    if (this.state.initial >= 0) {
      this.state.initial = -1;
      this.deleteComposition(field);
      this.hasComposition = false;
      this.compositionStart = -1;
      return true;
    }
    return false;
  }
  insertChar(field, codepoint) {
    const char = String.fromCodePoint(codepoint);
    const start = field.selectionStart;
    const end = field.selectionEnd;
    field.value = field.value.slice(0, start) + char + field.value.slice(end);
    field.selectionStart = field.selectionEnd = start + char.length;
  }
  replaceComposition(field, codepoint) {
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
  deleteComposition(field) {
    const pos = this.compositionStart;
    if (pos >= 0 && pos < field.value.length) {
      field.value = field.value.slice(0, pos) + field.value.slice(pos + 1);
      field.selectionStart = field.selectionEnd = pos;
    }
  }
}

// www/src/hangul-ime-loader.ts
class HangulImeWasm {
  wasm;
  memory;
  handle;
  resultBuffer;
  enabled = false;
  hasComposition = false;
  compositionStart = -1;
  debug;
  layoutMode;
  static LAYOUT_2BULSIK = {
    a: 17,
    b: 48,
    c: 26,
    d: 23,
    e: 7,
    f: 9,
    g: 30,
    h: 39,
    i: 33,
    j: 35,
    k: 31,
    l: 51,
    m: 49,
    n: 44,
    o: 32,
    p: 36,
    q: 18,
    r: 1,
    s: 4,
    t: 21,
    u: 37,
    v: 29,
    w: 24,
    x: 28,
    y: 43,
    z: 27,
    A: 17,
    B: 48,
    C: 26,
    D: 23,
    E: 8,
    F: 11,
    G: 30,
    H: 39,
    I: 33,
    J: 35,
    K: 31,
    L: 51,
    M: 49,
    N: 44,
    O: 34,
    P: 38,
    Q: 19,
    R: 2,
    S: 6,
    T: 22,
    U: 37,
    V: 29,
    W: 25,
    X: 28,
    Y: 43,
    Z: 27
  };
  static ACTION_NO_CHANGE = 0;
  static ACTION_REPLACE = 1;
  static ACTION_EMIT_AND_NEW = 2;
  static ACTION_LITERAL = 3;
  constructor(wasmModule, options = {}) {
    this.wasm = wasmModule.instance.exports;
    this.memory = this.wasm.memory;
    this.handle = this.wasm.wasm_ime_create();
    this.resultBuffer = this.wasm.wasm_alloc(16);
    this.debug = options.debug ?? false;
    this.layoutMode = options.layout ?? "2bulsik";
    if (this.handle === 0 || this.resultBuffer === 0) {
      throw new Error("Failed to initialize IME (WASM allocation failed)");
    }
  }
  enable() {
    this.enabled = true;
    this.reset();
  }
  disable() {
    this.enabled = false;
    this.reset();
  }
  isEnabled() {
    return this.enabled;
  }
  reset() {
    this.wasm.wasm_ime_reset(this.handle);
    this.hasComposition = false;
    this.compositionStart = -1;
  }
  setLayoutMode(mode) {
    this.layoutMode = mode;
    this.reset();
  }
  getLayoutMode() {
    return this.layoutMode;
  }
  setDebug(enabled) {
    this.debug = enabled;
  }
  commit(field) {
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
  destroy() {
    if (this.resultBuffer !== 0) {
      this.wasm.wasm_free(this.resultBuffer, 16);
      this.resultBuffer = 0;
    }
    if (this.handle !== 0) {
      this.wasm.wasm_ime_destroy(this.handle);
      this.handle = 0;
    }
  }
  handleKeyPress(event, field) {
    if (!this.enabled)
      return false;
    if (event.key.length !== 1)
      return false;
    if (event.key === " ")
      return false;
    if (this.layoutMode === "3bulsik") {
      return this.handleKeyPress3Bulsik(event.key, field);
    }
    return this.handleKeyPress2Bulsik(event.key, field);
  }
  handleKeyPress2Bulsik(char, field) {
    const jamoIndex = HangulImeWasm.LAYOUT_2BULSIK[char];
    if (jamoIndex === undefined)
      return false;
    if (this.debug) {
      console.log(`[HangulImeWasm] 2-Bulsik key: '${char}' -> jamo: ${jamoIndex}`);
    }
    const handled = this.wasm.wasm_ime_processKey(this.handle, jamoIndex, this.resultBuffer);
    if (!handled)
      return false;
    const view = new Uint32Array(this.memory.buffer, this.resultBuffer, 3);
    const action = view[0];
    const prevCodepoint = view[1];
    const currentCodepoint = view[2];
    return this.handleResult(field, action, prevCodepoint, currentCodepoint);
  }
  handleKeyPress3Bulsik(char, field) {
    const ascii = char.charCodeAt(0);
    if (ascii < 33 || ascii > 126)
      return false;
    const handled = this.wasm.wasm_ime_processKey3(this.handle, ascii, this.resultBuffer);
    if (!handled)
      return false;
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
  handleResult(field, action, prevCodepoint, currentCodepoint) {
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
  handleBackspace(field) {
    if (!this.enabled)
      return false;
    if (!this.hasComposition || this.compositionStart < 0)
      return false;
    const newCodepoint = this.wasm.wasm_ime_backspace(this.handle);
    if (newCodepoint !== 0) {
      this.replaceComposition(field, newCodepoint);
      return true;
    }
    const pos = this.compositionStart;
    if (pos >= 0 && pos < field.value.length) {
      field.value = field.value.slice(0, pos) + field.value.slice(pos + 1);
      field.selectionStart = field.selectionEnd = pos;
    }
    this.hasComposition = false;
    this.compositionStart = -1;
    return true;
  }
  insertChar(field, codepoint) {
    const char = String.fromCodePoint(codepoint);
    const start = field.selectionStart;
    const end = field.selectionEnd;
    field.value = field.value.slice(0, start) + char + field.value.slice(end);
    field.selectionStart = field.selectionEnd = start + char.length;
  }
  replaceComposition(field, codepoint) {
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
async function createIme(options = {}) {
  const wasmPath = options.wasmPath ?? "hangul.wasm";
  try {
    const response = await fetch(wasmPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${wasmPath}: ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const wasmModule = await WebAssembly.instantiate(bytes);
    const ime = new HangulImeWasm(wasmModule, options);
    ime.enable();
    console.log("[HangulIME] WASM IME loaded successfully");
    return {
      ime,
      type: "wasm"
    };
  } catch (err) {
    console.warn("[HangulIME] WASM load failed, using TypeScript fallback:", err);
    const ime = new HangulImeFallback({ debug: options.debug });
    ime.enable();
    console.log("[HangulIME] TypeScript fallback IME loaded");
    return {
      ime,
      type: "fallback"
    };
  }
}
var hangul_ime_loader_default = createIme;
export {
  hangul_ime_loader_default as default,
  createIme
};
