import { beforeEach, describe, expect, it } from 'vitest'
import { HangulImeFallback } from './hangul-ime-fallback'

describe('HangulImeFallback', () => {
  let ime: HangulImeFallback
  let field: { value: string; selectionStart: number; selectionEnd: number }

  beforeEach(() => {
    ime = new HangulImeFallback()
    field = { value: '', selectionStart: 0, selectionEnd: 0 }
  })

  describe('enable/disable', () => {
    it('starts disabled', () => {
      expect(ime.isEnabled()).toBe(false)
    })

    it('can be enabled', () => {
      ime.enable()
      expect(ime.isEnabled()).toBe(true)
    })

    it('can be disabled', () => {
      ime.enable()
      ime.disable()
      expect(ime.isEnabled()).toBe(false)
    })
  })

  describe('handleKeyPress', () => {
    beforeEach(() => {
      ime.enable()
    })

    it('returns false when disabled', () => {
      ime.disable()
      const result = ime.handleKeyPress({ key: 'r' }, field)
      expect(result).toBe(false)
    })

    it('returns false for non-single-char keys', () => {
      const result = ime.handleKeyPress({ key: 'Enter' }, field)
      expect(result).toBe(false)
    })

    it('returns false for space key', () => {
      const result = ime.handleKeyPress({ key: ' ' }, field)
      expect(result).toBe(false)
    })

    it('returns false for non-Korean keys', () => {
      const result = ime.handleKeyPress({ key: '1' }, field)
      expect(result).toBe(false)
    })

    it('composes initial consonant (ㄱ from r)', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      expect(field.value).toBe('ㄱ')
    })

    it('composes initial + medial syllable (가 from r + k)', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('가')
    })

    it('composes CVC syllable (간 from r + k + s)', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 's' }, field)
      expect(field.value).toBe('간')
    })

    it('composes 한 from g + k + s', () => {
      ime.handleKeyPress({ key: 'g' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 's' }, field)
      expect(field.value).toBe('한')
    })

    it('composes 글 from r + m + f', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'm' }, field)
      ime.handleKeyPress({ key: 'f' }, field)
      expect(field.value).toBe('글')
    })

    it('composes double consonant (ㄲ from R)', () => {
      ime.handleKeyPress({ key: 'R' }, field)
      expect(field.value).toBe('ㄲ')
    })

    it('composes syllable with double initial (까 from R + k)', () => {
      ime.handleKeyPress({ key: 'R' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('까')
    })

    it('splits final when vowel follows (한글 from gksrmf)', () => {
      // 한 = g + k + s
      ime.handleKeyPress({ key: 'g' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 's' }, field)
      expect(field.value).toBe('한')

      // 글 = r + m + f (but ㄴ stays as final of 한, ㄱ becomes initial of new syllable)
      ime.handleKeyPress({ key: 'r' }, field)
      expect(field.value).toBe('한ㄱ')

      ime.handleKeyPress({ key: 'm' }, field)
      expect(field.value).toBe('한그')

      ime.handleKeyPress({ key: 'f' }, field)
      expect(field.value).toBe('한글')
    })

    it('composes compound vowel (과 from r + h + k)', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'h' }, field) // ㅗ
      ime.handleKeyPress({ key: 'k' }, field) // ㅏ → ㅘ
      expect(field.value).toBe('과')
    })

    it('starts new syllable when consecutive initials (ㄱㄴ from r + s)', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      expect(field.value).toBe('ㄱ')

      ime.handleKeyPress({ key: 's' }, field)
      expect(field.value).toBe('ㄱㄴ')
    })

    it('composes standalone vowel (ㅏ from k)', () => {
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('ㅏ')
    })
  })

  describe('handleBackspace', () => {
    beforeEach(() => {
      ime.enable()
    })

    it('returns false when disabled', () => {
      ime.disable()
      const result = ime.handleBackspace(field)
      expect(result).toBe(false)
    })

    it('returns false with no composition', () => {
      const result = ime.handleBackspace(field)
      expect(result).toBe(false)
    })

    it('removes final consonant first', () => {
      // Compose 간
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 's' }, field)
      expect(field.value).toBe('간')

      // Backspace removes ㄴ final
      ime.handleBackspace(field)
      expect(field.value).toBe('가')
    })

    it('removes medial after final is gone', () => {
      // Compose 가
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('가')

      // Backspace removes ㅏ
      ime.handleBackspace(field)
      expect(field.value).toBe('ㄱ')
    })

    it('removes initial after medial is gone', () => {
      // Compose ㄱ
      ime.handleKeyPress({ key: 'r' }, field)
      expect(field.value).toBe('ㄱ')

      // Backspace removes ㄱ
      ime.handleBackspace(field)
      expect(field.value).toBe('')
    })

    it('removes standalone vowel', () => {
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('ㅏ')

      ime.handleBackspace(field)
      expect(field.value).toBe('')
    })
  })

  describe('reset', () => {
    beforeEach(() => {
      ime.enable()
    })

    it('clears composition state', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      expect(ime.hasComposition).toBe(true)

      ime.reset()
      expect(ime.hasComposition).toBe(false)
    })

    it('allows starting fresh composition after reset', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('가')

      ime.reset()
      field.value = ''
      field.selectionStart = 0
      field.selectionEnd = 0

      ime.handleKeyPress({ key: 's' }, field)
      expect(field.value).toBe('ㄴ')
    })
  })

  describe('hasComposition', () => {
    beforeEach(() => {
      ime.enable()
    })

    it('is false initially', () => {
      expect(ime.hasComposition).toBe(false)
    })

    it('is true after starting composition', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      expect(ime.hasComposition).toBe(true)
    })

    it('is false after backspace removes all', () => {
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleBackspace(field)
      expect(ime.hasComposition).toBe(false)
    })
  })

  describe('debug mode', () => {
    it('can be enabled via constructor option', () => {
      const debugIme = new HangulImeFallback({ debug: true })
      debugIme.enable()
      // Should not throw
      debugIme.handleKeyPress({ key: 'r' }, field)
    })
  })

  describe('real words composition', () => {
    beforeEach(() => {
      ime.enable()
    })

    it('composes 사람 (person)', () => {
      // 사 = t + k
      ime.handleKeyPress({ key: 't' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      // 람 = f + k + a
      ime.handleKeyPress({ key: 'f' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 'a' }, field)
      expect(field.value).toBe('사람')
    })

    it('composes 안녕 (hello)', () => {
      // 안 = d + k + s
      ime.handleKeyPress({ key: 'd' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 's' }, field)
      // 녕 = s + u + d
      ime.handleKeyPress({ key: 's' }, field)
      ime.handleKeyPress({ key: 'u' }, field)
      ime.handleKeyPress({ key: 'd' }, field)
      expect(field.value).toBe('안녕')
    })

    it('composes 감사 (thanks)', () => {
      // 감 = r + k + a
      ime.handleKeyPress({ key: 'r' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      ime.handleKeyPress({ key: 'a' }, field)
      // 사 = t + k
      ime.handleKeyPress({ key: 't' }, field)
      ime.handleKeyPress({ key: 'k' }, field)
      expect(field.value).toBe('감사')
    })
  })
})
