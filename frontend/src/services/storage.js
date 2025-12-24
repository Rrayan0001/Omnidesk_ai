/**
 * Supabase-based storage for conversations.
 * Direct client calls from the browser.
 */

import { supabase } from '../lib/supabase';

/**
 * Create a new conversation.
 * @param {string} conversationId - UUID for the conversation
 * @param {string} userId - User's ID from auth
 * @returns {Promise<Object>} The created conversation
 */
export async function createConversation(conversationId, userId) {
    const data = {
        id: conversationId,
        user_id: userId,
        title: 'New Chat',
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('conversations').insert(data);

    if (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }

    return { ...data, messages: [] };
}

/**
 * Load a conversation and its messages.
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object|null>} The conversation with messages, or null
 */
export async function getConversation(conversationId) {
    // Fetch conversation metadata
    const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

    if (convError || !convData) {
        console.error('Error getting conversation:', convError);
        return null;
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (msgError) {
        console.error('Error getting messages:', msgError);
        return null;
    }

    return {
        id: convData.id,
        created_at: convData.created_at,
        title: convData.title || 'New Chat',
        messages: messages || []
    };
}

/**
 * List all conversations for a user.
 * @param {string} userId - User's ID
 * @returns {Promise<Array>} List of conversation metadata
 */
export async function listConversations(userId) {
    const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error listing conversations:', error);
        return [];
    }

    // Get message counts for each conversation
    const results = [];
    for (const conv of (conversations || [])) {
        const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

        results.push({
            id: conv.id,
            created_at: conv.created_at,
            title: conv.title || 'New Chat',
            message_count: count || 0
        });
    }

    return results;
}

/**
 * Add a user message to a conversation.
 * @param {string} conversationId - The conversation ID
 * @param {string} content - Message content
 */
export async function addUserMessage(conversationId, content) {
    const message = {
        conversation_id: conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('messages').insert(message);

    if (error) {
        console.error('Error adding user message:', error);
        throw error;
    }
}

/**
 * Add an assistant message with all stages.
 * @param {string} conversationId - The conversation ID
 * @param {Array} stage1 - Stage 1 results
 * @param {Array} stage2 - Stage 2 results
 * @param {Object} stage3 - Stage 3 result
 * @param {Object} metadata - Additional metadata
 */
export async function addAssistantMessage(conversationId, stage1, stage2, stage3, metadata = null) {
    const message = {
        conversation_id: conversationId,
        role: 'assistant',
        content: stage3?.response || '',
        stage1,
        stage2,
        stage3,
        created_at: new Date().toISOString()
    };

    if (metadata) {
        message.metadata = metadata;
    }

    const { error } = await supabase.from('messages').insert(message);

    if (error) {
        console.error('Error adding assistant message:', error);
        throw error;
    }
}

/**
 * Add a simple chat message (without council stages).
 * @param {string} conversationId - The conversation ID
 * @param {string} content - Message content
 * @param {Object} metadata - Message metadata (mode, model, etc.)
 */
export async function addChatMessage(conversationId, content, metadata = {}) {
    const message = {
        conversation_id: conversationId,
        role: 'assistant',
        content,
        stage1: null,
        stage2: null,
        stage3: { model: metadata.model || 'chat', response: content },
        metadata,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('messages').insert(message);

    if (error) {
        console.error('Error adding chat message:', error);
        throw error;
    }
}

/**
 * Update the title of a conversation.
 * @param {string} conversationId - The conversation ID
 * @param {string} title - New title
 */
export async function updateConversationTitle(conversationId, title) {
    const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);

    if (error) {
        console.error('Error updating title:', error);
        throw error;
    }
}

/**
 * Delete a conversation and its messages.
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteConversation(conversationId) {
    // Delete messages first (if no cascade)
    await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

    if (error) {
        console.error('Error deleting conversation:', error);
        return false;
    }

    return true;
}

/**
 * Delete all conversations for a user.
 * @param {string} userId - User's ID
 */
export async function deleteAllConversations(userId) {
    // Get all conversation IDs
    const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId);

    if (convs) {
        // Delete all messages for those conversations
        for (const conv of convs) {
            await supabase
                .from('messages')
                .delete()
                .eq('conversation_id', conv.id);
        }
    }

    // Delete all conversations
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting all conversations:', error);
        throw error;
    }
}
