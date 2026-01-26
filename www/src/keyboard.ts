/**
 * Keyboard layout and highlighting utilities
 * 2-Bulsik (두벌식) keyboard layout for visual display
 */

import { KEY_PRESS_ANIMATION_MS } from './constants'
import type { JamoKeyInfo, KeyMapping } from './types'

// ===================
// Hangul Decomposition
// ===================

/** Hangul syllable block range */
const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3

/** Jamo counts for syllable composition */
const MEDIAL_COUNT = 21
const FINAL_COUNT = 28

/** Initial consonants (초성) in syllable order */
const INITIALS = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

/** Medial vowels (중성) in syllable order */
const MEDIALS = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
]

/** Final consonants (종성) in syllable order - index 0 is no final */
const FINALS = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

/** Compound vowel decomposition (for key sequences) */
const COMPOUND_VOWELS: Record<string, string[]> = {
  ㅘ: ['ㅗ', 'ㅏ'],
  ㅙ: ['ㅗ', 'ㅐ'],
  ㅚ: ['ㅗ', 'ㅣ'],
  ㅝ: ['ㅜ', 'ㅓ'],
  ㅞ: ['ㅜ', 'ㅔ'],
  ㅟ: ['ㅜ', 'ㅣ'],
  ㅢ: ['ㅡ', 'ㅣ'],
}

/** Compound final consonant decomposition (for key sequences) */
const COMPOUND_FINALS: Record<string, string[]> = {
  ㄳ: ['ㄱ', 'ㅅ'],
  ㄵ: ['ㄴ', 'ㅈ'],
  ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'],
  ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'],
  ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'],
  ㅄ: ['ㅂ', 'ㅅ'],
}

/**
 * Check if a character is a Hangul syllable block
 */
export function isHangulSyllable(char: string): boolean {
  const code = char.charCodeAt(0)
  return code >= HANGUL_BASE && code <= HANGUL_END
}

/**
 * Decompose a Hangul syllable into its jamo components
 * Returns array of individual jamo to type (with compound jamo expanded)
 */
export function decomposeSyllable(syllable: string): string[] {
  if (!isHangulSyllable(syllable)) {
    // Not a syllable, return as-is (might be a standalone jamo)
    return [syllable]
  }

  const code = syllable.charCodeAt(0) - HANGUL_BASE
  const initialIdx = Math.floor(code / (MEDIAL_COUNT * FINAL_COUNT))
  const medialIdx = Math.floor((code % (MEDIAL_COUNT * FINAL_COUNT)) / FINAL_COUNT)
  const finalIdx = code % FINAL_COUNT

  const result: string[] = []

  // Initial consonant
  result.push(INITIALS[initialIdx])

  // Medial vowel (may be compound)
  const medial = MEDIALS[medialIdx]
  if (COMPOUND_VOWELS[medial]) {
    result.push(...COMPOUND_VOWELS[medial])
  } else {
    result.push(medial)
  }

  // Final consonant (may be compound or absent)
  if (finalIdx > 0) {
    const final = FINALS[finalIdx]
    if (COMPOUND_FINALS[final]) {
      result.push(...COMPOUND_FINALS[final])
    } else {
      result.push(final)
    }
  }

  return result
}

/**
 * Decompose a string of characters into jamo sequence
 */
export function decomposeString(str: string): string[] {
  const result: string[] = []
  for (const char of str) {
    result.push(...decomposeSyllable(char))
  }
  return result
}

/**
 * 2-Bulsik Keyboard Layout - Maps physical keys to display jamo
 * Used for visual keyboard display (not IME processing)
 */
