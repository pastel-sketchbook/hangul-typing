/**
 * Hangul Typing - Game Application
 * Learn Korean typing by playing. Break levels. Master Hangul.
 * 
 * Uses hangul-wasm for authentic Korean IME composition with
 * a pure TypeScript fallback for environments where WASM is unavailable.
 */

import { createIme } from './hangul-ime-loader.js';

// IME instance (WASM or fallback)
let ime = null;
let imeType = 'unknown'; // 'wasm' or 'fallback'

// Game state
const state = {
    currentLevel: 1,
    unlockedLevels: [1],
    screen: 'level-select',
    keyboardLayout: '2-bulsik',
};

/**
 * 2-Bulsik Keyboard Layout - Maps physical keys to display jamo
 * Used for visual keyboard display (not IME processing)
 */
const KEYBOARD_DISPLAY = {
    // Row 1: QWERTYUIOP
    'q': { normal: 'ㅂ', shift: 'ㅃ' },
    'w': { normal: 'ㅈ', shift: 'ㅉ' },
    'e': { normal: 'ㄷ', shift: 'ㄸ' },
    'r': { normal: 'ㄱ', shift: 'ㄲ' },
    't': { normal: 'ㅅ', shift: 'ㅆ' },
    'y': { normal: 'ㅛ', shift: 'ㅛ' },
    'u': { normal: 'ㅕ', shift: 'ㅕ' },
    'i': { normal: 'ㅑ', shift: 'ㅑ' },
    'o': { normal: 'ㅐ', shift: 'ㅒ' },
    'p': { normal: 'ㅔ', shift: 'ㅖ' },
    
    // Row 2: ASDFGHJKL
    'a': { normal: 'ㅁ', shift: 'ㅁ' },
    's': { normal: 'ㄴ', shift: 'ㄴ' },
    'd': { normal: 'ㅇ', shift: 'ㅇ' },
    'f': { normal: 'ㄹ', shift: 'ㄹ' },
    'g': { normal: 'ㅎ', shift: 'ㅎ' },
    'h': { normal: 'ㅗ', shift: 'ㅗ' },
    'j': { normal: 'ㅓ', shift: 'ㅓ' },
    'k': { normal: 'ㅏ', shift: 'ㅏ' },
    'l': { normal: 'ㅣ', shift: 'ㅣ' },
    
    // Row 3: ZXCVBNM
    'z': { normal: 'ㅋ', shift: 'ㅋ' },
    'x': { normal: 'ㅌ', shift: 'ㅌ' },
    'c': { normal: 'ㅊ', shift: 'ㅊ' },
    'v': { normal: 'ㅍ', shift: 'ㅍ' },
    'b': { normal: 'ㅠ', shift: 'ㅠ' },
    'n': { normal: 'ㅜ', shift: 'ㅜ' },
    'm': { normal: 'ㅡ', shift: 'ㅡ' },
};

/**
 * Reverse mapping: Hangul jamo to physical key (for keyboard highlighting)
 */
const JAMO_TO_KEY = {};
for (const [key, mapping] of Object.entries(KEYBOARD_DISPLAY)) {
    JAMO_TO_KEY[mapping.normal] = { key, shift: false };
    if (mapping.shift !== mapping.normal) {
        JAMO_TO_KEY[mapping.shift] = { key, shift: true };
    }
}

// Level data
const levels = {
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
};

// DOM elements
const screens = {
    levelSelect: document.getElementById('level-select'),
    game: document.getElementById('game'),
    result: document.getElementById('result'),
};

const elements = {
    levelButtons: document.querySelectorAll('.level-btn'),
    backBtn: document.getElementById('back-btn'),
    levelDisplay: document.getElementById('level-display'),
    scoreDisplay: document.getElementById('score-display'),
    accuracyDisplay: document.getElementById('accuracy-display'),
    target: document.getElementById('target'),
    inputDisplay: document.getElementById('input-display'),
    feedback: document.getElementById('feedback'),
    progress: document.getElementById('progress'),
    resultTitle: document.getElementById('result-title'),
    stars: document.getElementById('stars'),
    finalAccuracy: document.getElementById('final-accuracy'),
    finalScore: document.getElementById('final-score'),
    retryBtn: document.getElementById('retry-btn'),
    nextBtn: document.getElementById('next-btn'),
    keyboard: document.getElementById('keyboard'),
    keys: document.querySelectorAll('.key[data-key]'),
};

