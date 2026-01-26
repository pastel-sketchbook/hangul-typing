/**
 * UI management - DOM elements and screen transitions
 */

import { STAR_2_THRESHOLD, STAR_3_THRESHOLD } from './constants'
import type { Elements, ScreenName, Screens } from './types'

/**
 * Get screen elements from DOM
 */
export function getScreens(): Screens {
  return {
    levelSelect: document.getElementById('level-select') as HTMLElement,
    game: document.getElementById('game') as HTMLElement,
    result: document.getElementById('result') as HTMLElement,
  }
}

/**
 * Get all interactive elements from DOM
 */
export function getElements(): Elements {
  return {
    levelButtons: document.querySelectorAll('.level-btn') as NodeListOf<HTMLButtonElement>,
    backBtn: document.getElementById('back-btn') as HTMLButtonElement,
    levelDisplay: document.getElementById('level-display') as HTMLElement,
    scoreDisplay: document.getElementById('score-display') as HTMLElement,
    accuracyDisplay: document.getElementById('accuracy-display') as HTMLElement,
    target: document.getElementById('target') as HTMLElement,
    inputDisplay: document.getElementById('input-display') as HTMLElement,
    feedback: document.getElementById('feedback') as HTMLElement,
    progress: document.getElementById('progress') as HTMLElement,
    resultTitle: document.getElementById('result-title') as HTMLElement,
    stars: document.getElementById('stars') as HTMLElement,
    finalAccuracy: document.getElementById('final-accuracy') as HTMLElement,
    finalScore: document.getElementById('final-score') as HTMLElement,
    retryBtn: document.getElementById('retry-btn') as HTMLButtonElement,
    nextBtn: document.getElementById('next-btn') as HTMLButtonElement,
    keyboard: document.getElementById('keyboard') as HTMLElement,
    keys: document.querySelectorAll('.key[data-key]') as NodeListOf<HTMLElement>,
  }
}

/**
 * Show a specific screen, hiding others
 */
export function showScreen(screens: Screens, screenName: ScreenName): void {
  screens.levelSelect.classList.remove('active')
  screens.game.classList.remove('active')
  screens.result.classList.remove('active')

  switch (screenName) {
    case 'level-select':
      screens.levelSelect.classList.add('active')
      break
    case 'game':
      screens.game.classList.add('active')
      break
    case 'result':
      screens.result.classList.add('active')
      break
  }
}

/**
 * Update level button locked/unlocked states
 */
export function updateLevelButtons(buttons: NodeListOf<HTMLButtonElement>, unlockedLevels: number[]): void {
  for (const btn of buttons) {
    const level = Number.parseInt(btn.dataset.level ?? '0', 10)
    if (unlockedLevels.includes(level)) {
      btn.classList.remove('locked')
    } else {
      btn.classList.add('locked')
    }
  }
}

/**
 * Show feedback message
 */
export function showFeedback(feedbackEl: HTMLElement, message: string, type: 'correct' | 'incorrect'): void {
  feedbackEl.textContent = message
  feedbackEl.className = `feedback ${type}`
}

/**
 * Update IME status display in footer
 */
export function updateImeStatus(type: 'wasm' | 'fallback' | 'none'): void {
  const statusEl = document.getElementById('ime-status')
  if (!statusEl) return

  switch (type) {
    case 'wasm':
      statusEl.textContent = 'IME: WASM'
      statusEl.title = 'Using hangul.wasm for Korean input'
      break
    case 'fallback':
      statusEl.textContent = 'IME: JS'
      statusEl.title = 'Using TypeScript fallback for Korean input'
      break
    default:
      statusEl.textContent = 'IME: None'
      statusEl.title = 'Korean IME not available'
  }
}

/**
 * Load and display version from VERSION file
 */
export async function loadVersion(): Promise<void> {
  try {
    const response = await fetch('VERSION')
    if (response.ok) {
      const version = (await response.text()).trim()
      const versionTag = document.getElementById('version-tag')
      if (versionTag) versionTag.textContent = `v${version}`
    }
  } catch (err) {
    console.warn('Failed to load version:', err)
  }
}

/**
 * Hide loading screen and show app
 */
export function showApp(): void {
  const loadingEl = document.getElementById('loading')
  const appEl = document.getElementById('app')

  if (loadingEl) loadingEl.style.display = 'none'
  if (appEl) appEl.style.display = ''
}

/**
 * Update star display based on accuracy
 */
export function updateStars(starsEl: HTMLElement, accuracy: number, threshold: number): void {
  const starElements = starsEl.querySelectorAll('.star')

  for (let i = 0; i < starElements.length; i++) {
    const star = starElements[i]
    const shouldBeActive =
      (i === 0 && accuracy >= threshold) ||
      (i === 1 && accuracy >= STAR_2_THRESHOLD) ||
      (i === 2 && accuracy >= STAR_3_THRESHOLD)

    if (shouldBeActive) {
      star.classList.add('active')
    } else {
      star.classList.remove('active')
    }
  }
}
