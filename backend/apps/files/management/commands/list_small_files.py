import os
from django.core.management.base import BaseCommand
from apps.files.models.file import File

class Command(BaseCommand):
    help = 'Lists all files smaller than a specified size (default: 10MB)'

    def add_arguments(self, parser):
        parser.add_argument('--max-size', type=int, default=10,
                            help='Maximum size in MB (default: 10)')

    def handle(self, *args, **options):
        max_size_mb = options['max_size']
        max_size_bytes = max_size_mb * 1024 * 1024  # Convert MB to bytes
        
        files = File.objects.filter(size__lte=max_size_bytes)
        
        self.stdout.write(self.style.SUCCESS(f'Found {len(files)} files smaller than {max_size_mb}MB:'))
        
        if len(files) == 0:
            self.stdout.write('No files found.')
            return
            
        # Sort by size for better readability
        files = sorted(files, key=lambda x: x.size)
        
        # Display the files with their sizes
        for file in files:
            size_mb = file.size / 1024 / 1024  # Convert bytes to MB
            self.stdout.write(f'{file.original_filename} - {size_mb:.2f} MB ({file.file_type})')