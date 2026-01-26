/**
 * Level definitions and target generation
 */

import type { LevelData } from './types'

/** All level definitions */
export const levels: Record<number, LevelData> = {
  1: {
    name: 'Basic Vowels',
    chars: ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ'],
    threshold: 90,
  },
  2: {
    name: 'Basic Consonants',
    chars: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ'],
    threshold: 90,
  },
  3: {
    name: 'Simple Syllables',
    chars: ['가', '나', '다', '라', '마', '바', '사', '아', '자'],
    threshold: 90,
  },
  4: {
    name: 'Final Consonants',
    chars: ['간', '날', '달', '말', '발', '산', '안', '잔'],
    threshold: 90,
  },
  5: {
    name: 'Double Consonants',
    chars: ['까', '따', '빠', '싸', '짜'],
    threshold: 85,
  },
  6: {
    name: 'Complex Vowels',
    chars: ['개', '게', '괴', '귀', '의'],
    threshold: 85,
  },
  7: {
    name: 'Common Words',
    chars: ['한국', '사람', '감사', '안녕', '좋아'],
    threshold: 80,
  },
  8: {
    name: 'Short Phrases',
    chars: ['안녕하세요', '감사합니다', '좋아요'],
    threshold: 80,
  },
  9: {
    name: 'Full Sentences',
    chars: ['오늘 날씨가 좋아요', '한국어를 배워요'],
    threshold: 75,
  },
}

/** Total number of levels */
export const LEVEL_COUNT = 9

/** Number of targets per level */
export const TARGETS_PER_LEVEL = 20

/**
 * Generate random targets for a level
 */
export function generateTargets(level: number): string[] {
  const levelData = levels[level]
  if (!levelData) {
    throw new Error(`Invalid level: ${level}`)
  }

  const targets: string[] = []
  for (let i = 0; i < TARGETS_PER_LEVEL; i++) {
    const char = levelData.chars[Math.floor(Math.random() * levelData.chars.length)]
    targets.push(char)
  }

  return targets
}

/**
 * Get level threshold for passing
 */
export function getLevelThreshold(level: number): number {
  return levels[level]?.threshold ?? 80
}