export const KEYBOARD_DISPLAY: Record<string, KeyMapping> = {
  // Row 1: QWERTYUIOP
  q: { normal: 'ㅂ', shift: 'ㅃ' },
  w: { normal: 'ㅈ', shift: 'ㅉ' },
  e: { normal: 'ㄷ', shift: 'ㄸ' },
  r: { normal: 'ㄱ', shift: 'ㄲ' },
  t: { normal: 'ㅅ', shift: 'ㅆ' },
  y: { normal: 'ㅛ', shift: 'ㅛ' },
  u: { normal: 'ㅕ', shift: 'ㅕ' },
  i: { normal: 'ㅑ', shift: 'ㅑ' },
  o: { normal: 'ㅐ', shift: 'ㅒ' },
  p: { normal: 'ㅔ', shift: 'ㅖ' },

  // Row 2: ASDFGHJKL
  a: { normal: 'ㅁ', shift: 'ㅁ' },
  s: { normal: 'ㄴ', shift: 'ㄴ' },
  d: { normal: 'ㅇ', shift: 'ㅇ' },
  f: { normal: 'ㄹ', shift: 'ㄹ' },
  g: { normal: 'ㅎ', shift: 'ㅎ' },
  h: { normal: 'ㅗ', shift: 'ㅗ' },
  j: { normal: 'ㅓ', shift: 'ㅓ' },
  k: { normal: 'ㅏ', shift: 'ㅏ' },
  l: { normal: 'ㅣ', shift: 'ㅣ' },

  // Row 3: ZXCVBNM
  z: { normal: 'ㅋ', shift: 'ㅋ' },
  x: { normal: 'ㅌ', shift: 'ㅌ' },
  c: { normal: 'ㅊ', shift: 'ㅊ' },
  v: { normal: 'ㅍ', shift: 'ㅍ' },
  b: { normal: 'ㅠ', shift: 'ㅠ' },
  n: { normal: 'ㅜ', shift: 'ㅜ' },
  m: { normal: 'ㅡ', shift: 'ㅡ' },
}

/**
 * Reverse mapping: Hangul jamo to physical key (for keyboard highlighting)
 */
export const JAMO_TO_KEY: Record<string, JamoKeyInfo> = {}

// Build reverse mapping
for (const [key, mapping] of Object.entries(KEYBOARD_DISPLAY)) {
  JAMO_TO_KEY[mapping.normal] = { key, shift: false }
  if (mapping.shift !== mapping.normal) {
    JAMO_TO_KEY[mapping.shift] = { key, shift: true }
  }
}

/**
 * Keyboard highlight controller
 */
export class KeyboardHighlighter {
  private keys: NodeListOf<HTMLElement>
  private shiftKey: HTMLElement | null

  constructor(keys: NodeListOf<HTMLElement>) {
    this.keys = keys
    this.shiftKey = document.querySelector('.key[data-key="shift"]')
  }

  /**
   * Clear all keyboard highlights
   */
  clear(): void {
    for (const key of this.keys) {
      key.classList.remove('highlight', 'highlight-shift', 'pressed')
    }
    this.shiftKey?.classList.remove('highlight', 'pressed')
  }

  /**
   * Highlight keys for the target character
   * Supports single jamo and composed syllables
   */
  highlightForTarget(target: string): void {
    this.clear()
    if (!target) return

    // Decompose the first character into jamo sequence
    const firstChar = target[0]
    const jamos = decomposeSyllable(firstChar)

    // Highlight all jamo in the sequence
    for (const jamo of jamos) {
      this.highlightJamo(jamo)
    }
  }

  /**
   * Highlight a single jamo on the keyboard
   */
  highlightJamo(jamo: string): void {
    const keyInfo = JAMO_TO_KEY[jamo]
    if (!keyInfo) return

    const keyElement = document.querySelector(`.key[data-key="${keyInfo.key}"]`) as HTMLElement | null

    if (keyElement) {
      if (keyInfo.shift) {
        keyElement.classList.add('highlight-shift')
        this.shiftKey?.classList.add('highlight')
      } else {
        keyElement.classList.add('highlight')
      }
    }
  }

  /**
   * Show key press feedback (brief pressed animation)
   */
  showKeyPress(keyChar: string): void {
    const keyElement = document.querySelector(`.key[data-key="${keyChar.toLowerCase()}"]`) as HTMLElement | null

    if (keyElement) {
      keyElement.classList.add('pressed')
      setTimeout(() => {
        keyElement.classList.remove('pressed')
      }, KEY_PRESS_ANIMATION_MS)
    }
  }
}
