import hashlib
from typing import Dict, Any

from ..interfaces.storage_service import StorageServiceInterface
from ..interfaces.file_repository import FileRepositoryInterface

class FileStorageService(StorageServiceInterface):
    """Implementation of storage service."""
    
    def __init__(self, file_repository: FileRepositoryInterface):
        self.file_repository = file_repository
    
    def calculate_hash(self, file_obj) -> str:
        """Calculate SHA-256 hash for a file."""
        # Reset file pointer to beginning
        file_obj.seek(0)
        
        # Calculate file hash
        hasher = hashlib.sha256()
        for chunk in iter(lambda: file_obj.read(4096), b''):
            hasher.update(chunk)
        
        # Reset file pointer again for future operations
        file_obj.seek(0)
        
        return hasher.hexdigest()
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics including deduplication savings.
        Takes reference counts into account.
        """
        # Get all files
        all_files = self.file_repository.find_all()
        
        # Total files including references
        total_files = sum(f.reference_count for f in all_files)
        
        # Calculate total logical size (considering reference counts)
        total_logical_size = sum(f.size * f.reference_count for f in all_files)
        
        # Count unique hashes
        unique_hashes = set(f.hash for f in all_files if f.hash)
        unique_files = len(unique_hashes)
        
        # Calculate actual physical storage used
        physical_size = sum(f.size for f in all_files)
        
        # Calculate saved size
        saved_files = total_files - len(all_files)
        saved_size = total_logical_size - physical_size
        
        # Calculate percentages
        duplicate_percentage = (saved_files / total_files * 100) if total_files > 0 else 0
        
        return {
            'total_files': total_files,
            'unique_files': unique_files,
            'total_size_bytes': total_logical_size,
            'saved_size_bytes': saved_size,
            'duplicate_percentage': duplicate_percentage
        } 