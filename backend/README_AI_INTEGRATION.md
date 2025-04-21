# AI Assistant with Google Gemini Tool Calling

This application integrates the Google Gemini AI model with tool calling capabilities for enhanced file management and search functionality.

## Features

- **Natural Language File Search**: Search for files using natural language queries
- **Tool Calling**: The AI can automatically identify when to search for files or provide upload guidance
- **Conversational Interface**: Chat with the AI to get help with file management

## Configuration

1. Get a Google Gemini API key from: https://ai.google.dev/
2. Add your API key to the `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Tool Descriptions

The AI assistant is configured with the following tools:

### 1. Search Files Tool

```python
search_files_function = {
    "name": "search_files",
    "description": "Searches for files based on filename, type, or other criteria.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query string to match against filenames",
            },
            "file_type": {
                "type": "string",
                "description": "Filter by file type (e.g., 'pdf', 'image')",
            },
            "date_from": {
                "type": "string",
                "description": "Filter files uploaded after this date (format: YYYY-MM-DD)",
            },
            "date_to": {
                "type": "string",
                "description": "Filter files uploaded before this date (format: YYYY-MM-DD)",
            },
        },
        "required": ["query"],
    },
}
```

### 2. Upload File Tool

```python
upload_file_function = {
    "name": "upload_file",
    "description": "Uploads a file to the system and performs deduplication.",
    "parameters": {
        "type": "object",
        "properties": {
            "filename": {
                "type": "string",
                "description": "Name of the file to upload",
            },
            "file_type": {
                "type": "string",
                "description": "MIME type of the file (e.g., 'application/pdf')",
            },
            "size": {
                "type": "integer",
                "description": "Size of the file in bytes",
            },
            "content": {
                "type": "string",
                "description": "Base64 encoded content of the file (not actually used)",
            },
        },
        "required": ["filename", "file_type"],
    },
}
```

## Usage Examples

### File Search

Users can ask queries like:
- "Find all PDF files"
- "Search for documents with 'report' in the name"
- "Find images uploaded last week"

### File Upload Guidance

Users can ask:
- "How do I upload a new file?"
- "I need to upload an image"
- "Help me upload a document"

## Implementation Details

The AI integration is built using:
- Google Generative AI Python SDK
- Django REST Framework
- React front-end with TypeScript

The tool calling functionality identifies when users are trying to search or upload files and routes those requests to the appropriate backend functions.

## Architecture

```
┌────────────┐     ┌─────────────┐     ┌────────────┐
│ React UI   │────▶│ Django API  │────▶│ Gemini API │
└────────────┘     └─────────────┘     └────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ File Storage│
                   └─────────────┘
``` 