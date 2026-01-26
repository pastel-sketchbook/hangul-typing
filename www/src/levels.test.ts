import { describe, expect, it } from 'vitest'
import { generateTargets, getLevelThreshold, LEVEL_COUNT, levels, TARGETS_PER_LEVEL } from './levels'

describe('levels', () => {
  describe('levels data', () => {
    it('has correct number of levels', () => {
      expect(Object.keys(levels)).toHaveLength(LEVEL_COUNT)
    })

    it('each level has required properties', () => {
      for (let i = 1; i <= LEVEL_COUNT; i++) {
        const level = levels[i]
        expect(level).toBeDefined()
        expect(level.name).toBeTruthy()
        expect(level.chars.length).toBeGreaterThan(0)
        expect(level.threshold).toBeGreaterThan(0)
        expect(level.threshold).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('generateTargets', () => {
    it('generates correct number of targets', () => {
      const targets = generateTargets(1)
      expect(targets).toHaveLength(TARGETS_PER_LEVEL)
    })

    it('generates targets from level chars only', () => {
      const targets = generateTargets(1)
      const validChars = levels[1].chars
      for (const target of targets) {
        expect(validChars).toContain(target)
      }
    })

    it('throws for invalid level', () => {
      expect(() => generateTargets(999)).toThrow('Invalid level: 999')
    })
  })

  describe('getLevelThreshold', () => {
    it('returns threshold for valid level', () => {
      expect(getLevelThreshold(1)).toBe(90)
      expect(getLevelThreshold(7)).toBe(80)
    })

    it('returns default 80 for invalid level', () => {
      expect(getLevelThreshold(999)).toBe(80)
    })
  })
})
