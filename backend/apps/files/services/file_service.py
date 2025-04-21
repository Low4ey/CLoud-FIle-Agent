from typing import Tuple, Dict, Any, Optional, List

from ..interfaces.file_repository import FileRepositoryInterface
from ..interfaces.storage_service import StorageServiceInterface
from ..models.file import File

class FileService:
    """Service for file operations."""
    
    def __init__(self, file_repository: FileRepositoryInterface, storage_service: StorageServiceInterface):
        self.file_repository = file_repository
        self.storage_service = storage_service
    
    def upload_file(self, file_obj) -> Tuple[File, bool]:
        """
        Upload a file with deduplication.

        Returns:
            Tuple[File, bool]: A tuple containing the file object and a boolean indicating if it's a duplicate
        """
        # Calculate file hash
        file_hash = self.storage_service.calculate_hash(file_obj)

        # Check if file already exists using the hash
        existing_file = self.file_repository.find_by_hash(file_hash)
        if existing_file:
            # Increment reference count
            existing_file.reference_count += 1
            self.file_repository.update(existing_file)  # Save the updated reference count
            return existing_file, True

        # No duplicate found, create a new file record
        file_data = {
            'file': file_obj,
            'original_filename': file_obj.name,
            'file_type': file_obj.content_type,
            'size': file_obj.size,
            'hash': file_hash,
            'reference_count': 1  # Initial reference count
        }

        file_instance = self.file_repository.save(file_data)
        return file_instance, False

    
    def get_file(self, file_id: str) -> Optional[File]:
        """Get a file by its ID."""
        return self.file_repository.find_by_id(file_id)
    
    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file by its ID.
        Always completely delete the file from the database regardless of reference count.
        """
        file = self.file_repository.find_by_id(file_id)
        if not file:
            return False
            
        # Always delete the file completely from the database
        return self.file_repository.delete(file_id)
    
    def get_all_files(self, **filters) -> List[File]:
        """
        Get all files matching filters.
        
        Args:
            **filters: Filter parameters
                - file_type (str): Filter by file type (can be partial match)
                - filename (str): Filter by filename (can be partial match)
                - date_from (datetime): Filter files created after this date
                - date_to (datetime): Filter files created before this date
        """
        # Handle file type filtering
        if 'file_type' in filters:
            file_type = filters['file_type']
            # If it ends with '/', it's a category (like 'image/')
            if file_type.endswith('/'):
                return self.file_repository.find_all(file_type__startswith=file_type)
            else:
                return self.file_repository.find_all(file_type__icontains=file_type)
        
        return self.file_repository.find_all(**filters)
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        return self.storage_service.get_stats()