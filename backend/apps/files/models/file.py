import uuid
from django.db import models

class File(models.Model):
    """File entity with basic properties."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    file = models.FileField(upload_to='files/')
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    hash = models.CharField(max_length=64, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reference_count = models.IntegerField(default=1)
    
    def __str__(self):
        return self.original_filename 