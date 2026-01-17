/**
 * API layer for the LLM Council.
 * Now uses client-side services instead of backend HTTP calls.
 */

import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Import client-side services
import * as storage from './services/storage';
import { runFullCouncil, generateConversationTitle } from './services/council';
import { streamModel, generateImage } from './services/llmClient';
import { extractFileContent, analyzeFileContent, analyzeImage } from './services/fileProcessor';
import { COUNCIL_MODELS, CHAIRMAN_MODEL, CHAT_MODELS, ROOMS, DEFAULT_ROOM } from './services/config';
import { searchGoogle, formatSearchContext, isSearchConfigured } from './services/searchClient';
import { isRealtimeQuery } from './services/intentRouter';
import { isFinanceConfigured, isFinancialQuery, extractStockSymbol, getStockQuote, getDailyTimeSeries, formatFinanceContext } from './services/financeClient';

/**
 * Get the current user ID from Supabase auth.
 */
async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
}

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const userId = await getUserId();
    if (!userId) return [];
    return storage.listConversations(userId);
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');

    const conversationId = uuidv4();
    return storage.createConversation(conversationId, userId);
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    return storage.getConversation(conversationId);
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {object} options - { mode, room, model }
   * @param {function} onEvent - Callback function for each event
   */
  async sendMessageStream(conversationId, content, options = {}, onEvent) {
    // Handle legacy signature: (id, content, onEvent)
    if (typeof options === 'function') {
      onEvent = options;
      options = {};
    }

    const mode = options.mode || 'chat';
    const room = options.room || DEFAULT_ROOM;

    // Add user message to storage
    await storage.addUserMessage(conversationId, content);

    try {
      if (mode === 'council') {
        // Run full council process
        const roomConfig = ROOMS[room] || ROOMS[DEFAULT_ROOM];
        const models = roomConfig.models || COUNCIL_MODELS;
        const chairman = roomConfig.chairman || CHAIRMAN_MODEL;

        const result = await runFullCouncil(content, models, chairman, (eventType, data) => {
          onEvent(eventType, data);
        });

        // Save assistant message
        await storage.addAssistantMessage(
          conversationId,
          result.stage1,
          result.stage2,
          result.stage3,
          result.metadata
        );

        onEvent('complete', {});

      } else if (mode === 'image') {
        // Image generation mode
        onEvent('image_start', {});

        const imageMarkdown = await generateImage(content);

        const imageData = {
          model: 'Gemini Image Generation',
          response: imageMarkdown
        };

        await storage.addChatMessage(conversationId, imageMarkdown, { mode: 'image' });

        onEvent('image_complete', { data: imageData });
        onEvent('complete', {});

      } else {
        // Chat mode - streaming
        const modelId = options.model;
        let selectedModel;

        if (modelId) {
          selectedModel = CHAT_MODELS.find(m => m.id === modelId || m.name === modelId);
        }

        if (!selectedModel) {
          selectedModel = CHAT_MODELS[0]; // Default to first chat model
        }

        // Check if query needs real-time search or financial data
        let searchContext = null;
        let searchResults = null;
        let financeContext = null;

        // First, check if this is a financial query and Alpha Vantage is configured (and not limit-reached)
        if (isFinanceConfigured() && !options.skipAlphaVantage && isFinancialQuery(content)) {
          const stockSymbol = extractStockSymbol(content);
          if (stockSymbol) {
            onEvent('search_start', { type: 'finance', symbol: stockSymbol });
            try {
              // Fetch both current quote and historical data
              const [quote, history] = await Promise.all([
                getStockQuote(stockSymbol),
                getDailyTimeSeries(stockSymbol, 'compact') // Last 100 trading days
              ]);

              if (quote || history) {
                financeContext = formatFinanceContext(quote, history);
                onEvent('search_complete', {
                  type: 'finance',
                  symbol: stockSymbol,
                  quote,
                  historyDays: history?.length || 0
                });
              }
            } catch (financeError) {
              console.warn('Finance API failed, falling back to web search:', financeError);
            }
          }
        }

        // Fall back to web search if no finance data or if forceSearch/realtime query
        const shouldSearch = !financeContext && isSearchConfigured() && (options.forceSearch || isRealtimeQuery(content));

        if (shouldSearch) {
          onEvent('search_start', { type: 'web' });
          try {
            searchResults = await searchGoogle(content, 5);
            if (searchResults && searchResults.length > 0) {
              searchContext = formatSearchContext(searchResults);
              onEvent('search_complete', { type: 'web', results: searchResults });
            }
          } catch (searchError) {
            console.warn('Search failed, continuing without search:', searchError);
          }
        }

        // Combine contexts (finance takes priority)
        const combinedContext = financeContext || searchContext;

        onEvent('chat_start', { model: selectedModel.name, hasSearch: !!searchContext });

        let fullResponse = '';

        // Build conversation history for context (limited to prevent token overflow)
        const MAX_HISTORY_MESSAGES = 4; // Keep it small for free-tier models
        const MAX_CHARS_PER_MESSAGE = 500; // Truncate long messages
        const conversation = await storage.getConversation(conversationId);
        const historyMessages = [];

        if (conversation && conversation.messages) {
          // Get previous messages (exclude the current user message we just added)
          const previousMessages = conversation.messages.slice(0, -1);

          // Take last N messages for context
          const recentMessages = previousMessages.slice(-MAX_HISTORY_MESSAGES);

          for (const msg of recentMessages) {
            if (msg.role === 'user') {
              const truncatedContent = msg.content.length > MAX_CHARS_PER_MESSAGE
                ? msg.content.slice(0, MAX_CHARS_PER_MESSAGE) + '...'
                : msg.content;
              historyMessages.push({ role: 'user', content: truncatedContent });
            } else if (msg.role === 'assistant') {
              // Use the final response content
              const assistantContent = msg.stage3?.response || msg.content || '';
              if (assistantContent) {
                const truncatedContent = assistantContent.length > MAX_CHARS_PER_MESSAGE
                  ? assistantContent.slice(0, MAX_CHARS_PER_MESSAGE) + '...'
                  : assistantContent;
                historyMessages.push({ role: 'assistant', content: truncatedContent });
              }
            }
          }
        }

        // Build messages with optional search/finance context
        const userContent = combinedContext
          ? `${combinedContext}\nUser Question: ${content}`
          : content;

        // Combine history with current message
        const messages = [
          ...historyMessages,
          { role: 'user', content: userContent }
        ];

        await streamModel(selectedModel, messages, (chunk) => {
          fullResponse += chunk;
          onEvent('chat_chunk', { chunk });
        });

        // Save the complete message with search/finance metadata
        await storage.addChatMessage(conversationId, fullResponse, {
          mode: 'chat',
          model: selectedModel.name,
          hasSearch: !!combinedContext,
          hasFinanceData: !!financeContext,
          searchSources: searchResults?.map(r => ({ title: r.title, source: r.source, url: r.url }))
        });

        onEvent('chat_complete', {
          data: {
            model: selectedModel.name,
            response: fullResponse,
            searchResults: searchResults
          }
        });
        onEvent('complete', {});
      }

      // Generate title if this is the first message
      const conv = await storage.getConversation(conversationId);
      if (conv && conv.messages.length <= 2 && conv.title === 'New Chat') {
        const userMessages = conv.messages
          .filter(m => m.role === 'user')
          .map(m => m.content);

        if (userMessages.length > 0) {
          const title = await generateConversationTitle(userMessages);
          await storage.updateConversationTitle(conversationId, title);
          onEvent('title_complete', { title });
        }
      }

    } catch (error) {
      console.error('Error in sendMessageStream:', error);
      onEvent('error', { message: error.message });
    }
  },

  /**
   * Delete a specific conversation.
   */
  async deleteConversation(conversationId) {
    const success = await storage.deleteConversation(conversationId);
    return { success };
  },

  /**
   * Delete all conversations.
   */
  async deleteAllConversations() {
    const userId = await getUserId();
    if (!userId) throw new Error('Not authenticated');
    await storage.deleteAllConversations(userId);
    return { success: true };
  },

  /**
   * List all available rooms.
   */
  async listRooms() {
    return ROOMS;
  },

  /**
   * Detect room from prompt (simplified - returns decision room).
   */
  async detectRoom(prompt) {
    // Simple keyword detection
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('code') || lowerPrompt.includes('debug') || lowerPrompt.includes('function')) {
      return { detected_room: 'code' };
    }
    if (lowerPrompt.includes('learn') || lowerPrompt.includes('study') || lowerPrompt.includes('explain')) {
      return { detected_room: 'study' };
    }
    if (lowerPrompt.includes('write') || lowerPrompt.includes('creative') || lowerPrompt.includes('story')) {
      return { detected_room: 'creative' };
    }
    if (lowerPrompt.includes('decide') || lowerPrompt.includes('choose') || lowerPrompt.includes('compare')) {
      return { detected_room: 'decision' };
    }

    return { detected_room: DEFAULT_ROOM };
  },

  /**
   * Extract text content from a file.
   */
  async extractFileContent(file) {
    return extractFileContent(file);
  },

  /**
   * Analyze pre-extracted file content with a user prompt.
   */
  async analyzeFileContent(extractedText, prompt, filename, fileType) {
    if (fileType === 'image') {
      // This shouldn't happen with the current flow, but handle it
      return analyzeImage(extractedText, prompt, filename, 'image/png');
    }
    return analyzeFileContent(extractedText, prompt, filename, fileType);
  },
};
