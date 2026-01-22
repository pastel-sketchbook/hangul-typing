/**
 * Keyboard layout and highlighting utilities
 * 2-Bulsik (두벌식) keyboard layout for visual display
 */

import type { JamoKeyInfo, KeyMapping } from './types';

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
};

/**
 * Reverse mapping: Hangul jamo to physical key (for keyboard highlighting)
 */
export const JAMO_TO_KEY: Record<string, JamoKeyInfo> = {};

// Build reverse mapping
for (const [key, mapping] of Object.entries(KEYBOARD_DISPLAY)) {
  JAMO_TO_KEY[mapping.normal] = { key, shift: false };
  if (mapping.shift !== mapping.normal) {
    JAMO_TO_KEY[mapping.shift] = { key, shift: true };
  }
}

/**
 * Keyboard highlight controller
 */
export class KeyboardHighlighter {
  private keys: NodeListOf<HTMLElement>;
  private shiftKey: HTMLElement | null;

  constructor(keys: NodeListOf<HTMLElement>) {
    this.keys = keys;
    this.shiftKey = document.querySelector('.key[data-key="shift"]');
  }

  /**
   * Clear all keyboard highlights
   */
  clear(): void {
    for (const key of this.keys) {
      key.classList.remove('highlight', 'highlight-shift', 'pressed');
    }
    this.shiftKey?.classList.remove('highlight', 'pressed');
  }

  /**
   * Highlight keys for the target character
   * Supports single jamo and composed syllables
   */
  highlightForTarget(target: string): void {
    this.clear();
    if (!target) return;

    // For single jamo, highlight the key directly
    if (target.length === 1) {
      this.highlightJamo(target);
    }
    // TODO: For composed syllables, decompose and show sequence
  }

  /**
   * Highlight a single jamo on the keyboard
   */
  highlightJamo(jamo: string): void {
    const keyInfo = JAMO_TO_KEY[jamo];
    if (!keyInfo) return;

    const keyElement = document.querySelector(
      `.key[data-key="${keyInfo.key}"]`,
    ) as HTMLElement | null;

    if (keyElement) {
      if (keyInfo.shift) {
        keyElement.classList.add('highlight-shift');
        this.shiftKey?.classList.add('highlight');
      } else {
        keyElement.classList.add('highlight');
      }
    }
  }

  /**
   * Show key press feedback (brief pressed animation)
   */
  showKeyPress(keyChar: string): void {
    const keyElement = document.querySelector(
      `.key[data-key="${keyChar.toLowerCase()}"]`,
    ) as HTMLElement | null;

    if (keyElement) {
      keyElement.classList.add('pressed');
      setTimeout(() => {
        keyElement.classList.remove('pressed');
      }, 100);
    }
  }
}
