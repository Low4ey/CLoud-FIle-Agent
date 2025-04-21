from typing import List, Optional, Dict, Any
import uuid

from ..interfaces.chat_repository import ChatRepositoryInterface
from ..models.chat import ChatSession, ChatMessage

class DjangoChatRepository(ChatRepositoryInterface):
    """Django ORM implementation of chat repository."""
    
    def create_session(self, title: Optional[str] = None) -> ChatSession:
        """Create a new chat session."""
        session = ChatSession(title=title if title else "New Conversation")
        session.save()
        return session
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID."""
        try:
            return ChatSession.objects.get(id=session_id)
        except (ChatSession.DoesNotExist, ValueError):
            return None
    
    def get_all_sessions(self, limit: int = 100) -> List[ChatSession]:
        """Get all chat sessions, ordered by most recent."""
        return list(ChatSession.objects.all()[:limit])
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> Optional[ChatSession]:
        """Update a chat session."""
        try:
            session = ChatSession.objects.get(id=session_id)
            
            # Update fields from data
            for key, value in data.items():
                if hasattr(session, key):
                    setattr(session, key, value)
            
            session.save()
            return session
        except (ChatSession.DoesNotExist, ValueError):
            return None
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session."""
        try:
            session = ChatSession.objects.get(id=session_id)
            session.delete()
            return True
        except (ChatSession.DoesNotExist, ValueError):
            return False
    
    def add_message(self, session_id: str, role: str, content: str, file_attachments: Optional[List[str]] = None) -> ChatMessage:
        """Add a message to a chat session."""
        try:
            session = ChatSession.objects.get(id=session_id)
        except (ChatSession.DoesNotExist, ValueError):
            # Create a new session if it doesn't exist
            session = self.create_session()
        
        # Create and save the message
        message = ChatMessage(
            session=session,
            role=role,
            content=content,
            file_attachments=file_attachments or []
        )
        message.save()
        
        # Update the session's updated_at timestamp
        session.save()  # This will update the auto_now field
        
        return message
    
    def get_messages(self, session_id: str) -> List[ChatMessage]:
        """Get all messages for a chat session."""
        try:
            session = ChatSession.objects.get(id=session_id)
            return list(session.messages.all())
        except (ChatSession.DoesNotExist, ValueError):
            return [] 