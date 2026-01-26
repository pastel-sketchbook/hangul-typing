/**
 * Tauri desktop app integration utilities
 */

/** Tauri internal invoke interface */
interface TauriInternals {
  invoke?: (cmd: string) => Promise<void>
}

/**
 * Check if running inside Tauri
 */
export function isTauri(): boolean {
  return '__TAURI_INTERNALS__' in window
}

/**
 * Invoke a Tauri command
 */
export async function tauriInvoke(command: string): Promise<void> {
  const internals = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ as TauriInternals | undefined

  if (internals?.invoke) {
    await internals.invoke(command)
  }
}

/**
 * Close the Tauri splash screen after minimum display time
 */
export function closeSplashAfterDelay(splashStart: number, minTime: number): void {
  if (!isTauri()) return

  const elapsed = Date.now() - splashStart
  const remaining = Math.max(0, minTime - elapsed)

  setTimeout(async () => {
    try {
      await tauriInvoke('close_splash')
    } catch (_e) {
      console.log('Not running in Tauri or splash already closed')
    }
  }, remaining)
}
