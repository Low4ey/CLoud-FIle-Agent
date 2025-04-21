from abc import ABC, abstractmethod
from typing import Dict, Any

class StorageServiceInterface(ABC):
    """Interface for storage operations."""
    
    @abstractmethod
    def calculate_hash(self, file_obj) -> str:
        """Calculate hash for a file."""
        pass
    
    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        pass 