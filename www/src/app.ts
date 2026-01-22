/**
 * Hangul Typing - Game Application
 * Learn Korean typing by playing. Break levels. Master Hangul.
 *
 * Uses hangul.wasm for authentic Korean IME composition with
 * a pure TypeScript fallback for environments where WASM is unavailable.
 */

import { type IHangulIme, createIme } from './hangul-ime-loader';
import { KeyboardHighlighter } from './keyboard';
import { LEVEL_COUNT, generateTargets, getLevelThreshold } from './levels';
import { loadProgress, saveProgress } from './storage';
import { closeSplashAfterDelay } from './tauri';
import type {
  Elements,
  GameSession,
  GameState,
  ScreenName,
  Screens,
} from './types';
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
} from './ui';

// ===================
// Application State
// ===================

let ime: IHangulIme | null = null;
let screens: Screens;
let elements: Elements;
let keyboard: KeyboardHighlighter;

const state: GameState = {
  currentLevel: 1,
  unlockedLevels: [1],
  screen: 'level-select',
  keyboardLayout: '2-bulsik',
};

let session: GameSession = {
  level: 1,
  targets: [],
  currentIndex: 0,
  score: 0,
  correct: 0,
  total: 0,
  inputBuffer: '',
};

// ===================
// Initialization
// ===================

async function init(): Promise<void> {
  const splashMinTime = 3000;
  const splashStart = Date.now();

  // Get DOM references
  screens = getScreens();
  elements = getElements();
  keyboard = new KeyboardHighlighter(elements.keys);

  // Load version and progress
  loadVersion();
  state.unlockedLevels = loadProgress();

  // Load IME (WASM with TypeScript fallback)
  await initIme();

  // Setup event listeners
  setupEventListeners();

  // Update UI
  updateLevelButtons(elements.levelButtons, state.unlockedLevels);
  setScreen('level-select');

  // Show app
  showApp();

  // Close Tauri splash after delay
  closeSplashAfterDelay(splashStart, splashMinTime);
}

async function initIme(): Promise<void> {
  try {
    const result = await createIme({ debug: false });
    ime = result.ime;
    console.log(`Hangul IME loaded: ${result.type}`);
    updateImeStatus(result.type);
  } catch (err) {
    console.error('Failed to load IME:', err);
    updateImeStatus('none');
  }
}

// ===================
// Event Listeners
// ===================

function setupEventListeners(): void {
  // Level selection
  for (const btn of elements.levelButtons) {
    btn.addEventListener('click', () => {
      const level = Number.parseInt(btn.dataset.level ?? '0');
      if (state.unlockedLevels.includes(level)) {
        startLevel(level);
      }
    });
  }

  // Navigation buttons
  elements.backBtn.addEventListener('click', () => {
    ime?.reset();
    setScreen('level-select');
  });

  elements.retryBtn.addEventListener('click', () => {
    startLevel(session.level);
  });

  elements.nextBtn.addEventListener('click', () => {
    const nextLevel = session.level + 1;
    if (nextLevel <= LEVEL_COUNT && state.unlockedLevels.includes(nextLevel)) {
      startLevel(nextLevel);
    } else {
      setScreen('level-select');
    }
  });

  // Keyboard input
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keypress', handleKeyPress);
}

// ===================
// Input Handling
// ===================

function handleKeyDown(e: KeyboardEvent): void {
  if (state.screen !== 'game') return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  if (e.key === 'Backspace') {
    e.preventDefault();
    handleBackspace();
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    submitInput();
    return;
  }

  if (e.key === ' ') {
    if (ime?.hasComposition) {
      ime.reset();
    }
    const target = session.targets[session.currentIndex];
    if (target.length === 1) {
      e.preventDefault();
      submitInput();
    } else {
      session.inputBuffer += ' ';
      elements.inputDisplay.textContent = session.inputBuffer;
    }
  }
}

function handleKeyPress(e: KeyboardEvent): void {
  if (state.screen !== 'game') return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.key.length !== 1) return;

  e.preventDefault();
  keyboard.showKeyPress(e.key);

  if (ime) {
    processKeyWithIme(e.key);
  } else {
    session.inputBuffer += e.key;
    elements.inputDisplay.textContent = session.inputBuffer;
  }

  // Auto-submit for single characters
  const target = session.targets[session.currentIndex];
  if (target.length === 1 && session.inputBuffer.length >= 1) {
    submitInput();
  }
}

