from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from ..models.file import File

class FileRepositoryInterface(ABC):
    """Interface for file repository operations."""
    
    @abstractmethod
    def save(self, file_data: Dict[str, Any]) -> File:
        """Save a file to the repository."""
        pass
        
    @abstractmethod
    def find_by_hash(self, file_hash: str) -> Optional[File]:
        """Find a file by its hash."""
        pass
        
    @abstractmethod
    def find_all(self, **filters) -> List[File]:
        """Find all files matching filters."""
        pass
        
    @abstractmethod
    def find_by_id(self, file_id: str) -> Optional[File]:
        """Find a file by its ID."""
        pass
        
    @abstractmethod
    def delete(self, file_id: str) -> bool:
        """Delete a file by its ID."""
        pass 