// Game session state
let session = {
    level: 1,
    targets: [],
    currentIndex: 0,
    score: 0,
    correct: 0,
    total: 0,
    inputBuffer: '',  // Composed Hangul text
};

/**
 * Initialize the application
 */
async function init() {
    // Load and display version
    loadVersion();
    
    // Load saved progress
    loadProgress();
    
    // Load IME (WASM with TypeScript fallback)
    try {
        const result = await createIme({ debug: false });
        ime = result.ime;
        imeType = result.type;
        
        console.log(`Hangul IME loaded: ${imeType}`);
        updateImeStatus(imeType);
    } catch (err) {
        console.error('Failed to load IME:', err);
        updateImeStatus('none');
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Update UI
    updateLevelButtons();
    showScreen('level-select');
}

/**
 * Update IME status in footer
 */
function updateImeStatus(type) {
    const statusEl = document.getElementById('ime-status');
    if (!statusEl) return;
    
    if (type === 'wasm') {
        statusEl.textContent = 'IME: WASM';
        statusEl.title = 'Using hangul-wasm for Korean input';
    } else if (type === 'fallback') {
        statusEl.textContent = 'IME: JS';
        statusEl.title = 'Using TypeScript fallback for Korean input';
    } else {
        statusEl.textContent = 'IME: None';
        statusEl.title = 'Korean IME not available';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Level selection
    elements.levelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const level = parseInt(btn.dataset.level);
            if (state.unlockedLevels.includes(level)) {
                startLevel(level);
            }
        });
    });
    
    // Back button
    elements.backBtn.addEventListener('click', () => {
        if (ime) ime.reset();
        showScreen('level-select');
    });
    
    // Result buttons
    elements.retryBtn.addEventListener('click', () => {
        startLevel(session.level);
    });
    
    elements.nextBtn.addEventListener('click', () => {
        const nextLevel = session.level + 1;
        if (nextLevel <= 9 && state.unlockedLevels.includes(nextLevel)) {
            startLevel(nextLevel);
        } else {
            showScreen('level-select');
        }
    });
    
    // Keyboard input - use keydown for all handling
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keypress', handleKeyPress);
}

/**
 * Handle keydown events (for special keys)
 */
function handleKeyDown(e) {
    if (state.screen !== 'game') return;
    
    // Ignore modifier combos
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    // Handle backspace with IME
    if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
    }
    
    // Handle Enter to submit
    if (e.key === 'Enter') {
        e.preventDefault();
        submitInput();
        return;
    }
    
    // Handle Space - commit composition and add space (for multi-word targets)
    if (e.key === ' ') {
        if (ime && ime.hasComposition) {
            ime.reset();
        }
        // For single-char targets, space submits
        const target = session.targets[session.currentIndex];
        if (target.length === 1) {
            e.preventDefault();
            submitInput();
        } else {
            // For multi-word targets, add space to buffer
            session.inputBuffer += ' ';
            updateInputDisplay();
        }
        return;
    }
}

/**
 * Handle keypress events (for character input)
 */
function handleKeyPress(e) {
    if (state.screen !== 'game') return;
    
    // Ignore modifier combos
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    
    // Only handle single printable characters
    if (e.key.length !== 1) return;
    
    e.preventDefault();
    
    // Show key press feedback
    showKeyPress(e.key);
    
    // Process through IME if available
    if (ime) {
        processKeyWithIme(e.key);
    } else {
        // Fallback: just add the character directly
        session.inputBuffer += e.key;
        updateInputDisplay();
    }
    
    // Auto-submit for single characters (jamo levels)
    const target = session.targets[session.currentIndex];
    if (target.length === 1 && session.inputBuffer.length >= 1) {
        submitInput();
    }
}