function processKeyWithIme(char: string): void {
  if (!ime) return;

  const fakeField = {
    value: session.inputBuffer,
    selectionStart: session.inputBuffer.length,
    selectionEnd: session.inputBuffer.length,
  };

  const handled = ime.handleKeyPress({ key: char }, fakeField);

  if (handled) {
    session.inputBuffer = fakeField.value;
  } else {
    session.inputBuffer += char;
  }
  elements.inputDisplay.textContent = session.inputBuffer;
}

function handleBackspace(): void {
  if (!session.inputBuffer) return;

  if (ime?.hasComposition) {
    const fakeField = {
      value: session.inputBuffer,
      selectionStart: session.inputBuffer.length,
      selectionEnd: session.inputBuffer.length,
    };

    if (ime.handleBackspace(fakeField)) {
      session.inputBuffer = fakeField.value;
      elements.inputDisplay.textContent = session.inputBuffer;
      return;
    }
  }

  session.inputBuffer = session.inputBuffer.slice(0, -1);
  elements.inputDisplay.textContent = session.inputBuffer;
}

// ===================
// Game Logic
// ===================

function startLevel(level: number): void {
  ime?.reset();

  session = {
    level,
    targets: generateTargets(level),
    currentIndex: 0,
    score: 0,
    correct: 0,
    total: 0,
    inputBuffer: '',
  };

  updateGameDisplay();
  setScreen('game');
}

function submitInput(): void {
  if (ime?.hasComposition) {
    ime.reset();
  }

  const target = session.targets[session.currentIndex];
  const input = session.inputBuffer;

  session.total++;

  if (input === target) {
    session.correct++;
    session.score += 10;
    showFeedback(elements.feedback, 'Correct!', 'correct');
  } else {
    showFeedback(elements.feedback, `Expected: ${target}`, 'incorrect');
  }

  session.inputBuffer = '';
  session.currentIndex++;

  if (session.currentIndex >= session.targets.length) {
    completeLevel();
  } else {
    updateGameDisplay();
  }
}

function completeLevel(): void {
  const accuracy = Math.round((session.correct / session.total) * 100);
  const threshold = getLevelThreshold(session.level);
  const passed = accuracy >= threshold;

  // Update result display
  elements.resultTitle.textContent = passed ? 'Level Complete!' : 'Try Again';
  elements.finalAccuracy.textContent = `${accuracy}%`;
  elements.finalScore.textContent = String(session.score);

  // Update stars
  updateStars(elements.stars, accuracy, threshold);

  // Unlock next level if passed
  if (passed && session.level < LEVEL_COUNT) {
    const nextLevel = session.level + 1;
    if (!state.unlockedLevels.includes(nextLevel)) {
      state.unlockedLevels.push(nextLevel);
      saveProgress(state.unlockedLevels);
      updateLevelButtons(elements.levelButtons, state.unlockedLevels);
    }
  }

  // Show/hide next button
  elements.nextBtn.style.display =
    passed && session.level < LEVEL_COUNT ? 'inline-block' : 'none';

  setScreen('result');
}

// ===================
// Display Updates
// ===================

function updateGameDisplay(): void {
  const target = session.targets[session.currentIndex];
  const accuracy =
    session.total > 0
      ? Math.round((session.correct / session.total) * 100)
      : 100;
  const progress = (session.currentIndex / session.targets.length) * 100;

  elements.levelDisplay.textContent = `Level ${session.level}`;
  elements.scoreDisplay.textContent = `Score: ${session.score}`;
  elements.accuracyDisplay.textContent = `${accuracy}%`;
  elements.target.textContent = target;
  elements.inputDisplay.textContent = session.inputBuffer;
  elements.progress.style.width = `${progress}%`;
  elements.feedback.textContent = '';
  elements.feedback.className = 'feedback';

  keyboard.highlightForTarget(target);
}

function setScreen(screenName: ScreenName): void {
  state.screen = screenName;
  showScreen(screens, screenName);
}

// ===================
// Start Application
// ===================

document.addEventListener('DOMContentLoaded', init);
