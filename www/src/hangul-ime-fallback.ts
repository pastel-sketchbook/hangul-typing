/**
 * Pure TypeScript Korean IME Fallback
 *
 * Minimal 2-Bulsik (두벌식) implementation for when WASM is unavailable.
 * Based on the Hangul syllable composition algorithm.
 *
 * Unicode Hangul Syllables: U+AC00 to U+D7A3 (11,172 syllables)
 * Formula: syllable = 0xAC00 + (initial * 21 * 28) + (medial * 28) + final
 */

// Hangul Unicode constants
const HANGUL_BASE = 0xac00
const _INITIAL_COUNT = 19
const MEDIAL_COUNT = 21
const FINAL_COUNT = 28

// Compatibility Jamo (for display and decomposition)
const COMPAT_INITIAL = [
  0x3131, 0x3132, 0x3134, 0x3137, 0x3138, 0x3139, 0x3141, 0x3142, 0x3143, 0x3145, 0x3146, 0x3147, 0x3148, 0x3149,
  0x314a, 0x314b, 0x314c, 0x314d, 0x314e,
] // ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ

const COMPAT_MEDIAL = [
  0x314f, 0x3150, 0x3151, 0x3152, 0x3153, 0x3154, 0x3155, 0x3156, 0x3157, 0x3158, 0x3159, 0x315a, 0x315b, 0x315c,
  0x315d, 0x315e, 0x315f, 0x3160, 0x3161, 0x3162, 0x3163,
] // ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ

const COMPAT_FINAL = [
  0, 0x3131, 0x3132, 0x3133, 0x3134, 0x3135, 0x3136, 0x3137, 0x3139, 0x313a, 0x313b, 0x313c, 0x313d, 0x313e, 0x313f,
  0x3140, 0x3141, 0x3142, 0x3144, 0x3145, 0x3146, 0x3147, 0x3148, 0x314a, 0x314b, 0x314c, 0x314d, 0x314e,
] // (none)ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ

// 2-Bulsik layout: maps ASCII keys to OHI jamo indices
const LAYOUT_2BULSIK: Record<string, number> = {
  // Lowercase (unshifted)
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
  // Uppercase (shifted) - double consonants
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
  Z: 27,
}

// OHI index to standard jamo index mappings
const OHI_TO_INITIAL: Record<number, number> = {
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
  30: 18,
}

const OHI_TO_MEDIAL: Record<number, number> = {
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
  51: 20,
}

const OHI_TO_FINAL: Record<number, number> = {
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
  30: 27,
}

// Double finals that can split: final consonant → [remaining final, new initial]
const DOUBLE_FINAL_SPLIT: Record<number, [number, number]> = {
  3: [1, 21], // ㄳ → ㄱ + ㅅ
  5: [4, 24], // ㄵ → ㄴ + ㅈ
  6: [4, 30], // ㄶ → ㄴ + ㅎ
  9: [8, 1], // ㄺ → ㄹ + ㄱ
  10: [8, 17], // ㄻ → ㄹ + ㅁ
  11: [8, 18], // ㄼ → ㄹ + ㅂ
  12: [8, 21], // ㄽ → ㄹ + ㅅ
  13: [8, 28], // ㄾ → ㄹ + ㅌ
  14: [8, 29], // ㄿ → ㄹ + ㅍ
  15: [8, 30], // ㅀ → ㄹ + ㅎ
  18: [17, 21], // ㅄ → ㅂ + ㅅ
}

// Double vowel combinations: [first medial, second OHI] → combined medial index
const DOUBLE_MEDIAL: Record<string, number> = {
  '8,31': 9, // ㅗ + ㅏ → ㅘ
  '8,32': 10, // ㅗ + ㅐ → ㅙ
  '8,51': 11, // ㅗ + ㅣ → ㅚ
  '13,35': 14, // ㅜ + ㅓ → ㅝ
  '13,36': 15, // ㅜ + ㅔ → ㅞ
  '13,51': 16, // ㅜ + ㅣ → ㅟ
  '18,51': 19, // ㅡ + ㅣ → ㅢ
}

// Interface matching HangulIme for seamless substitution
export interface IHangulIme {
  enable(): void
  disable(): void
  isEnabled(): boolean
  reset(): void
  handleKeyPress(
    event: { key: string },
    field: { value: string; selectionStart: number; selectionEnd: number },
  ): boolean
  handleBackspace(field: { value: string; selectionStart: number; selectionEnd: number }): boolean
  hasComposition: boolean
}

interface ImeState {
  initial: number // 0-18 or -1 for none
  medial: number // 0-20 or -1 for none
  final: number // 0-27 or 0 for none
}

/**
 * Pure TypeScript Korean IME
 * Implements 2-Bulsik keyboard layout with syllable composition
 */
