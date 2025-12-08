"""Supabase-based storage for conversations."""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from .supabase_client import supabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_conversation(conversation_id: str, user_id: str) -> Dict[str, Any]:
    """
    Create a new conversation in Supabase.
    """
    try:
        data = {
            "id": conversation_id,
            "user_id": user_id,
            "title": "New Chat",
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("conversations").insert(data).execute()
        return {**data, "messages": []}
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise e

def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation and its messages from Supabase.
    """
    try:
        # Fetch conversation metadata
        resp = supabase.table("conversations").select("*").eq("id", conversation_id).execute()
        if not resp.data:
            return None
        conv = resp.data[0]
        
        # Fetch messages
        msg_resp = supabase.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        messages = msg_resp.data if msg_resp.data else []
        
        return {
            "id": conv["id"],
            "created_at": conv["created_at"],
            "title": conv.get("title", "New Chat"),
            "messages": messages
        }
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        return None

def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    """
    List all conversations for a specific user (metadata only).
    """
    try:
        # Fetch conversations for user
        resp = supabase.table("conversations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        conversations = resp.data if resp.data else []
        
        # For the list view, we often need message count. 
        # This might be expensive to query individually. 
        # For now, we'll just return metadata and maybe a placeholder count or join if needed.
        # Supabase API allows .select('*, messages(count)') but syntax is tricky with py client.
        # We will keep it simple: return convs, message_count=0 if not easily available, or fetch counts.
        
        results = []
        for conv in conversations:
            # Getting exact count for each might be slow (N+1), but OK for small scale.
            # Optimization: could use a view or rpc later.
            count_resp = supabase.table("messages").select("id", count="exact").eq("conversation_id", conv["id"]).execute()
            count = count_resp.count if count_resp.count is not None else 0
            
            results.append({
                "id": conv["id"],
                "created_at": conv["created_at"],
                "title": conv.get("title", "New Chat"),
                "message_count": count
            })
            
        return results
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        return []

def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to Supabase.
    """
    try:
        message = {
            "conversation_id": conversation_id,
            "role": "user",
            "content": content,
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("messages").insert(message).execute()
    except Exception as e:
        logger.error(f"Error adding user message: {e}")
        raise e

def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Add an assistant message with all stages to Supabase.
    """
    try:
        message = {
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": stage3.get("response", ""), # Main content
            "stage1": stage1,
            "stage2": stage2,
            "stage3": stage3,
            "created_at": datetime.utcnow().isoformat()
        }
        
        if metadata:
            message["metadata"] = metadata
            
        supabase.table("messages").insert(message).execute()
    except Exception as e:
        logger.error(f"Error adding assistant message: {e}")
        raise e

def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.
    """
    try:
        supabase.table("conversations").update({"title": title}).eq("id", conversation_id).execute()
    except Exception as e:
        logger.error(f"Error updating title: {e}")
        raise e

def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation (cascades to messages).
    """
    try:
        # Check if exists first? Or just delete.
        resp = supabase.table("conversations").delete().eq("id", conversation_id).execute()
        return len(resp.data) > 0
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        return False

def delete_all_conversations(user_id: str):
    """
    Delete all conversations for a user.
    """
    try:
        supabase.table("conversations").delete().eq("user_id", user_id).execute()
    except Exception as e:
        logger.error(f"Error deleting all conversations: {e}")
