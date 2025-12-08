"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio

from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings
from .classifier import detect_room, is_simple_query
from .config import ROOMS, DEFAULT_ROOM, CHAT_MODELS
from .llm_client import query_model
from .file_processor import process_file, is_supported_file, SUPPORTED_EXTENSIONS

app = FastAPI(title="LLM Council API")

import os

# Enable CORS for local development and production
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
# Add default local origins
default_origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:1000", "http://localhost:10000"]
allowed_origins.extend([o for o in default_origins if o not in allowed_origins])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    mode: str = "chat"  # Default: "chat" (was "council") - "council", "chat", "image"
    room: str = "decision" # For council mode
    model: str = "x-ai/grok-4.1-fast:free"  # Default model for chat mode



class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/rooms")
async def list_rooms():
    """List all available rooms."""
    return {
        "rooms": [
            {
                "id": room_id,
                "name": room_data["name"],
                "description": room_data["description"],
                "icon": room_data["icon"]
            }
            for room_id, room_data in ROOMS.items()
        ],
        "default": DEFAULT_ROOM
    }


@app.get("/api/models")
async def list_models():
    """List all available chat models."""
    return {"models": CHAT_MODELS}


# File Analysis Model (GPT OSS 120B on Groq)
FILE_ANALYSIS_MODEL = {
    "id": "openai/gpt-oss-120b",
    "provider": "groq",
    "name": "GPT OSS 120B"
}


@app.post("/api/file/upload")
async def upload_file(file: UploadFile = File(...), prompt: str = "Please analyze this file and provide a summary."):
    """
    Upload and analyze a file (PDF, DOCX, PPTX, or images).
    """
    # Validate file type
    if not is_supported_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Process the file
    result = process_file(file_content, file.filename)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    # Prepare prompt based on file type
    if result['type'] == 'document':
        # For documents, send extracted text to the model
        analysis_prompt = f"""The user has uploaded a document named "{result['filename']}". Here is the extracted text:

---
{result['text'][:15000]}  # Limit text to avoid token limits
---

User's request: {prompt}

Please analyze this document and respond to the user's request."""
        
        messages = [{"role": "user", "content": analysis_prompt}]
        response = await query_model(FILE_ANALYSIS_MODEL, messages)
        
        if response is None:
            return {
                "success": True,
                "type": "document",
                "filename": result['filename'],
                "analysis": "Sorry, I couldn't analyze this document. The file might be too large or complex.",
                "extracted_text_preview": result['text'][:500] + "..." if len(result['text']) > 500 else result['text']
            }
        
        return {
            "success": True,
            "type": "document",
            "filename": result['filename'],
            "analysis": response.get('content', 'No analysis available'),
            "extracted_text_preview": result['text'][:500] + "..." if len(result['text']) > 500 else result['text']
        }
    
    else:  # Image
        # For images, send the base64 data
        # Note: Many models don't support vision yet, so we'll describe what we received
        image_prompt = f"""The user has uploaded an image named "{result['filename']}".

User's request: {prompt}

Please help the user with their request about this image."""        
        messages = [{"role": "user", "content": image_prompt}]
        response = await query_model(FILE_ANALYSIS_MODEL, messages)
        
        return {
            "success": True,
            "type": "image",
            "filename": result['filename'],
            "analysis": response.get('content', 'Image received successfully!') if response else "Image uploaded! Vision analysis is not available for this model.",
            "mime_type": result['mime_type']
        }


@app.post("/api/file/extract")
async def extract_file_content(file: UploadFile = File(...)):
    """
    Extract text content from a file without LLM analysis.
    Returns the extracted text for the frontend to use.
    """
    # Validate file type
    if not is_supported_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Process the file
    result = process_file(file_content, file.filename)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    if result['type'] == 'document':
        return {
            "success": True,
            "type": "document",
            "filename": result['filename'],
            "text": result['text']
        }
    else:  # Image
        return {
            "success": True,
            "type": "image",
            "filename": result['filename'],
            "text": f"[Image: {result['filename']}]",
            "mime_type": result['mime_type'],
            "image_data": result.get('image_data', '')[:100] + '...'  # Truncated preview
        }


