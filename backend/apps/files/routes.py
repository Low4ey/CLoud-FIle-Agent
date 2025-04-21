from fastapi import APIRouter, HTTPException
from backend.services.file_service import FileService

router = APIRouter()

@router.get("/by-type/{file_type}")
async def list_files_by_type(file_type: str):
    """List all files of a specific type."""
    try:
        # Convert common type names to MIME types
        mime_type_map = {
            "pdf": "application/pdf",
            "image": "image/",
            "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "txt": "text/plain",
            "csv": "text/csv",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "zip": "application/zip"
        }
        
        # Get the MIME type pattern to search for
        search_pattern = mime_type_map.get(file_type.lower(), file_type)
        
        # Get files matching the type
        files = file_service.get_all_files(file_type=search_pattern)
        
        # Format response
        return {
            "status": "success",
            "count": len(files),
            "files": [
                {
                    "id": str(file.id),
                    "filename": file.original_filename,
                    "type": file.file_type,
                    "size": file.size,
                    "created_at": file.created_at.isoformat() if file.created_at else None,
                    "reference_count": file.reference_count
                }
                for file in files
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 