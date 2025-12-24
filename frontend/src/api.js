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

        onEvent('chat_start', { model: selectedModel.name });

        let fullResponse = '';
        const messages = [{ role: 'user', content }];

        await streamModel(selectedModel, messages, (chunk) => {
          fullResponse += chunk;
          onEvent('chat_chunk', { chunk });
        });

        // Save the complete message
        await storage.addChatMessage(conversationId, fullResponse, {
          mode: 'chat',
          model: selectedModel.name
        });

        onEvent('chat_complete', {
          data: {
            model: selectedModel.name,
            response: fullResponse
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
      return { room: 'code' };
    }
    if (lowerPrompt.includes('learn') || lowerPrompt.includes('study') || lowerPrompt.includes('explain')) {
      return { room: 'study' };
    }
    if (lowerPrompt.includes('write') || lowerPrompt.includes('creative') || lowerPrompt.includes('story')) {
      return { room: 'creative' };
    }
    if (lowerPrompt.includes('decide') || lowerPrompt.includes('choose') || lowerPrompt.includes('compare')) {
      return { room: 'decision' };
    }

    return { room: DEFAULT_ROOM };
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
