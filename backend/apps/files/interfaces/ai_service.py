from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class AIServiceInterface(ABC):
    """Interface for AI assistant operations."""
    
    @abstractmethod
    def process_message(self, message: str, 
                       file_attachments: Optional[List[str]] = None, 
                       files: Optional[List[Dict[str, Any]]] = None,
                       session_id: Optional[str] = None) -> Dict[str, Any]:
        """Process a user message and return a response."""
        pass
        
    @abstractmethod
    def execute_tool_call(self, function_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool call from the AI service."""
        pass
        
    @abstractmethod
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get available tools for the AI service."""
        pass
        
    @abstractmethod
    def _search_files(self, query: str, file_type: Optional[str] = None, 
                     date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict[str, Any]:
        """Search for files based on criteria."""
        pass
        
    @abstractmethod
    def _list_files(self, limit: int = 50, include_details: bool = True) -> Dict[str, Any]:
        """List all files with summary information."""
        pass
        
    @abstractmethod
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size to human-readable format."""
        pass
        
    @abstractmethod
    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a session in a format usable by the AI model."""
        pass
        
    @abstractmethod
    def create_chat_session(self, title: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat session."""
        pass 