/**
 * Process a key through the hangul-wasm IME
 */
function processKeyWithIme(char) {
    // Create a fake input field for IME to work with
    const fakeField = {
        value: session.inputBuffer,
        selectionStart: session.inputBuffer.length,
        selectionEnd: session.inputBuffer.length,
    };
    
    // Create a fake event
    const fakeEvent = { key: char };
    
    // Process through IME - it handles layout mapping internally
    const handled = ime.handleKeyPress(fakeEvent, fakeField);
    
    if (handled) {
        session.inputBuffer = fakeField.value;
        updateInputDisplay();
    } else {
        // IME didn't handle it (not a Korean key), add directly
        session.inputBuffer += char;
        updateInputDisplay();
    }
}

/**
 * Handle backspace with IME decomposition
 */
function handleBackspace() {
    if (!session.inputBuffer) return;
    
    if (ime && ime.hasComposition) {
        // Create fake field for IME
        const fakeField = {
            value: session.inputBuffer,
            selectionStart: session.inputBuffer.length,
            selectionEnd: session.inputBuffer.length,
        };
        
        const handled = ime.handleBackspace(fakeField);
        
        if (handled) {
            session.inputBuffer = fakeField.value;
            updateInputDisplay();
            return;
        }
    }
    
    // Fallback: simple character deletion
    session.inputBuffer = session.inputBuffer.slice(0, -1);
    updateInputDisplay();
}

/**
 * Start a level
 */
function startLevel(level) {
    // Reset IME state
    if (ime) ime.reset();
    
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
    showScreen('game');
}

/**
 * Generate targets for a level
 */
function generateTargets(level) {
    const levelData = levels[level];
    const targets = [];
    const count = 20;
    
    for (let i = 0; i < count; i++) {
        const char = levelData.chars[Math.floor(Math.random() * levelData.chars.length)];
        targets.push(char);
    }
    
    return targets;
}

/**
 * Submit current input
 */
function submitInput() {
    // Commit any pending IME composition
    if (ime && ime.hasComposition) {
        ime.reset();
    }
    
    const target = session.targets[session.currentIndex];
    const input = session.inputBuffer;
    
    session.total++;
    
    const isCorrect = input === target;
    if (isCorrect) {
        session.correct++;
        session.score += 10;
        showFeedback('Correct!', 'correct');
    } else {
        showFeedback(`Expected: ${target}`, 'incorrect');
    }
    
    // Clear input and advance
    session.inputBuffer = '';
    session.currentIndex++;
    
    // Check if level complete
    if (session.currentIndex >= session.targets.length) {
        completeLevel();
    } else {
        updateGameDisplay();
    }
}

/**
 * Complete the current level
 */
