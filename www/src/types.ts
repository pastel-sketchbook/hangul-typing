/**
 * Shared type definitions for Hangul Typing
 */

/** Screen names for navigation */
export type ScreenName = 'level-select' | 'game' | 'result';

/** Global game state */
export interface GameState {
  currentLevel: number;
  unlockedLevels: number[];
  screen: ScreenName;
  keyboardLayout: string;
}

/** Level definition */
export interface LevelData {
  name: string;
  chars: string[];
  threshold: number;
}

/** Active game session */
export interface GameSession {
  level: number;
  targets: string[];
  currentIndex: number;
  score: number;
  correct: number;
  total: number;
  inputBuffer: string;
}

/** Keyboard key mapping (normal and shift variants) */
export interface KeyMapping {
  normal: string;
  shift: string;
}

/** Jamo to physical key info */
export interface JamoKeyInfo {
  key: string;
  shift: boolean;
}

/** DOM screen elements */
export interface Screens {
  levelSelect: HTMLElement;
  game: HTMLElement;
  result: HTMLElement;
}

/** DOM element references */
export interface Elements {
  levelButtons: NodeListOf<HTMLButtonElement>;
  backBtn: HTMLButtonElement;
  levelDisplay: HTMLElement;
  scoreDisplay: HTMLElement;
  accuracyDisplay: HTMLElement;
  target: HTMLElement;
  inputDisplay: HTMLElement;
  feedback: HTMLElement;
  progress: HTMLElement;
  resultTitle: HTMLElement;
  stars: HTMLElement;
  finalAccuracy: HTMLElement;
  finalScore: HTMLElement;
  retryBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  keyboard: HTMLElement;
  keys: NodeListOf<HTMLElement>;
}

/** Saved progress data structure */
export interface SavedProgress {
  unlockedLevels?: number[];
}
