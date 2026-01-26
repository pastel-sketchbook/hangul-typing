import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STAR_2_THRESHOLD, STAR_3_THRESHOLD } from './constants'
import type { Screens } from './types'
import {
  getElements,
  getScreens,
  loadVersion,
  showApp,
  showFeedback,
  showScreen,
  updateImeStatus,
  updateLevelButtons,
  updateStars,
} from './ui'

describe('ui', () => {
  describe('getScreens', () => {
    let levelSelect: HTMLElement
    let game: HTMLElement
    let result: HTMLElement

    beforeEach(() => {
      levelSelect = document.createElement('div')
      levelSelect.id = 'level-select'
      game = document.createElement('div')
      game.id = 'game'
      result = document.createElement('div')
      result.id = 'result'

      document.body.appendChild(levelSelect)
      document.body.appendChild(game)
      document.body.appendChild(result)
    })

    afterEach(() => {
      levelSelect.remove()
      game.remove()
      result.remove()
    })

    it('returns screen elements from DOM', () => {
      const screens = getScreens()

      expect(screens.levelSelect).toBe(levelSelect)
      expect(screens.game).toBe(game)
      expect(screens.result).toBe(result)
    })
  })

  describe('getElements', () => {
    let container: HTMLElement

    beforeEach(() => {
      container = document.createElement('div')

      // Create all required elements
      const elements = [
        { id: 'back-btn', tag: 'button' },
        { id: 'level-display', tag: 'div' },
        { id: 'score-display', tag: 'div' },
        { id: 'accuracy-display', tag: 'div' },
        { id: 'target', tag: 'div' },
        { id: 'input-display', tag: 'div' },
        { id: 'feedback', tag: 'div' },
        { id: 'progress', tag: 'div' },
        { id: 'result-title', tag: 'div' },
        { id: 'stars', tag: 'div' },
        { id: 'final-accuracy', tag: 'div' },
        { id: 'final-score', tag: 'div' },
        { id: 'retry-btn', tag: 'button' },
        { id: 'next-btn', tag: 'button' },
        { id: 'keyboard', tag: 'div' },
      ]

      for (const { id, tag } of elements) {
        const el = document.createElement(tag)
        el.id = id
        container.appendChild(el)
      }

      // Add level buttons
      const levelBtn = document.createElement('button')
      levelBtn.className = 'level-btn'
      container.appendChild(levelBtn)

      // Add keyboard keys
      const key = document.createElement('div')
      key.className = 'key'
      key.dataset.key = 'a'
      container.appendChild(key)

      document.body.appendChild(container)
    })

    afterEach(() => {
      container.remove()
    })

    it('returns all interactive elements from DOM', () => {
      const elements = getElements()

      expect(elements.backBtn).toBe(document.getElementById('back-btn'))
      expect(elements.levelDisplay).toBe(document.getElementById('level-display'))
      expect(elements.scoreDisplay).toBe(document.getElementById('score-display'))
      expect(elements.target).toBe(document.getElementById('target'))
      expect(elements.feedback).toBe(document.getElementById('feedback'))
      expect(elements.keyboard).toBe(document.getElementById('keyboard'))
    })

    it('returns NodeList of level buttons', () => {
      const elements = getElements()

      expect(elements.levelButtons.length).toBeGreaterThan(0)
      expect(elements.levelButtons[0].classList.contains('level-btn')).toBe(true)
    })

    it('returns NodeList of keyboard keys', () => {
      const elements = getElements()

      expect(elements.keys.length).toBeGreaterThan(0)
      expect(elements.keys[0].dataset.key).toBe('a')
    })
  })

  describe('loadVersion', () => {
    let versionTag: HTMLElement

    beforeEach(() => {
      versionTag = document.createElement('span')
      versionTag.id = 'version-tag'
      document.body.appendChild(versionTag)
    })

    afterEach(() => {
      versionTag.remove()
      vi.restoreAllMocks()
    })

    it('loads version from VERSION file and displays it', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('1.2.3\n'),
      } as Response)

      await loadVersion()

      expect(versionTag.textContent).toBe('v1.2.3')
    })

    it('trims whitespace from version string', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('  0.4.1  \n'),
      } as Response)

      await loadVersion()

      expect(versionTag.textContent).toBe('v0.4.1')
    })

    it('handles fetch failure gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

      await loadVersion()

      expect(warnSpy).toHaveBeenCalledWith('Failed to load version:', expect.any(Error))
    })

    it('handles non-ok response gracefully', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
      } as Response)

      await loadVersion()

      expect(versionTag.textContent).toBe('')
    })

    it('handles missing version-tag element gracefully', async () => {
      versionTag.remove()
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('1.0.0'),
      } as Response)

      // Should not throw
      await expect(loadVersion()).resolves.not.toThrow()
    })
  })

  describe('showApp', () => {
    let loadingEl: HTMLElement
    let appEl: HTMLElement

    beforeEach(() => {
      loadingEl = document.createElement('div')
      loadingEl.id = 'loading'
      loadingEl.style.display = 'block'

      appEl = document.createElement('div')
      appEl.id = 'app'
      appEl.style.display = 'none'

      document.body.appendChild(loadingEl)
      document.body.appendChild(appEl)
    })

    afterEach(() => {
      loadingEl.remove()
      appEl.remove()
    })

    it('hides loading element', () => {
      showApp()

      expect(loadingEl.style.display).toBe('none')
    })

    it('shows app element', () => {
      showApp()

      expect(appEl.style.display).toBe('')
    })

    it('handles missing loading element gracefully', () => {
      loadingEl.remove()

      // Should not throw
      expect(() => showApp()).not.toThrow()
      expect(appEl.style.display).toBe('')
    })

    it('handles missing app element gracefully', () => {
      appEl.remove()

      // Should not throw
      expect(() => showApp()).not.toThrow()
      expect(loadingEl.style.display).toBe('none')
    })
  })

  describe('showScreen', () => {
    let screens: Screens

    beforeEach(() => {
      screens = {
        levelSelect: document.createElement('div'),
        game: document.createElement('div'),
        result: document.createElement('div'),
      }
    })

    it('shows level-select screen and hides others', () => {
      showScreen(screens, 'level-select')

      expect(screens.levelSelect.classList.contains('active')).toBe(true)
      expect(screens.game.classList.contains('active')).toBe(false)
      expect(screens.result.classList.contains('active')).toBe(false)
    })

    it('shows game screen and hides others', () => {
      showScreen(screens, 'game')

      expect(screens.levelSelect.classList.contains('active')).toBe(false)
      expect(screens.game.classList.contains('active')).toBe(true)
      expect(screens.result.classList.contains('active')).toBe(false)
    })

    it('shows result screen and hides others', () => {
      showScreen(screens, 'result')

      expect(screens.levelSelect.classList.contains('active')).toBe(false)
      expect(screens.game.classList.contains('active')).toBe(false)
      expect(screens.result.classList.contains('active')).toBe(true)
    })

    it('removes active class from previously active screen', () => {
      screens.game.classList.add('active')

      showScreen(screens, 'level-select')

      expect(screens.game.classList.contains('active')).toBe(false)
      expect(screens.levelSelect.classList.contains('active')).toBe(true)
    })
  })

  describe('updateLevelButtons', () => {
    it('unlocks levels in the unlockedLevels array', () => {
      const btn1 = document.createElement('button')
      const btn2 = document.createElement('button')
      const btn3 = document.createElement('button')

      btn1.dataset.level = '1'
      btn2.dataset.level = '2'
      btn3.dataset.level = '3'

      btn2.classList.add('locked')
      btn3.classList.add('locked')

      const buttons = [btn1, btn2, btn3] as unknown as NodeListOf<HTMLButtonElement>

      updateLevelButtons(buttons, [1, 2])

      expect(btn1.classList.contains('locked')).toBe(false)
      expect(btn2.classList.contains('locked')).toBe(false)
      expect(btn3.classList.contains('locked')).toBe(true)
    })

    it('locks levels not in unlockedLevels array', () => {
      const btn1 = document.createElement('button')
      btn1.dataset.level = '1'

      const buttons = [btn1] as unknown as NodeListOf<HTMLButtonElement>

      updateLevelButtons(buttons, [])

      expect(btn1.classList.contains('locked')).toBe(true)
    })
  })

  describe('showFeedback', () => {
    it('sets correct feedback message and class', () => {
      const feedbackEl = document.createElement('div')

      showFeedback(feedbackEl, 'Correct!', 'correct')

      expect(feedbackEl.textContent).toBe('Correct!')
      expect(feedbackEl.className).toBe('feedback correct')
    })

    it('sets incorrect feedback message and class', () => {
      const feedbackEl = document.createElement('div')

      showFeedback(feedbackEl, 'Expected: 가', 'incorrect')

      expect(feedbackEl.textContent).toBe('Expected: 가')
      expect(feedbackEl.className).toBe('feedback incorrect')
    })
  })

  describe('updateImeStatus', () => {
    let statusEl: HTMLElement

    beforeEach(() => {
      statusEl = document.createElement('div')
      statusEl.id = 'ime-status'
      document.body.appendChild(statusEl)
    })

    afterEach(() => {
      statusEl.remove()
    })

    it('shows WASM status', () => {
      updateImeStatus('wasm')

      expect(statusEl.textContent).toBe('IME: WASM')
      expect(statusEl.title).toBe('Using hangul.wasm for Korean input')
    })

    it('shows fallback status', () => {
      updateImeStatus('fallback')

      expect(statusEl.textContent).toBe('IME: JS')
      expect(statusEl.title).toBe('Using TypeScript fallback for Korean input')
    })

    it('shows none status', () => {
      updateImeStatus('none')

      expect(statusEl.textContent).toBe('IME: None')
      expect(statusEl.title).toBe('Korean IME not available')
    })
  })

  describe('updateStars', () => {
    let starsEl: HTMLElement
    let star1: HTMLElement
    let star2: HTMLElement
    let star3: HTMLElement

    beforeEach(() => {
      starsEl = document.createElement('div')
      star1 = document.createElement('span')
      star2 = document.createElement('span')
      star3 = document.createElement('span')

      star1.className = 'star'
      star2.className = 'star'
      star3.className = 'star'

      starsEl.appendChild(star1)
      starsEl.appendChild(star2)
      starsEl.appendChild(star3)
    })

    it('shows no stars when accuracy below threshold', () => {
      updateStars(starsEl, 50, 80)

      expect(star1.classList.contains('active')).toBe(false)
      expect(star2.classList.contains('active')).toBe(false)
      expect(star3.classList.contains('active')).toBe(false)
    })

    it('shows 1 star when accuracy meets threshold but below STAR_2_THRESHOLD', () => {
      updateStars(starsEl, 80, 80)

      expect(star1.classList.contains('active')).toBe(true)
      expect(star2.classList.contains('active')).toBe(false)
      expect(star3.classList.contains('active')).toBe(false)
    })

    it('shows 2 stars when accuracy >= STAR_2_THRESHOLD but below STAR_3_THRESHOLD', () => {
      updateStars(starsEl, STAR_2_THRESHOLD, 80)

      expect(star1.classList.contains('active')).toBe(true)
      expect(star2.classList.contains('active')).toBe(true)
      expect(star3.classList.contains('active')).toBe(false)
    })

    it('shows 3 stars when accuracy >= STAR_3_THRESHOLD', () => {
      updateStars(starsEl, STAR_3_THRESHOLD, 80)

      expect(star1.classList.contains('active')).toBe(true)
      expect(star2.classList.contains('active')).toBe(true)
      expect(star3.classList.contains('active')).toBe(true)
    })

    it('shows all 3 stars at 100% accuracy', () => {
      updateStars(starsEl, 100, 80)

      expect(star1.classList.contains('active')).toBe(true)
      expect(star2.classList.contains('active')).toBe(true)
      expect(star3.classList.contains('active')).toBe(true)
    })

    it('removes active class from previously active stars', () => {
      star1.classList.add('active')
      star2.classList.add('active')
      star3.classList.add('active')

      updateStars(starsEl, 50, 80)

      expect(star1.classList.contains('active')).toBe(false)
      expect(star2.classList.contains('active')).toBe(false)
      expect(star3.classList.contains('active')).toBe(false)
    })
  })
})
