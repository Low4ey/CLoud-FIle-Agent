from rest_framework import serializers
from ..models.file import File

class FileSerializer(serializers.ModelSerializer):
    """Serializer for File model."""
    
    class Meta:
        model = File
        fields = ['id', 'file', 'original_filename', 'file_type', 'size', 'hash', 'uploaded_at']
        read_only_fields = ['id', 'hash', 'uploaded_at']

class StorageStatsSerializer(serializers.Serializer):
    """Serializer for storage statistics."""
    
    total_files = serializers.IntegerField()
    unique_files = serializers.IntegerField()
    total_size_bytes = serializers.IntegerField()
    saved_size_bytes = serializers.IntegerField()
    duplicate_percentage = serializers.FloatField() 