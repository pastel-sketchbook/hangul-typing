/**
 * Local storage persistence for game progress
 */

import type { SavedProgress } from './types'

const STORAGE_KEY = 'hangul-typing-progress'

/**
 * Load saved progress from localStorage
 */
export function loadProgress(): number[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved) as SavedProgress
      return data.unlockedLevels ?? [1]
    }
  } catch (err) {
    console.warn('Failed to load progress:', err)
  }
  return [1]
}

/**
 * Save progress to localStorage
 */
export function saveProgress(unlockedLevels: number[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        unlockedLevels,
      }),
    )
  } catch (err) {
    console.warn('Failed to save progress:', err)
  }
}

/**
 * Clear all saved progress
 */
export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('Failed to clear progress:', err)
  }
}