function completeLevel() {
    const accuracy = Math.round((session.correct / session.total) * 100);
    const threshold = levels[session.level].threshold;
    const passed = accuracy >= threshold;
    
    // Update result display
    elements.resultTitle.textContent = passed ? 'Level Complete!' : 'Try Again';
    elements.finalAccuracy.textContent = `${accuracy}%`;
    elements.finalScore.textContent = session.score;
    
    // Update stars
    const starElements = elements.stars.querySelectorAll('.star');
    starElements.forEach((star, i) => {
        if (i === 0 && accuracy >= threshold) {
            star.classList.add('active');
        } else if (i === 1 && accuracy >= 90) {
            star.classList.add('active');
        } else if (i === 2 && accuracy >= 95) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    
    // Unlock next level if passed
    if (passed && session.level < 9) {
        const nextLevel = session.level + 1;
        if (!state.unlockedLevels.includes(nextLevel)) {
            state.unlockedLevels.push(nextLevel);
            saveProgress();
            updateLevelButtons();
        }
    }
    
    // Show/hide next button
    elements.nextBtn.style.display = passed && session.level < 9 ? 'inline-block' : 'none';
    
    showScreen('result');
}

/**
 * Update the game display
 */
function updateGameDisplay() {
    const target = session.targets[session.currentIndex];
    const accuracy = session.total > 0 
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
    
    // Highlight keys for current target
    highlightKeysForTarget(target);
}

/**
 * Update input display
 */
function updateInputDisplay() {
    elements.inputDisplay.textContent = session.inputBuffer;
}

/**
 * Show feedback message
 */
function showFeedback(message, type) {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback ${type}`;
}

/**
 * Show a screen
 */
function showScreen(screenName) {
    state.screen = screenName;
    
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (screenName === 'level-select') {
        screens.levelSelect.classList.add('active');
    } else if (screenName === 'game') {
        screens.game.classList.add('active');
    } else if (screenName === 'result') {
        screens.result.classList.add('active');
    }
}

/**
 * Update level button states
 */
function updateLevelButtons() {
    elements.levelButtons.forEach(btn => {
        const level = parseInt(btn.dataset.level);
        if (state.unlockedLevels.includes(level)) {
            btn.classList.remove('locked');
        } else {
            btn.classList.add('locked');
        }
    });
}

/**
 * Load and display version from VERSION file
 */
async function loadVersion() {
    try {
        const response = await fetch('VERSION');
        if (response.ok) {
            const version = (await response.text()).trim();
            const versionText = `v${version}`;
            
            // Update all version tags
            const versionTags = [
                document.getElementById('version-tag'),
                document.getElementById('game-version-tag'),
            ];
            
            versionTags.forEach(tag => {
                if (tag) {
                    tag.textContent = versionText;
                }
            });
        }
    } catch (err) {
        console.warn('Failed to load version:', err);
    }
}

/**
 * Load saved progress from localStorage
 */
function loadProgress() {
    try {
        const saved = localStorage.getItem('hangul-typing-progress');
        if (saved) {
            const data = JSON.parse(saved);
            state.unlockedLevels = data.unlockedLevels || [1];
        }
    } catch (err) {
        console.warn('Failed to load progress:', err);
    }
}

/**
 * Save progress to localStorage
 */
function saveProgress() {
    try {
        localStorage.setItem('hangul-typing-progress', JSON.stringify({
            unlockedLevels: state.unlockedLevels,
        }));
    } catch (err) {
        console.warn('Failed to save progress:', err);
    }
}

// ===================
// Keyboard Highlighting
// ===================

/**
 * Highlight keys for the target character
 * Supports single jamo and composed syllables
 */
function highlightKeysForTarget(target) {
    // Clear all highlights
    clearKeyboardHighlights();
    
    if (!target) return;
    
    // For single jamo, highlight the key directly
    if (target.length === 1) {
        const jamo = target;
        highlightJamo(jamo);
    }
    // For composed syllables or words, we could decompose and show sequence
    // TODO: Use wasm_decompose to show key sequence for syllables
}

/**
 * Highlight a single jamo on the keyboard
 */
function highlightJamo(jamo) {
    const keyInfo = JAMO_TO_KEY[jamo];
    if (!keyInfo) return;
    
    const keyElement = document.querySelector(`.key[data-key="${keyInfo.key}"]`);
    if (keyElement) {
        if (keyInfo.shift) {
            keyElement.classList.add('highlight-shift');
            // Also highlight shift key
            const shiftKey = document.querySelector('.key[data-key="shift"]');
            if (shiftKey) {
                shiftKey.classList.add('highlight');
            }
        } else {
            keyElement.classList.add('highlight');
        }
    }
}

/**
 * Clear all keyboard highlights
 */
function clearKeyboardHighlights() {
    elements.keys.forEach(key => {
        key.classList.remove('highlight', 'highlight-shift', 'pressed');
    });
    const shiftKey = document.querySelector('.key[data-key="shift"]');
    if (shiftKey) {
        shiftKey.classList.remove('highlight', 'pressed');
    }
}

/**
 * Show key press feedback
 */
function showKeyPress(keyChar) {
    const keyElement = document.querySelector(`.key[data-key="${keyChar.toLowerCase()}"]`);
    if (keyElement) {
        keyElement.classList.add('pressed');
        setTimeout(() => {
            keyElement.classList.remove('pressed');
        }, 100);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
