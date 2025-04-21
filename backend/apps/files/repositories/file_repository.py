from typing import List, Optional, Dict, Any

from ..interfaces.file_repository import FileRepositoryInterface
from ..models.file import File

class DjangoFileRepository(FileRepositoryInterface):
    """Django ORM implementation of file repository."""
    
    def save(self, file_data: Dict[str, Any]) -> File:
        """Save a file using Django ORM."""
        if 'id' in file_data and file_data['id']:
            # Update existing file
            try:
                file = File.objects.get(id=file_data['id'])
                for key, value in file_data.items():
                    setattr(file, key, value)
                file.save()
                return file
            except File.DoesNotExist:
                pass
        
        # Create new file
        file = File(**file_data)
        file.save()
        return file
        
    def find_by_hash(self, file_hash: str) -> Optional[File]:
        """Find a file by hash using Django ORM."""
        try:
            return File.objects.get(hash=file_hash)
        except File.DoesNotExist:
            return None
            
    def find_all(self, **filters) -> List[File]:
        """Find all files matching filters using Django ORM."""
        return list(File.objects.filter(**filters))
        
    def find_by_id(self, file_id: str) -> Optional[File]:
        """Find a file by its ID."""
        try:
            return File.objects.get(id=file_id)
        except File.DoesNotExist:
            return None
            
    def delete(self, file_id: str) -> bool:
        """Delete a file by its ID."""
        try:
            file = File.objects.get(id=file_id)
            file.delete()
            return True
        except File.DoesNotExist:
            return False 