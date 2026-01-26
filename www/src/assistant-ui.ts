/**
 * AI Assistant UI module for the Hangul Typing trainer
 */

import {
  type AssistantResponse,
  type LearningContext,
  getCopilotClient,
} from './copilot-client';

/** DOM element references */
interface AssistantElements {
  panel: HTMLElement;
  toggle: HTMLButtonElement;
  close: HTMLButtonElement;
  messages: HTMLElement;
  input: HTMLInputElement;
  send: HTMLButtonElement;
  status: HTMLElement;
}

/** Current game state for context */
interface GameContext {
  currentLevel: number;
  currentTarget: string;
  userInput: string;
  recentMistakes: string[];
  accuracy: number;
  totalAttempts: number;
}

let elements: AssistantElements | null = null;
let gameContext: GameContext = {
  currentLevel: 1,
  currentTarget: '',
  userInput: '',
  recentMistakes: [],
  accuracy: 1.0,
  totalAttempts: 0,
};
let isLoading = false;

/**
 * Initialize the assistant UI
 */
export async function initAssistant(): Promise<boolean> {
  // Get DOM elements
  const panel = document.getElementById('assistant-panel');
  const toggle = document.getElementById(
    'assistant-toggle',
  ) as HTMLButtonElement;
  const close = document.getElementById('assistant-close') as HTMLButtonElement;
  const messages = document.getElementById('assistant-messages');
  const input = document.getElementById('assistant-input') as HTMLInputElement;
  const send = document.getElementById('assistant-send') as HTMLButtonElement;
  const status = document.getElementById('assistant-status');

  if (!panel || !toggle || !close || !messages || !input || !send || !status) {
    console.warn('Assistant UI elements not found');
    return false;
  }

  elements = { panel, toggle, close, messages, input, send, status };

  // Initialize Copilot client
  const client = getCopilotClient();
  const copilotStatus = await client.init();

  if (!copilotStatus.available) {
    setStatus(copilotStatus.message, true);
    // Still show UI but with limited functionality
  } else {
    setStatus('');
  }

  // Show toggle button if Copilot is available
  if (copilotStatus.available) {
    toggle.classList.remove('hidden');
  }

  // Set up event listeners
  setupEventListeners();

  return copilotStatus.available;
}

/**
 * Set up event listeners for the assistant UI
 */
function setupEventListeners(): void {
  if (!elements) return;

  // Toggle panel visibility
  elements.toggle.addEventListener('click', () => {
    showPanel();
  });

  elements.close.addEventListener('click', () => {
    hidePanel();
  });

  // Send message on button click
  elements.send.addEventListener('click', () => {
    sendMessage();
  });

  // Send message on Enter key
  elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Quick action buttons
  elements.messages.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const quickAction = target.closest('.quick-action') as HTMLButtonElement;
    if (quickAction) {
      handleQuickAction(quickAction.dataset.action ?? '');
    }
  });

  // Global keyboard shortcut (? to toggle)
  document.addEventListener('keydown', (e) => {
    // Only trigger on ? key when not in input fields
    if (
      e.key === '?' &&
      !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
    ) {
      e.preventDefault();
      togglePanel();
    }
  });
}

/**
 * Show the assistant panel
 */
export function showPanel(): void {
  if (!elements) return;
  elements.panel.classList.remove('hidden');
  elements.toggle.classList.add('hidden');
  elements.input.focus();
}

/**
 * Hide the assistant panel
 */
export function hidePanel(): void {
  if (!elements) return;
  elements.panel.classList.add('hidden');
  elements.toggle.classList.remove('hidden');
}

/**
 * Toggle panel visibility
 */
export function togglePanel(): void {
  if (!elements) return;
  if (elements.panel.classList.contains('hidden')) {
    showPanel();
  } else {
    hidePanel();
  }
}

/**
 * Update the game context
 */
export function updateContext(context: Partial<GameContext>): void {
  gameContext = { ...gameContext, ...context };
}

/**
 * Record a mistake for context
 */
export function recordMistake(expected: string, actual: string): void {
  gameContext.recentMistakes = [
    `${expected}→${actual}`,
    ...gameContext.recentMistakes.slice(0, 4),
  ];
}

/**
 * Send a message to the assistant
 */
async function sendMessage(): Promise<void> {
  if (!elements || isLoading) return;

  const message = elements.input.value.trim();
  if (!message) return;

  elements.input.value = '';
  addMessage(message, 'user');
  await askAssistant(message);
}

/**
 * Handle quick action buttons
 */
