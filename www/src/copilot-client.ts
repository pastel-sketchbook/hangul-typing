/**
 * Copilot AI assistant client for Tauri backend
 *
 * This module conditionally enables Copilot features based on whether
 * GitHub Copilot CLI is installed and authenticated on the user's machine.
 */

import { isTauri } from './tauri';

/** Response wrapper from backend */
interface CommandResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** Copilot service status */
export interface CopilotStatus {
  available: boolean;
  running: boolean;
  cli_installed: boolean;
  cli_authenticated: boolean;
  message: string;
}

/** Learning context for personalized responses */
export interface LearningContext {
  current_level: number;
  current_target: string | null;
  recent_mistakes: string[];
  accuracy: number;
  total_attempts: number;
}

/** Response from the AI assistant */
export interface AssistantResponse {
  content: string;
  tool_used: string | null;
}

/** Tauri invoke interface with args support */
interface TauriInternals {
  invoke?: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

/** Default unavailable status for non-Tauri environments */
const UNAVAILABLE_STATUS: CopilotStatus = {
  available: false,
  running: false,
  cli_installed: false,
  cli_authenticated: false,
  message: 'AI assistant requires the desktop app',
};

/**
 * Invoke a Tauri command with arguments
 */
async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as TauriInternals | undefined;

  if (!internals?.invoke) {
    throw new Error('Not running in Tauri');
  }

  return internals.invoke<T>(command, args);
}

/**
 * Copilot client for interacting with the AI assistant
 *
 * Features are conditionally enabled based on:
 * 1. Running inside Tauri desktop app
 * 2. GitHub Copilot CLI installed
 * 3. GitHub CLI authenticated
 */
export class CopilotClient {
  private initialized = false;
  private available = false;
  private lastStatus: CopilotStatus = UNAVAILABLE_STATUS;

  /**
   * Check if Copilot features are available
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Get the last known status
   */
  getLastStatus(): CopilotStatus {
    return this.lastStatus;
  }

  /**
   * Initialize the Copilot service
   * Returns status indicating whether the feature is available
   */
  async init(): Promise<CopilotStatus> {
    if (!isTauri()) {
      this.lastStatus = UNAVAILABLE_STATUS;
      return this.lastStatus;
    }

    try {
      const response =
        await invoke<CommandResponse<CopilotStatus>>('copilot_init');

      if (response.success && response.data) {
        this.initialized = true;
        this.available = response.data.available;
        this.lastStatus = response.data;
        return response.data;
      }

      this.lastStatus = {
        ...UNAVAILABLE_STATUS,
        message: response.error ?? 'Unknown error',
      };
      return this.lastStatus;
    } catch (error) {
      console.error('Failed to initialize Copilot:', error);
      this.lastStatus = {
        ...UNAVAILABLE_STATUS,
        message:
          error instanceof Error ? error.message : 'Failed to initialize',
      };
      return this.lastStatus;
    }
  }

  /**
   * Get current Copilot status
   */
  async getStatus(): Promise<CopilotStatus> {
    if (!isTauri()) {
      return UNAVAILABLE_STATUS;
    }

    try {
      const response =
        await invoke<CommandResponse<CopilotStatus>>('copilot_status');

      if (response.success && response.data) {
        this.available = response.data.available;
        this.lastStatus = response.data;
        return response.data;
      }

      return {
        ...UNAVAILABLE_STATUS,
        message: response.error ?? 'Unknown error',
      };
    } catch (error) {
      return {
        ...UNAVAILABLE_STATUS,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ask a general question to the AI assistant
   */
  async ask(
    prompt: string,
    context?: LearningContext,
  ): Promise<AssistantResponse | null> {
    if (!this.available) {
      console.warn('Copilot not available');
      return null;
    }

    try {
      const response = await invoke<CommandResponse<AssistantResponse>>(
        'copilot_ask',
        { prompt, context: context ?? null },
      );

      if (response.success && response.data) {
        return response.data;
      }

      console.error('Copilot ask failed:', response.error);
      return null;
    } catch (error) {
      console.error('Copilot ask error:', error);
      return null;
    }
  }

  /**
   * Get a hint for the current typing target
   */
  async getHint(
    target: string,
    userInput: string,
    level: number,
  ): Promise<AssistantResponse | null> {
    if (!this.available) {
      return null;
    }

    try {
      const response = await invoke<CommandResponse<AssistantResponse>>(
        'copilot_hint',
        { target, user_input: userInput, level },
      );

      if (response.success && response.data) {
        return response.data;
      }

      console.error('Copilot hint failed:', response.error);
      return null;
    } catch (error) {
      console.error('Copilot hint error:', error);
      return null;
    }
  }

  /**
   * Explain a Korean character or word
   */
  async explain(text: string): Promise<AssistantResponse | null> {
    if (!this.available) {
      return null;
    }

    try {
      const response = await invoke<CommandResponse<AssistantResponse>>(
        'copilot_explain',
        { text },
      );

      if (response.success && response.data) {
        return response.data;
      }

      console.error('Copilot explain failed:', response.error);
      return null;
    } catch (error) {
      console.error('Copilot explain error:', error);
      return null;
    }
  }

  /**
   * Analyze a typing mistake
   */
  async analyzeMistake(
    expected: string,
    actual: string,
  ): Promise<AssistantResponse | null> {
    if (!this.available) {
      return null;
    }

    try {
      const response = await invoke<CommandResponse<AssistantResponse>>(
        'copilot_analyze_mistake',
        { expected, actual },
      );

      if (response.success && response.data) {
        return response.data;
      }

      console.error('Copilot analyze mistake failed:', response.error);
      return null;
    } catch (error) {
      console.error('Copilot analyze mistake error:', error);
      return null;
    }
  }

  /**
   * Shutdown the Copilot service
   */
  async shutdown(): Promise<void> {
    if (!isTauri() || !this.initialized) {
      return;
    }

    try {
      await invoke<CommandResponse<void>>('copilot_shutdown');
      this.available = false;
      this.initialized = false;
    } catch (error) {
      console.error('Copilot shutdown error:', error);
    }
  }
}

// Singleton instance
let copilotClient: CopilotClient | null = null;

/**
 * Get the global Copilot client instance
 */
export function getCopilotClient(): CopilotClient {
  if (!copilotClient) {
    copilotClient = new CopilotClient();
  }
  return copilotClient;
}
