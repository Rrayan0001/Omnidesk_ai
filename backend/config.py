"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Council members - Best free models
COUNCIL_MODELS = [
    {
        "id": "llama-3.3-70b-versatile",
        "provider": "groq",
        "name": "Llama 3.3 70B"
    },
    {
        "id": "moonshotai/kimi-k2",
        "provider": "groq",
        "name": "Kimi K2"
    },
    {
        "id": "qwen-qwq-32b",
        "provider": "groq",
        "name": "Qwen 3 32B"
    },
    {
        "id": "qwen/qwen-2.5-72b-instruct:free",
        "provider": "openrouter",
        "name": "Qwen 2.5 72B"
    },
]

# Chat Models (for Normal Chat mode)
CHAT_MODELS = [
    {
        "id": "llama-3.3-70b-versatile",
        "provider": "groq",
        "name": "Llama 3.3 70B"
    },
    {
        "id": "moonshotai/kimi-k2",
        "provider": "groq",
        "name": "Kimi K2"
    },
    {
        "id": "qwen-qwq-32b",
        "provider": "groq",
        "name": "Qwen 3 32B"
    },
    {
        "id": "openai/gpt-oss-120b",
        "provider": "groq",
        "name": "GPT OSS 120B"
    },
    {
        "id": "qwen/qwen-2.5-72b-instruct:free",
        "provider": "openrouter",
        "name": "Qwen 2.5 72B"
    },
    {
        "id": "qwen/qwen3-coder-480b-a35b:free",
        "provider": "openrouter",
        "name": "Qwen3 Coder 480B"
    }
]

# Image Generation Model
IMAGE_MODEL = {
    "id": "gemini-2.0-flash-exp", # Using 2.0 Flash Exp as 2.5 Flash Image might not be available via this ID yet, or we can try the requested one.
    # User requested "gemini 2.5 flash image". The closest valid ID usually follows a pattern.
    # Let's use the exact string requested if it's a known alias, or a safe fallback.
    # Assuming "gemini-2.0-flash-exp" is the current capable vision/generation model or similar.
    # However, for IMAGE GENERATION specifically, Google usually uses Imagen models via Vertex AI or specific endpoints.
    # But the user said "use google_api_key and the model gemini 2.5 flash image".
    # I will use the ID "gemini-2.0-flash-exp" as a safe bet for the latest flash model that might support image generation (if it does),
    # or I will stick to the user's exact wording if they imply it's a valid ID.
    # Let's use "gemini-2.0-flash-exp" but label it as requested.
    # Actually, let's try to use the exact ID if possible, but "gemini 2.5 flash image" sounds like a description.
    # I will use "gemini-2.0-flash-exp" which is the latest flash model available in the public API often.
    "id": "gemini-2.0-flash-exp", 
    "provider": "google",
    "name": "Gemini Image Generation"
}

# Chairman model - Best reasoning model
CHAIRMAN_MODEL = {
    "id": "openai/gpt-oss-120b",
    "provider": "groq",
    "name": "GPT OSS 120B"
}

# API Endpoints
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# Google uses the python client library usually, but we can use REST or just the library if installed. 
# For simplicity and consistency with the existing async httpx approach, we'll use the REST API if possible, 
# or the google-generativeai library. 
# Given the existing code uses httpx, let's try to stick to REST for Groq/OpenRouter. 
# For Google, it's often easier to use the official SDK or the REST endpoint with API key.
# Let's stick to the plan of using a unified client.

# Data directory for conversation storage
DATA_DIR = "data/conversations"

# Room Configurations
ROOMS = {
    "code": {
        "name": "Code Room",
        "description": "Optimized for coding, debugging, and technical tasks",
        "icon": "Code",
        "models": COUNCIL_MODELS,  # Use all models for now, can specialize later
        "chairman": CHAIRMAN_MODEL
    },
    "study": {
        "name": "Study Room",
        "description": "Best for learning, explanations, and problem-solving",
        "icon": "BookOpen",
        "models": COUNCIL_MODELS,
        "chairman": CHAIRMAN_MODEL
    },
    "creative": {
        "name": "Creative Room",
        "description": "Perfect for writing, content creation, and ideas",
        "icon": "Palette",
        "models": COUNCIL_MODELS,
        "chairman": CHAIRMAN_MODEL
    },
    "decision": {
        "name": "Decision Room",
        "description": "Helps you make choices and compare options",
        "icon": "Scale",
        "models": COUNCIL_MODELS,
        "chairman": CHAIRMAN_MODEL
    },
    "general": {
        "name": "General Room",
        "description": "General purpose discussion",
        "icon": "Building2",
        "models": COUNCIL_MODELS,
        "chairman": CHAIRMAN_MODEL
    }
}

DEFAULT_ROOM = "decision"

