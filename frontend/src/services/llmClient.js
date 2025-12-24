/**
 * Multi-provider LLM client for browser.
 * Supports OpenRouter, Groq, and Google Gemini APIs.
 */

import {
    OPENROUTER_API_KEY,
    OPENROUTER_API_URL,
    GROQ_API_KEY,
    GROQ_API_URL,
    GOOGLE_API_KEY
} from './config';

/**
 * Query a single model and get the response.
 * @param {Object|string} modelConfig - Model config object or model ID string
 * @param {Array} messages - Array of message objects {role, content}
 * @param {number} timeout - Timeout in ms (default 120000)
 * @returns {Promise<Object|null>} Response with content, or null on error
 */
export async function queryModel(modelConfig, messages, timeout = 120000) {
    // Handle legacy string input (assume OpenRouter)
    const modelId = typeof modelConfig === 'string' ? modelConfig : modelConfig.id;
    const provider = typeof modelConfig === 'string' ? 'openrouter' : (modelConfig.provider || 'openrouter');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let result;
        if (provider === 'groq') {
            result = await queryGroq(modelId, messages, controller.signal);
        } else if (provider === 'google') {
            result = await queryGoogle(modelId, messages, controller.signal);
        } else {
            result = await queryOpenRouter(modelId, messages, controller.signal);
        }

        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        console.error(`Error querying model ${modelId} (${provider}):`, error);
        return null;
    }
}

/**
 * Query multiple models in parallel.
 * @param {Array} models - Array of model configs
 * @param {Array} messages - Array of message objects
 * @returns {Promise<Object>} Map of model ID to response
 */
export async function queryModelsParallel(models, messages) {
    const promises = models.map(model => queryModel(model, messages));
    const responses = await Promise.all(promises);

    const result = {};
    models.forEach((model, index) => {
        const key = typeof model === 'string' ? model : model.id;
        result[key] = responses[index];
    });

    return result;
}

/**
 * Stream responses from a model chunk by chunk.
 * @param {Object|string} modelConfig - Model config
 * @param {Array} messages - Messages array
 * @param {Function} onChunk - Callback for each chunk
 * @param {number} timeout - Timeout in ms
 */
export async function streamModel(modelConfig, messages, onChunk, timeout = 120000) {
    const modelId = typeof modelConfig === 'string' ? modelConfig : modelConfig.id;
    const provider = typeof modelConfig === 'string' ? 'openrouter' : (modelConfig.provider || 'openrouter');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        if (provider === 'groq') {
            await streamGroq(modelId, messages, onChunk, controller.signal);
        } else if (provider === 'google') {
            await streamGoogle(modelId, messages, onChunk, controller.signal);
        } else {
            await streamOpenRouter(modelId, messages, onChunk, controller.signal);
        }

        clearTimeout(timeoutId);
    } catch (error) {
        console.error(`Error streaming from ${modelId} (${provider}):`, error);
        onChunk(`Error: ${error.message}`);
    }
}

// ============ Provider-specific implementations ============

async function queryOpenRouter(model, messages, signal) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({ model, messages }),
        signal
    });

    if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    return {
        content: message.content,
        reasoning_details: message.reasoning_details
    };
}

async function queryGroq(model, messages, signal) {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
        signal
    });

    if (!response.ok) {
        throw new Error(`Groq error: ${response.status}`);
    }

    const data = await response.json();
    return {
        content: data.choices[0].message.content,
        reasoning_details: null
    };
}

async function queryGoogle(model, messages, signal) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`;

    // Convert messages to Gemini format
    const geminiContents = [];
    for (const msg of messages) {
        if (msg.role === 'system') continue; // Handle separately
        const role = msg.role === 'user' ? 'user' : 'model';
        geminiContents.push({
            role,
            parts: [{ text: msg.content }]
        });
    }

    // Handle system prompt by prepending to first user message
    if (messages[0]?.role === 'system' && geminiContents.length > 0) {
        geminiContents[0].parts[0].text = `System: ${messages[0].content}\n\nUser: ${geminiContents[0].parts[0].text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiContents }),
        signal
    });

    if (!response.ok) {
        throw new Error(`Google error: ${response.status}`);
    }

    const data = await response.json();
    try {
        const content = data.candidates[0].content.parts[0].text;
        return { content, reasoning_details: null };
    } catch {
        console.error('Unexpected Google response format:', data);
        return null;
    }
}

// ============ Streaming implementations ============

async function streamOpenRouter(model, messages, onChunk, signal) {
    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({ model, messages, stream: true }),
        signal
    });

    if (!response.ok) {
        throw new Error(`OpenRouter streaming error: ${response.status}`);
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
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') break;

                try {
                    const data = JSON.parse(dataStr);
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) onChunk(content);
                } catch {
                    // Skip malformed JSON
                }
            }
        }
    }
}

async function streamGroq(model, messages, onChunk, signal) {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, stream: true }),
        signal
    });

    if (!response.ok) {
        throw new Error(`Groq streaming error: ${response.status}`);
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
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') break;

                try {
                    const data = JSON.parse(dataStr);
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) onChunk(content);
                } catch {
                    // Skip malformed JSON
                }
            }
        }
    }
}

async function streamGoogle(model, messages, onChunk, signal) {
    // Google's streaming API is different - use generateContent with streamGenerateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`;

    // Convert messages to Gemini format
    const geminiContents = [];
    for (const msg of messages) {
        if (msg.role === 'system') continue;
        const role = msg.role === 'user' ? 'user' : 'model';
        geminiContents.push({
            role,
            parts: [{ text: msg.content }]
        });
    }

    if (messages[0]?.role === 'system' && geminiContents.length > 0) {
        geminiContents[0].parts[0].text = `System: ${messages[0].content}\n\nUser: ${geminiContents[0].parts[0].text}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiContents }),
        signal
    });

    if (!response.ok) {
        throw new Error(`Google streaming error: ${response.status}`);
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
                try {
                    const data = JSON.parse(line.slice(6));
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) onChunk(text);
                } catch {
                    // Skip malformed JSON
                }
            }
        }
    }
}

/**
 * Generate an image using Google's API with Pollinations fallback.
 * @param {string} prompt - Image generation prompt
 * @returns {Promise<string>} Markdown image with URL
 */
export async function generateImage(prompt) {
    // Enhance prompt with Gemini
    let enhancedPrompt = prompt;
    try {
        const messages = [{ role: 'user', content: `Create a detailed, vivid image generation prompt for: ${prompt}` }];
        const response = await queryGoogle('gemini-2.0-flash-exp', messages);
        if (response?.content) {
            enhancedPrompt = response.content;
        }
    } catch (e) {
        console.error('Error enhancing prompt:', e);
    }

    // Use Pollinations.ai for image generation (free, no API key)
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    return `![Generated Image](${imageUrl})\n\n**Prompt:** ${enhancedPrompt}`;
}
