/**
 * API client for the LLM Council backend.
 */
import { supabase } from './lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Helper for authenticated requests
const fetchAPI = async (endpoint, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const headers = {
    ...options.headers,
  };

  if (userId) {
    headers['X-User-ID'] = userId;
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
};

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetchAPI('/api/conversations');
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetchAPI('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetchAPI(`/api/conversations/${conversationId}`);
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   * @param {string} conversationId
   * @param {string} content
   * @param {object} options - { mode, room, model }
   */
  async sendMessage(conversationId, content, options = {}) {
    const response = await fetchAPI(
      `/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          mode: options.mode || 'council',
          room: options.room || 'decision',
          model: options.model
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {object} options - { mode, room, model }
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, options = {}, onEvent) {
    // Handle legacy signature: (id, content, onEvent)
    if (typeof options === 'function') {
      onEvent = options;
      options = {};
    }

    const response = await fetchAPI(
      `/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          mode: options.mode || 'chat',  // Default to 'chat' for faster responses
          room: options.room || 'decision',
          model: options.model
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  /**
   * Delete a specific conversation.
   */
  async deleteConversation(conversationId) {
    const response = await fetchAPI(
      `/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    return response.json();
  },

  /**
   * Delete all conversations.
   */
  async deleteAllConversations() {
    const response = await fetchAPI('/api/conversations', {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete all conversations');
    }
    return response.json();
  },

  /**
   * List all available rooms.
   */
  async listRooms() {
    const response = await fetchAPI('/api/rooms');
    if (!response.ok) {
      throw new Error('Failed to list rooms');
    }
    return response.json();
  },

  /**
   * Detect room from prompt.
   */
  async detectRoom(prompt) {
    const response = await fetchAPI('/api/rooms/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      throw new Error('Failed to detect room');
    }
    return response.json();
  },

  /**
   * Upload a file for analysis.
   * Supports PDF, DOCX, PPTX, and image files (PNG, JPEG, GIF, BMP, WEBP)
   */
  async uploadFile(file, prompt = 'Please analyze this file and provide a summary.') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);

    // fetchAPI handles headers, but FormData shouldn't have Content-Type set manually (browser does it with boundary)
    // fetchAPI spreads headers. If headers is passed empty, it's fine.
    // However, fetchAPI adds X-User-ID to headers.

    // We need to call fetchAPI carefully here.
    // fetchAPI merges options.headers. 

    const response = await fetchAPI('/api/file/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload file');
    }
    return response.json();
  },

  /**
   * Extract text content from a file (without LLM analysis).
   * Supports PDF, DOCX, PPTX, and image files
   */
  async extractFileContent(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchAPI('/api/file/extract', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to extract file content');
    }
    return response.json();
  },

  /**
   * Analyze pre-extracted file content with a user prompt.
   * Uses GPT OSS 120B for analysis.
   */
  async analyzeFileContent(extractedText, prompt, filename, fileType) {
    const response = await fetchAPI('/api/file/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extracted_text: extractedText,
        prompt: prompt,
        filename: filename,
        file_type: fileType,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to analyze file');
    }
    return response.json();
  },
};
