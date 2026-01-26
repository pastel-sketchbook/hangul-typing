import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  decomposeString,
  decomposeSyllable,
  isHangulSyllable,
  JAMO_TO_KEY,
  KEYBOARD_DISPLAY,
  KeyboardHighlighter,
} from './keyboard'

describe('keyboard', () => {
  describe('isHangulSyllable', () => {
    it('returns true for Hangul syllable blocks', () => {
      expect(isHangulSyllable('가')).toBe(true)
      expect(isHangulSyllable('한')).toBe(true)
      expect(isHangulSyllable('글')).toBe(true)
    })

    it('returns false for standalone jamo', () => {
      expect(isHangulSyllable('ㄱ')).toBe(false)
      expect(isHangulSyllable('ㅏ')).toBe(false)
    })

    it('returns false for non-Korean characters', () => {
      expect(isHangulSyllable('a')).toBe(false)
      expect(isHangulSyllable('A')).toBe(false)
      expect(isHangulSyllable('1')).toBe(false)
    })
  })

  describe('decomposeSyllable', () => {
    it('decomposes simple CV syllable (가 = ㄱ + ㅏ)', () => {
      expect(decomposeSyllable('가')).toEqual(['ㄱ', 'ㅏ'])
    })

    it('decomposes CVC syllable (간 = ㄱ + ㅏ + ㄴ)', () => {
      expect(decomposeSyllable('간')).toEqual(['ㄱ', 'ㅏ', 'ㄴ'])
    })

    it('decomposes syllable with compound vowel (과 = ㄱ + ㅗ + ㅏ)', () => {
      expect(decomposeSyllable('과')).toEqual(['ㄱ', 'ㅗ', 'ㅏ'])
    })

    it('decomposes syllable with compound final (닭 = ㄷ + ㅏ + ㄹ + ㄱ)', () => {
      expect(decomposeSyllable('닭')).toEqual(['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ'])
    })

    it('decomposes 한 correctly', () => {
      expect(decomposeSyllable('한')).toEqual(['ㅎ', 'ㅏ', 'ㄴ'])
    })

    it('decomposes 글 correctly', () => {
      expect(decomposeSyllable('글')).toEqual(['ㄱ', 'ㅡ', 'ㄹ'])
    })

    it('returns standalone jamo as-is', () => {
      expect(decomposeSyllable('ㄱ')).toEqual(['ㄱ'])
      expect(decomposeSyllable('ㅏ')).toEqual(['ㅏ'])
    })

    it('returns non-Korean characters as-is', () => {
      expect(decomposeSyllable('a')).toEqual(['a'])
      expect(decomposeSyllable(' ')).toEqual([' '])
    })
  })

  describe('decomposeString', () => {
    it('decomposes multi-syllable word', () => {
      expect(decomposeString('한글')).toEqual(['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ'])
    })

    it('decomposes mixed content', () => {
      expect(decomposeString('가a')).toEqual(['ㄱ', 'ㅏ', 'a'])
    })

    it('handles empty string', () => {
      expect(decomposeString('')).toEqual([])
    })
  })
  describe('KEYBOARD_DISPLAY', () => {
    it('has all QWERTY keys mapped', () => {
      const expectedKeys = 'qwertyuiopasdfghjklzxcvbnm'.split('')
      for (const key of expectedKeys) {
        expect(KEYBOARD_DISPLAY[key]).toBeDefined()
        expect(KEYBOARD_DISPLAY[key].normal).toBeTruthy()
        expect(KEYBOARD_DISPLAY[key].shift).toBeTruthy()
      }
    })

    it('maps q to ㅂ/ㅃ', () => {
      expect(KEYBOARD_DISPLAY.q).toEqual({ normal: 'ㅂ', shift: 'ㅃ' })
    })

    it('maps k to ㅏ (no shift variant)', () => {
      expect(KEYBOARD_DISPLAY.k).toEqual({ normal: 'ㅏ', shift: 'ㅏ' })
    })
  })

  describe('JAMO_TO_KEY', () => {
    it('maps basic consonants to keys', () => {
      expect(JAMO_TO_KEY.ㄱ).toEqual({ key: 'r', shift: false })
      expect(JAMO_TO_KEY.ㄴ).toEqual({ key: 's', shift: false })
      expect(JAMO_TO_KEY.ㅂ).toEqual({ key: 'q', shift: false })
    })

    it('maps basic vowels to keys', () => {
      expect(JAMO_TO_KEY.ㅏ).toEqual({ key: 'k', shift: false })
      expect(JAMO_TO_KEY.ㅓ).toEqual({ key: 'j', shift: false })
      expect(JAMO_TO_KEY.ㅗ).toEqual({ key: 'h', shift: false })
    })

    it('maps double consonants to shift keys', () => {
      expect(JAMO_TO_KEY.ㄲ).toEqual({ key: 'r', shift: true })
      expect(JAMO_TO_KEY.ㅃ).toEqual({ key: 'q', shift: true })
      expect(JAMO_TO_KEY.ㅆ).toEqual({ key: 't', shift: true })
    })
  })

  describe('KeyboardHighlighter', () => {
    let container: HTMLElement
    let keys: NodeListOf<HTMLElement>
    let shiftKey: HTMLElement
    let highlighter: KeyboardHighlighter

    beforeEach(() => {
      container = document.createElement('div')

      // Create key elements
      const keyK = document.createElement('div')
      keyK.className = 'key'
      keyK.dataset.key = 'k'

      const keyR = document.createElement('div')
      keyR.className = 'key'
      keyR.dataset.key = 'r'

      shiftKey = document.createElement('div')
      shiftKey.className = 'key'
      shiftKey.dataset.key = 'shift'

      container.appendChild(keyK)
      container.appendChild(keyR)
      container.appendChild(shiftKey)
      document.body.appendChild(container)

      keys = container.querySelectorAll('.key[data-key]') as NodeListOf<HTMLElement>
      highlighter = new KeyboardHighlighter(keys)
    })

    afterEach(() => {
      container.remove()
    })

    describe('clear', () => {
      it('removes highlight classes from all keys', () => {
        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        keyK.classList.add('highlight')

        highlighter.clear()

        expect(keyK.classList.contains('highlight')).toBe(false)
      })

      it('removes highlight-shift and pressed classes', () => {
        const keyR = container.querySelector('[data-key="r"]') as HTMLElement
        keyR.classList.add('highlight-shift', 'pressed')

        highlighter.clear()

        expect(keyR.classList.contains('highlight-shift')).toBe(false)
        expect(keyR.classList.contains('pressed')).toBe(false)
      })
    })

    describe('highlightJamo', () => {
      it('highlights key for basic vowel', () => {
        highlighter.highlightJamo('ㅏ')

        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        expect(keyK.classList.contains('highlight')).toBe(true)
      })

      it('highlights key with shift for double consonant', () => {
        highlighter.highlightJamo('ㄲ')

        const keyR = container.querySelector('[data-key="r"]') as HTMLElement
        expect(keyR.classList.contains('highlight-shift')).toBe(true)
        expect(shiftKey.classList.contains('highlight')).toBe(true)
      })

      it('does nothing for unknown jamo', () => {
        highlighter.highlightJamo('X')

        const allHighlighted = container.querySelectorAll('.highlight, .highlight-shift')
        expect(allHighlighted.length).toBe(0)
      })
    })

    describe('highlightForTarget', () => {
      it('highlights single jamo target', () => {
        highlighter.highlightForTarget('ㅏ')

        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        expect(keyK.classList.contains('highlight')).toBe(true)
      })

      it('clears previous highlights before highlighting new target', () => {
        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        keyK.classList.add('highlight')

        highlighter.highlightForTarget('ㄱ')

        expect(keyK.classList.contains('highlight')).toBe(false)
      })

      it('does nothing for empty target', () => {
        highlighter.highlightForTarget('')

        const allHighlighted = container.querySelectorAll('.highlight, .highlight-shift')
        expect(allHighlighted.length).toBe(0)
      })
    })

    describe('showKeyPress', () => {
      it('adds pressed class to key', () => {
        highlighter.showKeyPress('k')

        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        expect(keyK.classList.contains('pressed')).toBe(true)
      })

      it('removes pressed class after timeout', async () => {
        vi.useFakeTimers()

        highlighter.showKeyPress('k')

        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        expect(keyK.classList.contains('pressed')).toBe(true)

        vi.advanceTimersByTime(100)

        expect(keyK.classList.contains('pressed')).toBe(false)

        vi.useRealTimers()
      })

      it('handles uppercase key input', () => {
        highlighter.showKeyPress('K')

        const keyK = container.querySelector('[data-key="k"]') as HTMLElement
        expect(keyK.classList.contains('pressed')).toBe(true)
      })
    })
  })
})
