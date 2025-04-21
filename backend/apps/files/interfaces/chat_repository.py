from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from ..models.chat import ChatSession, ChatMessage

class ChatRepositoryInterface(ABC):
    """Interface for chat repository operations."""
    
    @abstractmethod
    def create_session(self, title: Optional[str] = None) -> ChatSession:
        """Create a new chat session."""
        pass
    
    @abstractmethod
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID."""
        pass
    
    @abstractmethod
    def get_all_sessions(self, limit: int = 100) -> List[ChatSession]:
        """Get all chat sessions, ordered by most recent."""
        pass
    
    @abstractmethod
    def update_session(self, session_id: str, data: Dict[str, Any]) -> Optional[ChatSession]:
        """Update a chat session."""
        pass
    
    @abstractmethod
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session."""
        pass
    
    @abstractmethod
    def add_message(self, session_id: str, role: str, content: str, file_attachments: Optional[List[str]] = None) -> ChatMessage:
        """Add a message to a chat session."""
        pass
    
    @abstractmethod
    def get_messages(self, session_id: str) -> List[ChatMessage]:
        """Get all messages for a chat session."""
        pass 