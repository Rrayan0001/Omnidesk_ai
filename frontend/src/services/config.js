/**
 * Configuration for the LLM Council.
 * API keys are loaded from Vite environment variables.
 */

// API Keys (from environment)
export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
export const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

// API Endpoints
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Council members - Best free models
export const COUNCIL_MODELS = [
    {
        id: 'llama-3.3-70b-versatile',
        provider: 'groq',
        name: 'Llama 3.3 70B'
    },
    {
        id: 'moonshotai/kimi-k2-instruct-0905',
        provider: 'groq',
        name: 'Kimi K2'
    },
    {
        id: 'openai/gpt-oss-20b',
        provider: 'openrouter',
        name: 'GPT OSS 20B'
    },
    {
        id: 'google/gemma-3-27b-it:free',
        provider: 'openrouter',
        name: 'Gemma 3 27B'
    },
];

// Chat Models (for Normal Chat mode)
export const CHAT_MODELS = [
    {
        id: 'llama-3.3-70b-versatile',
        provider: 'groq',
        name: 'Llama 3.3 70B'
    },
    {
        id: 'moonshotai/kimi-k2-instruct-0905',
        provider: 'groq',
        name: 'Kimi K2'
    },
    {
        id: 'openai/gpt-oss-20b',
        provider: 'openrouter',
        name: 'GPT OSS 20B'
    },
    {
        id: 'openai/gpt-oss-120b',
        provider: 'groq',
        name: 'GPT OSS 120B'
    },
    {
        id: 'google/gemma-3-27b-it:free',
        provider: 'openrouter',
        name: 'Gemma 3 27B'
    },
];

// Image Generation Model
export const IMAGE_MODEL = {
    id: 'gemini-2.0-flash-exp',
    provider: 'google',
    name: 'Gemini Image Generation'
};

// Chairman model - Best reasoning model
export const CHAIRMAN_MODEL = {
    id: 'openai/gpt-oss-120b',
    provider: 'groq',
    name: 'GPT OSS 120B'
};

// Room Configurations
export const ROOMS = {
    code: {
        name: 'Code Room',
        description: 'Optimized for coding, debugging, and technical tasks',
        icon: 'Code',
        models: COUNCIL_MODELS,
        chairman: CHAIRMAN_MODEL
    },
    study: {
        name: 'Study Room',
        description: 'Best for learning, explanations, and problem-solving',
        icon: 'BookOpen',
        models: COUNCIL_MODELS,
        chairman: CHAIRMAN_MODEL
    },
    creative: {
        name: 'Creative Room',
        description: 'Perfect for writing, content creation, and ideas',
        icon: 'Palette',
        models: COUNCIL_MODELS,
        chairman: CHAIRMAN_MODEL
    },
    decision: {
        name: 'Decision Room',
        description: 'Helps you make choices and compare options',
        icon: 'Scale',
        models: COUNCIL_MODELS,
        chairman: CHAIRMAN_MODEL
    },
    general: {
        name: 'General Room',
        description: 'General purpose discussion',
        icon: 'Building2',
        models: COUNCIL_MODELS,
        chairman: CHAIRMAN_MODEL
    }
};

export const DEFAULT_ROOM = 'decision';

// Helper to check if API keys are configured
export const isConfigured = () => {
    return !!(OPENROUTER_API_KEY || GROQ_API_KEY || GOOGLE_API_KEY);
};
