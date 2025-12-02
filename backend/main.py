"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid
import json
import asyncio

from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage2_collect_rankings, stage3_synthesize_final, calculate_aggregate_rankings
from .classifier import detect_room
from .config import ROOMS, DEFAULT_ROOM, CHAT_MODELS
from .llm_client import query_model

app = FastAPI(title="LLM Council API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:1000", "http://localhost:10000"],
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
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
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

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Log the received mode and model for debugging
    print(f"[DEBUG] Received message - Mode: {request.mode}, Model: {request.model}, Room: {request.room}")

    if request.mode == "chat":
        # Normal Chat Mode
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
            {"model": model_config["name"], "response": content}
        )
        
        return {
            "stage1": [],
            "stage2": [],
            "stage3": {"model": model_config["name"], "response": content},
            "metadata": {"mode": "chat", "model": model_config["name"]}
        }

    elif request.mode == "image":
        # Image Generation Mode
        from .llm_client import generate_image
        
        # Call the image generation function
        content = await generate_image(request.content)
        
        storage.add_assistant_message(
            conversation_id,
            [], [], 
            {"model": "Gemini Image Generator", "response": content}
        )
        
        return {
            "stage1": [],
            "stage2": [],
            "stage3": {"model": "Gemini Image Generator", "response": content},
            "metadata": {"mode": "image"}
        }

    else:
        # Council Mode (Default)
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
            stage3_result
        )

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

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            if request.mode == "chat":
                # Normal Chat Mode
                model_id = request.model
                model_config = next((m for m in CHAT_MODELS if m["id"] == model_id), CHAT_MODELS[0])
                
                yield f"data: {json.dumps({'type': 'chat_start', 'model': model_config['name']})}\n\n"
                
                messages = [{"role": "user", "content": request.content}]
                response = await query_model(model_config, messages)
                content = response.get("content", "Error: No response") if response else "Error: Model failed"
                
                yield f"data: {json.dumps({'type': 'chat_complete', 'data': {'model': model_config['name'], 'response': content}})}\n\n"
                
                storage.add_assistant_message(
                    conversation_id, [], [], 
                    {"model": model_config["name"], "response": content}
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
                    {"model": "Gemini Image Generator", "response": content}
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
                    stage3_result
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
async def delete_all_conversations():
    """Delete all conversations."""
    storage.delete_all_conversations()
    return {"status": "all_deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