export class HangulImeFallback implements IHangulIme {
  private enabled = false
  private state: ImeState = { initial: -1, medial: -1, final: 0 }
  public hasComposition = false
  private compositionStart = -1
  private debug: boolean

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug ?? false
  }

  enable(): void {
    this.enabled = true
    this.reset()
  }

  disable(): void {
    this.enabled = false
    this.reset()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  reset(): void {
    this.state = { initial: -1, medial: -1, final: 0 }
    this.hasComposition = false
    this.compositionStart = -1
  }

  /**
   * Compose current state into a syllable codepoint
   */
  private compose(): number {
    if (this.state.initial < 0 || this.state.medial < 0) {
      // Can't compose without initial + medial
      if (this.state.initial >= 0) {
        return COMPAT_INITIAL[this.state.initial]
      }
      if (this.state.medial >= 0) {
        return COMPAT_MEDIAL[this.state.medial]
      }
      return 0
    }
    return (
      HANGUL_BASE + this.state.initial * MEDIAL_COUNT * FINAL_COUNT + this.state.medial * FINAL_COUNT + this.state.final
    )
  }

  /**
   * Check if an OHI index is an initial consonant
   */
  private isInitial(ohiIndex: number): boolean {
    return OHI_TO_INITIAL[ohiIndex] !== undefined
  }

  /**
   * Check if an OHI index is a medial vowel
   */
  private isMedial(ohiIndex: number): boolean {
    return OHI_TO_MEDIAL[ohiIndex] !== undefined
  }

  /**
   * Check if an OHI index can be a final consonant
   */
  private isFinal(ohiIndex: number): boolean {
    return OHI_TO_FINAL[ohiIndex] !== undefined
  }

  handleKeyPress(
    event: { key: string },
    field: { value: string; selectionStart: number; selectionEnd: number },
  ): boolean {
    if (!this.enabled) return false
    if (event.key.length !== 1) return false
    if (event.key === ' ') return false

    const ohiIndex = LAYOUT_2BULSIK[event.key]
    if (ohiIndex === undefined) return false

    if (this.debug) {
      console.log(`[FallbackIME] Key: '${event.key}' → OHI: ${ohiIndex}`)
    }

    const isInit = this.isInitial(ohiIndex)
    const isMed = this.isMedial(ohiIndex)
    const isFin = this.isFinal(ohiIndex)

    // State machine for syllable composition
    if (this.state.initial < 0) {
      // Empty state
      if (isInit) {
        this.state.initial = OHI_TO_INITIAL[ohiIndex]!
        this.compositionStart = field.selectionStart
        this.insertChar(field, this.compose())
        this.hasComposition = true
      } else if (isMed) {
        this.state.medial = OHI_TO_MEDIAL[ohiIndex]!
        this.compositionStart = field.selectionStart
        this.insertChar(field, this.compose())
        this.hasComposition = true
      }
    } else if (this.state.medial < 0) {
      // Have initial only
      if (isMed) {
        this.state.medial = OHI_TO_MEDIAL[ohiIndex]!
        this.replaceComposition(field, this.compose())
      } else if (isInit) {
        // Emit current, start new
        this.compositionStart = field.selectionStart
        this.state = { initial: OHI_TO_INITIAL[ohiIndex]!, medial: -1, final: 0 }
        this.insertChar(field, this.compose())
      }
    } else if (this.state.final === 0) {
      // Have initial + medial, no final
      if (isMed) {
        // Try double vowel
        const key = `${this.state.medial},${ohiIndex}`
        if (DOUBLE_MEDIAL[key] !== undefined) {
          this.state.medial = DOUBLE_MEDIAL[key]
          this.replaceComposition(field, this.compose())
        } else {
          // Emit current, start new with vowel only
          const prevCodepoint = this.compose()
          this.replaceComposition(field, prevCodepoint)
          this.compositionStart = field.selectionStart
          this.state = { initial: -1, medial: OHI_TO_MEDIAL[ohiIndex]!, final: 0 }
          this.insertChar(field, this.compose())
        }
      } else if (isFin) {
        this.state.final = OHI_TO_FINAL[ohiIndex]!
        this.replaceComposition(field, this.compose())
      } else if (isInit) {
        // Emit current, start new
        const prevCodepoint = this.compose()
        this.replaceComposition(field, prevCodepoint)
        this.compositionStart = field.selectionStart
        this.state = { initial: OHI_TO_INITIAL[ohiIndex]!, medial: -1, final: 0 }
        this.insertChar(field, this.compose())
      }
    } else {
      // Have initial + medial + final
      if (isMed) {
        // Split: final becomes initial of new syllable
        const splitInfo = DOUBLE_FINAL_SPLIT[this.state.final]
        let newInitialOhi: number

        if (splitInfo) {
          // Double final splits
          this.state.final = splitInfo[0]
          newInitialOhi = splitInfo[1]
        } else {
          // Single final moves to new syllable
          newInitialOhi = this.finalToInitialOhi(this.state.final)
          this.state.final = 0
        }

        const prevCodepoint = this.compose()
        this.replaceComposition(field, prevCodepoint)
        this.compositionStart = field.selectionStart
        this.state = {
          initial: OHI_TO_INITIAL[newInitialOhi]!,
          medial: OHI_TO_MEDIAL[ohiIndex]!,
          final: 0,
        }
        this.insertChar(field, this.compose())
      } else if (isInit) {
        // Emit current, start new
        const prevCodepoint = this.compose()
        this.replaceComposition(field, prevCodepoint)
        this.compositionStart = field.selectionStart
        this.state = { initial: OHI_TO_INITIAL[ohiIndex]!, medial: -1, final: 0 }
        this.insertChar(field, this.compose())
      } else if (isFin) {
        // Try to combine finals (e.g., ㄱ + ㅅ → ㄳ)
        // For simplicity, just emit and add new final
        const prevCodepoint = this.compose()
        this.replaceComposition(field, prevCodepoint)
        this.compositionStart = field.selectionStart
        this.state = { initial: OHI_TO_INITIAL[ohiIndex] ?? -1, medial: -1, final: 0 }
        this.insertChar(field, this.compose())
      }
    }

    if (this.debug) {
      console.log(
        `[FallbackIME] State: ${JSON.stringify(this.state)}, char: ${String.fromCodePoint(this.compose() || 0x20)}`,
      )
    }

    return true
  }

  /**
   * Convert final consonant index to OHI index for initial
   */
  private finalToInitialOhi(finalIdx: number): number {
    const finalCodepoint = COMPAT_FINAL[finalIdx]
    // Find matching initial
    for (const [ohi, initIdx] of Object.entries(OHI_TO_INITIAL)) {
      if (COMPAT_INITIAL[initIdx] === finalCodepoint) {
        return parseInt(ohi, 10)
      }
    }
    return 1 // Default to ㄱ
  }

  handleBackspace(field: { value: string; selectionStart: number; selectionEnd: number }): boolean {
    if (!this.enabled) return false
    if (!this.hasComposition || this.compositionStart < 0) return false

    if (this.debug) {
      console.log(`[FallbackIME] Backspace, state: ${JSON.stringify(this.state)}`)
    }

    // Decompose step by step
    if (this.state.final > 0) {
      // Remove final
      const splitInfo = DOUBLE_FINAL_SPLIT[this.state.final]
      if (splitInfo) {
        // Double final → single final
        this.state.final = splitInfo[0]
      } else {
        this.state.final = 0
      }
      this.replaceComposition(field, this.compose())
      return true
    }

    if (this.state.medial >= 0) {
      // Check for double vowel decomposition
      // For simplicity, just remove medial
      this.state.medial = -1
      if (this.state.initial >= 0) {
        this.replaceComposition(field, this.compose())
      } else {
        this.deleteComposition(field)
        this.hasComposition = false
        this.compositionStart = -1
      }
      return true
    }

    if (this.state.initial >= 0) {
      // Remove initial
      this.state.initial = -1
      this.deleteComposition(field)
      this.hasComposition = false
      this.compositionStart = -1
      return true
    }

    return false
  }

  private insertChar(field: { value: string; selectionStart: number; selectionEnd: number }, codepoint: number): void {
    const char = String.fromCodePoint(codepoint)
    const start = field.selectionStart
    const end = field.selectionEnd
    field.value = field.value.slice(0, start) + char + field.value.slice(end)
    field.selectionStart = field.selectionEnd = start + char.length
  }

  private replaceComposition(
    field: { value: string; selectionStart: number; selectionEnd: number },
    codepoint: number,
  ): void {
    const char = String.fromCodePoint(codepoint)
    const pos = this.compositionStart
    if (pos < 0 || pos >= field.value.length) {
      this.compositionStart = field.selectionStart
      this.insertChar(field, codepoint)
      return
    }
    field.value = field.value.slice(0, pos) + char + field.value.slice(pos + 1)
    field.selectionStart = field.selectionEnd = pos + 1
  }

  private deleteComposition(field: { value: string; selectionStart: number; selectionEnd: number }): void {
    const pos = this.compositionStart
    if (pos >= 0 && pos < field.value.length) {
      field.value = field.value.slice(0, pos) + field.value.slice(pos + 1)
      field.selectionStart = field.selectionEnd = pos
    }
  }
}
