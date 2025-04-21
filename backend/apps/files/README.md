# Files App - SOLID Architecture

This Django app has been refactored to follow SOLID principles, resulting in a more maintainable, testable, and extensible codebase.

## Directory Structure

```
apps/files/
├── api/                  # API endpoints and URL routing
│   ├── urls.py           # URL routing configuration 
│   └── views.py          # API views with DRF
├── interfaces/           # Abstractions (interfaces) for dependency inversion
│   ├── ai_service.py     # AI service interface
│   ├── file_repository.py# File repository interface
│   └── storage_service.py# Storage service interface
├── models/               # Database models
│   └── file.py           # File model definition
├── repositories/         # Data access implementations
│   └── file_repository.py# Django ORM implementation
├── serializers/          # Data transformation
│   └── file_serializer.py# REST framework serializers
├── services/             # Business logic
│   ├── ai_service.py     # AI integration service
│   ├── file_service.py   # File operations service
│   └── storage_service.py# Storage and deduplication service
└── migrations/           # Database migrations
```

## SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each class has a single responsibility
   - Repository handles data access, services handle business logic, interfaces define contracts

2. **Open/Closed Principle (OCP)**
   - Code is open for extension but closed for modification
   - New implementations can be added without changing existing code

3. **Liskov Substitution Principle (LSP)**
   - Implementations are interchangeable through interfaces
   - Services depend on abstractions rather than concrete implementations

4. **Interface Segregation Principle (ISP)**
   - Focused interfaces with specific methods
   - No client depends on methods it doesn't use

5. **Dependency Inversion Principle (DIP)**
   - High-level modules (services) depend on abstractions
   - Low-level modules (repositories) implement those abstractions

## Key Features

### File Deduplication

The system implements file deduplication using SHA-256 hashing:

- When a file is uploaded, its hash is calculated
- If a file with the same hash exists, the reference count is incremented
- When a file is deleted, the reference count is decremented
- The file is only physically deleted when the reference count reaches zero

This approach saves storage space while maintaining references for each user.

### Storage Statistics

The storage statistics feature shows:

- Total number of files (including duplicates)
- Number of unique files
- Total logical size (what users think they're using)
- Saved space due to deduplication
- Percentage of duplicates in the system

### AI Assistant Tools

The AI assistant provides tools for file management:

- **list_files**: Get a summary of all files with their sizes, types, and total storage usage
- **search_files**: Find files based on filename, type, or date criteria
- **upload_file**: Handle file uploads with automatic deduplication

The AI assistant also provides intelligent handling of file attachments:
- Automatically recognizes when files are attached to messages
- Automatically processes file uploads without requiring additional user input
- Provides intelligent responses based on file content and user intent
- Formats file sizes in human-readable format (KB, MB, GB)
- Immediate file upload handling with real-time feedback

### Streamlined File Upload UX

The system features a streamlined file upload experience:
- Clicking the attach button immediately uploads and sends files
- No additional confirmation needed to share files
- Automatic detection of upload intent from message context
- Smart responses based on detected file types
- Properly formats file information in human-readable form
- Handles multiple files simultaneously

## Usage

The API provides the following endpoints:

- `GET /api/files/` - List all files
- `POST /api/files/` - Upload a new file
- `GET /api/files/{id}/` - Get a specific file
- `DELETE /api/files/{id}/` - Delete a file
- `GET /api/files/stats/` - Get storage statistics
- `GET /api/files/search/` - Search for files
- `POST /api/assistant/` - Interact with AI assistant

## Dependencies

- Django
- Django REST Framework
- Google Generative AI for AI assistant functionality 