class FileAnalysisRequest(BaseModel):
    """Request to analyze pre-extracted file content."""
    extracted_text: str
    prompt: str
    filename: str
    file_type: str  # 'document' or 'image'


@app.post("/api/file/analyze")
async def analyze_file_content(request: FileAnalysisRequest):
    """
    Analyze pre-extracted file content with a user prompt.
    Uses GPT OSS 120B (Groq) for analysis.
    """
    try:
        if request.file_type == 'document':
            analysis_prompt = f"""The following is extracted text from a document named "{request.filename}":

---
{request.extracted_text}
---

User's request: {request.prompt}

Please help the user with their request based on the document content above."""
        else:  # image
            analysis_prompt = f"""The user has uploaded an image named "{request.filename}".

User's request: {request.prompt}

Please help the user with their request about this image."""

        messages = [{"role": "user", "content": analysis_prompt}]
        response = await query_model(FILE_ANALYSIS_MODEL, messages)

        if response and response.get('content'):
            return {
                "success": True,
                "analysis": response['content'],
                "model": FILE_ANALYSIS_MODEL.get('name', 'GPT OSS 120B')
            }
        else:
            return {
                "success": False,
                "error": "Failed to get analysis from the model"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DetectRoomRequest(BaseModel):
    """Request to detect room from prompt."""
    prompt: str


@app.post("/api/rooms/detect")
async def detect_room_endpoint(request: DetectRoomRequest):
    """Detect the most appropriate room for a prompt."""
    detected = detect_room(request.prompt)
    room_data = ROOMS[detected]
    return {
        "detected_room": detected,
        "room_name": room_data["name"],
        "room_icon": room_data["icon"],
        "room_description": room_data["description"]
    }


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations(x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """List all conversations (metadata only)."""
    if not x_user_id:
        x_user_id = "default_user"
    return storage.list_conversations(user_id=x_user_id)


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest, x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """Create a new conversation."""
    if not x_user_id:
        x_user_id = "default_user"
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id, user_id=x_user_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the process based on mode.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # Get all user messages for title generation
    user_messages = [m["content"] for m in conversation["messages"] if m["role"] == "user"]
    # Include the current message which was just added
    user_messages.append(request.content)

    # Start title generation in background if within first 5 messages
    title_task = None
    if len(user_messages) <= 5:
        title_task = asyncio.create_task(generate_conversation_title(user_messages))

    # Optimization: Check for simple queries in Council mode and route to single model
    if request.mode == "council" and is_simple_query(request.content):
        # Override to chat mode with Grok 4.1
        request.mode = "chat"
        request.model = "x-ai/grok-4.1-fast:free"

    if request.mode == "chat":
        # Normal Chat Mode - Single model call for speed
        model_id = request.model
        # Find model config
        model_config = next((m for m in CHAT_MODELS if m["id"] == model_id), CHAT_MODELS[0])
        
        messages = [{"role": "user", "content": request.content}]
        response = await query_model(model_config, messages)
        
        content = response.get("content", "Error: No response") if response else "Error: Model failed"
        
        # Save as a simple assistant message (simulating stage3 result for compatibility)
        storage.add_assistant_message(
            conversation_id,
            [], [], 
            {"model": model_config["name"], "response": content},
            metadata={"mode": "chat", "model": model_config["name"]}
        )
        
        # Update title if it was being generated
        if title_task:
            title = await title_task
            storage.update_conversation_title(conversation_id, title)
        
        return {
            "stage1": [],
            "stage2": [],
            "stage3": {"model": model_config["name"], "response": content},
            "metadata": {"mode": "chat", "model": model_config["name"]}
        }

    elif request.mode == "image":
        # Image Generation Mode - Dedicated pipeline
        from .llm_client import generate_image
        
        # Call the image generation function
        content = await generate_image(request.content)
        
        storage.add_assistant_message(
            conversation_id,
            [], [], 
            {"model": "Gemini Image Generator", "response": content},
            metadata={"mode": "image"}
        )
        
        # Update title if it was being generated
        if title_task:
            title = await title_task
            storage.update_conversation_title(conversation_id, title)
        
        return {
            "stage1": [],
            "stage2": [],
            "stage3": {"model": "Gemini Image Generator", "response": content},
            "metadata": {"mode": "image"}
        }

    else:
        # Council Mode - Parallel multi-model execution
        room_id = request.room or DEFAULT_ROOM
        room_config = ROOMS.get(room_id, ROOMS[DEFAULT_ROOM])

        # Run the 3-stage council process with room-specific models
        stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
            request.content,
            room_config["models"],
            room_config["chairman"]
        )

        # Add assistant message with all stages
        storage.add_assistant_message(
            conversation_id,
            stage1_results,
            stage2_results,
            stage3_result,
            metadata=metadata
        )
        
        # Update title if it was being generated
        if title_task:
            title = await title_task
            storage.update_conversation_title(conversation_id, title)

        # Return the complete response with metadata
        return {
            "stage1": stage1_results,
            "stage2": stage2_results,
            "stage3": stage3_result,
            "metadata": metadata
        }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the process based on mode.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Get all user messages for title generation
            user_messages = [m["content"] for m in conversation["messages"] if m["role"] == "user"]
            user_messages.append(request.content)

            # Start title generation in parallel (don't await yet) if within first 5 messages
            title_task = None
            if len(user_messages) <= 5:
                title_task = asyncio.create_task(generate_conversation_title(user_messages))

            # Optimization: Check for simple queries in Council mode and route to single model
            if request.mode == "council" and is_simple_query(request.content):
                # Override to chat mode with Grok 4.1
                request.mode = "chat"
                request.model = "x-ai/grok-4.1-fast:free"

            if request.mode == "chat":
                # Normal Chat Mode with Streaming
                model_id = request.model
                model_config = next((m for m in CHAT_MODELS if m["id"] == model_id), CHAT_MODELS[0])
                
                yield f"data: {json.dumps({'type': 'chat_start', 'model': model_config['name']})}\n\n"
                
                messages = [{"role": "user", "content": request.content}]
                full_response = ""
                
                # Stream the response chunk by chunk
                from .llm_client import query_model_stream
                async for chunk in query_model_stream(model_config, messages):
                    full_response += chunk
                    # Send each chunk to frontend
                    yield f"data: {json.dumps({'type': 'chat_chunk', 'chunk': chunk})}\n\n"
                
                yield f"data: {json.dumps({'type': 'chat_complete', 'data': {'model': model_config['name'], 'response': full_response}})}\n\n"
                
                storage.add_assistant_message(
                    conversation_id, [], [], 
                    {"model": model_config["name"], "response": full_response},
                    metadata={"mode": "chat", "model": model_config["name"]}
                )


            elif request.mode == "image":
                # Image Generation Mode
                from .llm_client import generate_image
                
                yield f"data: {json.dumps({'type': 'image_start'})}\n\n"
                
                # Call the image generation function
                content = await generate_image(request.content)
                
                yield f"data: {json.dumps({'type': 'image_complete', 'data': {'response': content}})}\n\n"
                
                storage.add_assistant_message(
                    conversation_id, [], [], 
                    {"model": "Gemini Image Generator", "response": content},
                    metadata={"mode": "image"}
                )

            else:
                # Council Mode
                room_id = request.room or DEFAULT_ROOM
                room_config = ROOMS.get(room_id, ROOMS[DEFAULT_ROOM])

                # Stage 1: Collect responses
                yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
                stage1_results = await stage1_collect_responses(request.content, room_config["models"])
                yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

                # Stage 2: Collect rankings
                yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
                stage2_results, label_to_model = await stage2_collect_rankings(request.content, stage1_results, room_config["models"])
                aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)
                yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

                # Stage 3: Synthesize final answer
                yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
                stage3_result = await stage3_synthesize_final(request.content, stage1_results, stage2_results, room_config["chairman"])
                yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

                # Save complete assistant message
                storage.add_assistant_message(
                    conversation_id,
                    stage1_results,
                    stage2_results,
                    stage3_result,
                    metadata={"mode": "council", "room": room_id}
                )

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a specific conversation."""
    deleted = storage.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted", "id": conversation_id}


@app.delete("/api/conversations")
async def delete_all_conversations(x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    """Delete all conversations for the specific user."""
    if not x_user_id:
        x_user_id = "default_user"
    storage.delete_all_conversations(user_id=x_user_id)
    return {"status": "success", "message": "All conversations deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
