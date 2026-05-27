/**
 * AI Module — Public API
 *
 * Re-exports the AI service, context manager, and guardrails for clean imports:
 *   import { handleIncomingMessage } from './ai';
 */

export { handleIncomingMessage, disconnectAI } from './gemini-service.js';

export {
  getChatHistory,
  appendToHistory,
  clearHistory,
  disconnectContextRedis,
} from './context.js';

export { detectInjection, getFallbackResponse } from './guardrails.js';

export type { ContextMessage } from './context.js';