async function handleQuickAction(action: string): Promise<void> {
  if (isLoading) return;

  const client = getCopilotClient();

  switch (action) {
    case 'explain-target':
      if (gameContext.currentTarget) {
        addMessage(`Explain "${gameContext.currentTarget}"`, 'user');
        const response = await client.explain(gameContext.currentTarget);
        if (response) {
          addMessage(response.content, 'assistant');
        } else {
          addMessage(
            'Sorry, I could not get an explanation right now.',
            'assistant',
            true,
          );
        }
      } else {
        addMessage('Start a level first to get explanations!', 'assistant');
      }
      break;

    case 'get-hint':
      if (gameContext.currentTarget) {
        addMessage('Give me a hint', 'user');
        const hint = await client.getHint(
          gameContext.currentTarget,
          gameContext.userInput,
          gameContext.currentLevel,
        );
        if (hint) {
          addMessage(hint.content, 'assistant');
        } else {
          addMessage(
            'Sorry, I could not get a hint right now.',
            'assistant',
            true,
          );
        }
      } else {
        addMessage('Start a level first to get hints!', 'assistant');
      }
      break;

    case 'how-to-type':
      if (gameContext.currentTarget) {
        addMessage(`How do I type "${gameContext.currentTarget}"?`, 'user');
        const response = await client.ask(
          `Show me exactly which keys to press to type "${gameContext.currentTarget}" on a 2-Bulsik keyboard. Be specific about the order.`,
        );
        if (response) {
          addMessage(response.content, 'assistant');
        } else {
          addMessage(
            'Sorry, I could not get the typing sequence right now.',
            'assistant',
            true,
          );
        }
      } else {
        addMessage('Start a level first!', 'assistant');
      }
      break;

    default:
      console.warn('Unknown quick action:', action);
  }
}

/**
 * Ask the assistant a question
 */
async function askAssistant(prompt: string): Promise<void> {
  const client = getCopilotClient();

  if (!client.isAvailable()) {
    addMessage(
      'AI assistant is not available. Make sure GitHub Copilot CLI is installed.',
      'assistant',
      true,
    );
    return;
  }

  setLoading(true);

  const context: LearningContext = {
    current_level: gameContext.currentLevel,
    current_target: gameContext.currentTarget || null,
    recent_mistakes: gameContext.recentMistakes,
    accuracy: gameContext.accuracy,
    total_attempts: gameContext.totalAttempts,
  };

  const response = await client.ask(prompt, context);

  setLoading(false);

  if (response) {
    addMessage(response.content, 'assistant');
  } else {
    addMessage(
      'Sorry, I encountered an error. Please try again.',
      'assistant',
      true,
    );
  }
}

/**
 * Simple markdown to HTML converter
 * Handles: headers, bold, italic, lists, code blocks, inline code
 */
function parseMarkdown(text: string): string {
  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```code```)
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    '<pre><code>$2</code></pre>',
  );

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers (# ## ###)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>');

  // Unordered lists (- item)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs - wrap remaining text blocks
  // Split by double newlines, wrap non-tag content in <p>
  const blocks = html.split(/\n\n+/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap if already an HTML block element
      if (
        /^<(h[1-6]|ul|ol|li|pre|p|div|blockquote)/.test(trimmed) ||
        /<\/(h[1-6]|ul|ol|pre|p|div|blockquote)>$/.test(trimmed)
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join('\n');

  // Clean up single newlines within paragraphs
  html = html.replace(/<p>([^<]*)\n([^<]*)<\/p>/g, '<p>$1 $2</p>');

  // Clean up empty elements
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<ul>\s*<\/ul>/g, '');

  return html;
}

/**
 * Add a message to the chat
 */
function addMessage(
  content: string,
  sender: 'user' | 'assistant',
  isError = false,
): void {
  if (!elements) return;

  // Remove welcome message if it exists
  const welcome = elements.messages.querySelector('.assistant-welcome');
  if (welcome) {
    welcome.remove();
  }

  const messageEl = document.createElement('div');
  messageEl.className = `message ${sender}${isError ? ' error' : ''}`;

  // Parse markdown for assistant messages, plain text for user
  if (sender === 'assistant' && !isError) {
    messageEl.innerHTML = parseMarkdown(content);
  } else {
    messageEl.textContent = content;
  }

  elements.messages.appendChild(messageEl);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

/**
 * Show/hide loading indicator
 */
function setLoading(loading: boolean): void {
  isLoading = loading;

  if (!elements) return;

  if (loading) {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    elements.messages.appendChild(indicator);
    elements.messages.scrollTop = elements.messages.scrollHeight;
    elements.input.disabled = true;
    elements.send.disabled = true;
  } else {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
    elements.input.disabled = false;
    elements.send.disabled = false;
  }
}

/**
 * Set status message
 */
function setStatus(message: string, isError = false): void {
  if (!elements) return;

  elements.status.textContent = message;
  elements.status.className = `assistant-status${isError ? ' error' : ''}`;
}

/**
 * Show the assistant toggle button (call when Copilot becomes available)
 */
export function showAssistantToggle(): void {
  if (!elements) return;
  elements.toggle.classList.remove('hidden');
}

/**
 * Hide the assistant toggle button
 */
export function hideAssistantToggle(): void {
  if (!elements) return;
  elements.toggle.classList.add('hidden');
  hidePanel();
}
