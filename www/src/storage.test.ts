import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearProgress, loadProgress, saveProgress } from './storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('loadProgress', () => {
    it('returns [1] when no saved progress exists', () => {
      const progress = loadProgress()
      expect(progress).toEqual([1])
    })

    it('returns saved unlocked levels', () => {
      localStorage.setItem('hangul-typing-progress', JSON.stringify({ unlockedLevels: [1, 2, 3] }))

      const progress = loadProgress()
      expect(progress).toEqual([1, 2, 3])
    })

    it('returns [1] when saved data has no unlockedLevels', () => {
      localStorage.setItem('hangul-typing-progress', JSON.stringify({}))

      const progress = loadProgress()
      expect(progress).toEqual([1])
    })

    it('returns [1] when saved data is invalid JSON', () => {
      localStorage.setItem('hangul-typing-progress', 'invalid-json')

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const progress = loadProgress()

      expect(progress).toEqual([1])
      expect(consoleWarn).toHaveBeenCalled()

      consoleWarn.mockRestore()
    })
  })

  describe('saveProgress', () => {
    it('saves unlocked levels to localStorage', () => {
      saveProgress([1, 2, 3])

      const saved = localStorage.getItem('hangul-typing-progress')
      expect(saved).toBe(JSON.stringify({ unlockedLevels: [1, 2, 3] }))
    })

    it('overwrites existing progress', () => {
      saveProgress([1])
      saveProgress([1, 2, 3, 4])

      const saved = localStorage.getItem('hangul-typing-progress')
      expect(saved).toBe(JSON.stringify({ unlockedLevels: [1, 2, 3, 4] }))
    })
  })

  describe('clearProgress', () => {
    it('removes progress from localStorage', () => {
      localStorage.setItem('hangul-typing-progress', JSON.stringify({ unlockedLevels: [1, 2, 3] }))

      clearProgress()

      expect(localStorage.getItem('hangul-typing-progress')).toBeNull()
    })

    it('does not throw when no progress exists', () => {
      expect(() => clearProgress()).not.toThrow()
    })
  })
})
