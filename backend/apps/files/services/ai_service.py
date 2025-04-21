import os
import logging
from typing import Dict, Any, List, Optional

from google import generativeai as genai
from google.generativeai import types

from ..interfaces.ai_service import AIServiceInterface
from ..interfaces.file_repository import FileRepositoryInterface
from ..interfaces.chat_repository import ChatRepositoryInterface
from ..models.file import File
import base64
from io import BytesIO

# Configure logging
logger = logging.getLogger(__name__)

class GeminiAIService(AIServiceInterface):
    """Implementation of AI service using Google's Gemini API."""
    
    # Tool declarations for file operations
    _upload_file_function = {
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
                    "description": "Base64 encoded content of the file (not actually used in this function)",
                },
            },
            "required": ["filename", "file_type"],
        },
    }

    _search_files_function = {
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
                "min_size": {
                    "type": "integer",
                    "description": "Filter files larger than or equal to this size in bytes",
                },
                "max_size": {
                    "type": "integer",
                    "description": "Filter files smaller than or equal to this size in bytes",
                },
                "size_unit": {
                    "type": "string",
                    "description": "Unit for size filters (bytes, KB, MB, GB). Default is bytes",
                    "enum": ["bytes", "KB", "MB", "GB"]
                }
            },
            "required": ["query"],
        },
    }
    
    _list_or_show_files_function = {
        "name": "list_or_show_files",
        "description": "Lists or shows all files with their details and provides a summary of total size and count. This function handles both 'list' and 'show' commands.",
        "parameters": {
            "type": "object",
            "properties": {
                "command_type": {
                    "type": "string",
                    "description": "The type of command - either 'list' or 'show', both will perform the same operation",
                    "enum": ["list", "show"]
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of files to list (default: 50)",
                },
                "include_details": {
                    "type": "boolean",
                    "description": "Whether to include detailed information about each file (default: true)",
                },
                "min_size": {
                    "type": "integer",
                    "description": "Filter files larger than or equal to this size in bytes",
                },
                "max_size": {
                    "type": "integer",
                    "description": "Filter files smaller than or equal to this size in bytes",
                },
                "size_unit": {
                    "type": "string",
                    "description": "Unit for size filters (bytes, KB, MB, GB). Default is bytes",
                    "enum": ["bytes", "KB", "MB", "GB"]
                },
                "file_type": {
                    "type": "string",
                    "description": "Filter by file type (e.g., 'pdf', 'image','png', 'jpg', etc.)",
                }
            },
        },
    }
    
    _find_files_to_delete_function = {
        "name": "find_files_to_delete",
        "description": "Finds files with names matching a pattern that could be deleted. This is the first step of a two-step deletion process.",
        "parameters": {
            "type": "object",
            "properties": {
                "name_pattern": {
                    "type": "string",
                    "description": "Pattern to match against filenames (e.g., '.pdf', 'report','.png' etc.)",
                },
                "file_type": {
                    "type": "string",
                    "description": "Filter by file type (e.g., 'pdf', 'image', 'png', 'jpg', etc.)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of files to find (default: 20)",
                },
            },
            "required": ["name_pattern"],
        },
    }
    
    _delete_files_function = {
        "name": "delete_files",
        "description": "Deletes files by IDs. Should only be used after find_files_to_delete and user confirmation.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_ids": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Array of file IDs to delete",
                },
                "confirmed": {
                    "type": "boolean",
                    "description": "Whether the user has confirmed the deletion",
                },
            },
            "required": ["file_ids", "confirmed"],
        },
    }
    
    def __init__(self, file_repository: FileRepositoryInterface, chat_repository: ChatRepositoryInterface):
        self.file_repository = file_repository
        self.chat_repository = chat_repository
        self.chat_sessions = {}  # In-memory cache of active chat sessions
        
        # Initialize Gemini client
        try:
            self.api_key = os.getenv("GEMINI_API_KEY", "")
            if not self.api_key:
                logger.warning("GEMINI_API_KEY not found in environment variables")
            
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash", 
                generation_config={"temperature": 0.2}
            )
        except Exception as e:
            logger.error(f"Error initializing Gemini client: {str(e)}")
            self.model = None
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Return the tool declarations for Gemini."""
        tools = [
            {
                "function_declarations": [
                    self._upload_file_function, 
                    self._search_files_function,
                    self._list_or_show_files_function,
                    self._find_files_to_delete_function,
                    self._delete_files_function
                ]
            }
        ]
        return tools
    
    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get chat history for a session in a format usable by the Gemini model.
        
        Args:
            session_id (str): ID of the chat session
            
        Returns:
            list: List of message dictionaries in the format expected by Gemini
        """
        # Check if session exists in memory cache
        if session_id not in self.chat_sessions:
            # Load from database
            messages = self.chat_repository.get_messages(session_id)
            
            # Convert to Gemini format
            history = []
            for msg in messages:
                history.append({
                    "role": msg.role,
                    "parts": [{"text": msg.content}]
                })
            
            # Cache the session
            self.chat_sessions[session_id] = {
                "session_id": session_id,
                "history": history,
                "chat": None  # Will be initialized on first use
            }
        
        return self.chat_sessions[session_id]["history"]
    
    def create_chat_session(self, title: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new chat session.
        
        Args:
            title (str, optional): Title for the chat session
            
        Returns:
            dict: Session information
        """
        session = self.chat_repository.create_session(title)
        
        # Initialize in memory cache
        self.chat_sessions[str(session.id)] = {
            "session_id": str(session.id),
            "history": [],
            "chat": None
        }
        
        return {
            "id": str(session.id),
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat()
        }
    
    def process_message(self, 
                       message: str, 
                       file_attachments: Optional[List[str]] = None, 
                       files: Optional[List[Dict[str, Any]]] = None,
                       session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a user message, potentially handling new Base64 file uploads,
        and determine if it requires tool calling.
        
        Args:
            message (str): User input message
            file_attachments (list, optional): List of existing file IDs
            files (list, optional): List of new files to upload {name, type, base64Data}
            session_id (str, optional): ID of the chat session
            
        Returns:
            dict: Response with either direct text answer or tool call information
        """
        try:
            # Store the current session ID for context
            self.current_session_id = session_id

            if not self.api_key:
                return {
                    "type": "text",
                    "response": "Gemini API key not configured. Please set the GEMINI_API_KEY environment variable."
                }

            # Ensure file_attachments is a list if provided, otherwise initialize
            processed_file_ids = list(file_attachments) if file_attachments else []
            files_info = [] # To store info about processed files (both existing and new)

            # 1. Process newly uploaded Base64 files first
            if files and len(files) > 0:
                logger.info(f"Processing {len(files)} new Base64 files for session {session_id}")
                for file_data in files:
                    try:
                        file_name = file_data.get('name')
                        file_type = file_data.get('type')
                        base64_data = file_data.get('base64Data')

                        if not file_name or not base64_data:
                            logger.warning(f"Skipping file due to missing name or data: {file_data.get('name')}")
                            continue

                        # Decode Base64 data
                        decoded_content = base64.b64decode(base64_data)
                        file_content = BytesIO(decoded_content)
                        file_size = len(decoded_content)

                        # Create a temporary Django-like File object (or adapt file_repository)
                        # This assumes file_repository.add_file can handle BytesIO
                        from django.core.files.uploadedfile import SimpleUploadedFile
                        in_memory_file = SimpleUploadedFile(
                            name=file_name,
                            content=file_content.getvalue(),
                            content_type=file_type
                        )

                        # Save the file using the FileService, which handles deduplication
                        file_instance, is_duplicate = self.file_service.upload_file(in_memory_file)
                        
                        if file_instance:
                            file_id_str = str(file_instance.id)
                            processed_file_ids.append(file_id_str) # Add new ID to our list
                            files_info.append({
                                "id": file_id_str,
                                "filename": file_instance.original_filename,
                                "file_type": file_instance.file_type,
                                "size": file_instance.size,
                                "is_duplicate": is_duplicate,
                                "reference_count": file_instance.reference_count
                            })
                            logger.info(f"Successfully processed and saved Base64 file: {file_instance.original_filename} (ID: {file_id_str}), Duplicate: {is_duplicate}")
                        else:
                             logger.error(f"Failed to save file instance for: {file_name}")

                    except base64.binascii.Error as b64e:
                        logger.error(f"Base64 decoding error for file {file_data.get('name', 'Unknown')}: {str(b64e)}")
                    except Exception as e:
                        logger.error(f"Error processing Base64 file {file_data.get('name', 'Unknown')}: {str(e)}")
            
            # Now, `processed_file_ids` contains both original attachments and newly uploaded file IDs
            # And `files_info` contains details of the newly processed files.

            # Check if message contains a marker indicating files were already processed in the frontend
            # This marker is less relevant now as we process base64 files here, but keep for context
            files_already_processed_marker = "[FILES_ALREADY_PROCESSED]" in message
            if files_already_processed_marker:
                message = message.replace("[FILES_ALREADY_PROCESSED]", "").strip()
            
            # Create a new session if none provided
            if not session_id:
                session = self.chat_repository.create_session("New Conversation")
                session_id = str(session.id)

            # 3. Check for file upload intent in the message
            import re
            upload_intent_pattern = re.search(r"\b(upload|attach|send|share)\s+(?:this|these|the|a|my|some)?\s*file", message.lower())
            upload_only_request = re.search(r"^\s*(please\s+)?(upload|attach|send|share)(\s+this|\s+that|\s+these|\s+the|\s+a|\s+my|\s+some)?\s+file(s)?\s*\.?\s*$", message.lower())
            
            # --- MODIFIED CONDITION ---            
            # Special handling for file upload requests IF NO files were provided AT ALL
            # (neither existing attachments nor new Base64 files)
            if (upload_intent_pattern or upload_only_request) and not processed_file_ids:
                logger.info(f"User message indicates upload intent but no files provided (session: {session_id})")
                user_message = self.chat_repository.add_message(
                    session_id=session_id,
                    role="user",
                    content=message
                )
                
                response_text = (
                    "To upload a file, please use one of these methods:\n\n"
                    "1. Click the paperclip icon in the chat input area, then select a file from your device\n"
                    "2. Drag and drop a file directly into the chat input area\n"
                    "3. Use the Upload button in the navigation bar for larger files\n\n"
                    "Once you've selected a file, you can add a message describing what you'd like to do with it before sending."
                )
                
                assistant_message = self.chat_repository.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=response_text
                )
                
                return {
                    "type": "text",
                    "response": response_text,
                    "session_id": session_id,
                    "message_id": str(assistant_message.id)
                }
            
            # Prepare the message with context about attached files
            context_message = message
            # Use the combined list of processed file IDs
            if processed_file_ids:
                # Add file information to the prompt to provide context
                # Fetch info for files that weren't processed in this call (original attachments)
                existing_files_info = []
                original_attachment_ids = set(file_attachments or [])
                newly_processed_ids = set(f["id"] for f in files_info)
                ids_to_fetch = original_attachment_ids - newly_processed_ids

                for file_id in ids_to_fetch:
                    try:
                        file = self.file_repository.find_by_id(file_id)
                        if file:
                            existing_files_info.append({
                                "id": str(file.id),
                                "filename": file.original_filename,
                                "file_type": file.file_type,
                                "size": file.size
                            })
                    except Exception as e:
                        logger.error(f"Error retrieving previously attached file info with ID {file_id}: {str(e)}")
                
                # Combine newly processed file info with existing file info
                all_files_context_info = files_info + existing_files_info

                if all_files_context_info:
                    file_context = "\n\nAttached files:\n"
                    for idx, file in enumerate(all_files_context_info, 1):
                        file_context += f"{idx}. {file.get('filename', 'Unknown')} ({file.get('file_type', 'N/A')}), Size: {self._format_file_size(file.get('size', 0))}, ID: {file.get('id', 'N/A')}"
                        if file.get('is_duplicate'): # Add duplicate info if available
                             file_context += f" (Duplicate - Refs: {file.get('reference_count', 'N/A')})"
                        file_context += "\n"
                    
                    context_message = f"{message}\n{file_context}"
            
            # Add special instruction to NOT use upload_file tool if files were provided
            if files and len(files) > 0: # Check if new files were provided via Base64
                context_message += "\n\nNOTE: Files were provided directly. DO NOT ask for file details or try to use the upload_file tool. DO NOT respond with instructions for uploading files."
            
            # Get or create a Gemini chat session
            if session_id in self.chat_sessions and self.chat_sessions[session_id]["chat"]:
                # Use existing chat
                chat = self.chat_sessions[session_id]["chat"]
            else:
                # Initialize chat with history
                history = self.get_chat_history(session_id)
                
                # Create a new chat with the history
                chat_model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash", 
                    generation_config={"temperature": 0.2}
                )
                chat = chat_model.start_chat(history=history if history else [])
                
                # Cache the chat
                if session_id not in self.chat_sessions:
                    self.chat_sessions[session_id] = {
                        "session_id": session_id,
                        "history": history if history else [],
                        "chat": chat
                    }
                else:
                    self.chat_sessions[session_id]["chat"] = chat
            
            # Get tools for the model
            tools = self.get_tools()
            
            # Store the user message in history
            user_message = self.chat_repository.add_message(
                session_id=session_id,
                role="user",
                content=message,
                file_attachments=processed_file_ids # Use the combined list
            )
            
            # Update in-memory history
            self.chat_sessions[session_id]["history"].append({
                "role": "user",
                "parts": [{"text": context_message}]
            })
            
            # Generate content using the model with chat history
            try:
                response = chat.send_message(
                    context_message,
                    tools=tools
                )
            except Exception as e:
                logger.error(f"Error generating response with chat history: {str(e)}")
                # Fall back to regular model without history
                response = self.model.generate_content(
                    context_message,
                    tools=tools
                )
            
            # Check if the response contains a valid function call
            has_function_call = (
                hasattr(response, 'candidates') and 
                response.candidates and 
                hasattr(response.candidates[0], 'content') and 
                hasattr(response.candidates[0].content, 'parts') and 
                response.candidates[0].content.parts and 
                hasattr(response.candidates[0].content.parts[0], 'function_call') and
                response.candidates[0].content.parts[0].function_call and
                hasattr(response.candidates[0].content.parts[0].function_call, 'name') and
                response.candidates[0].content.parts[0].function_call.name
            )
            
            # If files are already processed, check if we're trying to use upload_file
            # and prevent it by returning a text response instead
            if has_function_call and (files and len(files) > 0): # Check if new files were provided
                function_call = response.candidates[0].content.parts[0].function_call
                if function_call.name == "upload_file":
                    logger.warning(f"Prevented unnecessary 'upload_file' tool call for session {session_id}")
                    # Skip this function call and return a text response about the files
                    files_context_info_to_show = files_info # Show info for newly processed files
                    if not files_context_info_to_show and processed_file_ids:
                         # Fallback: Fetch info for all processed IDs if files_info is empty
                         files_context_info_to_show = []
                         for fid in processed_file_ids:
                              try:
                                   f = self.file_repository.find_by_id(fid)
                                   if f: files_context_info_to_show.append({"filename": f.original_filename, "file_type": f.file_type})
                              except: pass # Ignore errors here

                    if files_context_info_to_show:
                        file_text = ", ".join([f"{info.get('filename', 'Unknown')} ({info.get('file_type', 'N/A')})" for info in files_context_info_to_show])
                        response_text = f"I see you've already attached: {file_text}. What would you like me to do with these files?"
                    else:
                        response_text = "I've received your files. What would you like me to do with them?"
                    
                    # Store response in history
                    assistant_message = self.chat_repository.add_message(
                        session_id=session_id,
                        role="assistant",
                        content=response_text
                    )
                    
                    return {
                        "type": "text",
                        "response": response_text,
                        "session_id": session_id,
                        "message_id": str(assistant_message.id)
                    }
            
            if has_function_call:
                function_call = response.candidates[0].content.parts[0].function_call
                
                logger.info(f"Function to call: {function_call.name}")
                logger.info(f"Arguments: {function_call.args}")
                
                # Execute the function call immediately to get formatted results
                tool_result = self.execute_tool_call(function_call.name, function_call.args, session_id)
                formatted_result = self._format_tool_result(function_call.name, tool_result, session_id)
                
                # Store the assistant message in history with the formatted result
                assistant_message = self.chat_repository.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=formatted_result
                )
                
                # Update in-memory history
                self.chat_sessions[session_id]["history"].append({
                    "role": "assistant",
                    "parts": [{"text": formatted_result}]
                })
                
                # Return the formatted result
                return {
                    "type": "text",
                    "response": formatted_result,
                    "session_id": session_id,
                    "message_id": str(assistant_message.id)
                }
            else:
                # Get the text response
                response_text = response.text
                
                # If files are attached, add a helpful response about the files
                # Use combined list and potentially combined info
                if processed_file_ids and all_files_context_info:
                    file_info_text = "I see you've attached "
                    if len(all_files_context_info) == 1:
                        file = all_files_context_info[0]
                        file_info_text += f"a file: {file.get('filename', 'Unknown')} ({file.get('file_type', 'N/A')}). "
                    else:
                        file_info_text += f"{len(all_files_context_info)} files: "
                        file_info_text += ", ".join([f['filename'] for f in all_files_context_info if f.get('filename')])
                        file_info_text += ". "
                    
                    file_info_text += "How can I help you with these files? I can assist with organizing, searching, or answering questions about them."
                    
                    # If the model already mentioned the files, just return that
                    if "file" in response_text.lower() or "attach" in response_text.lower():
                        assistant_message_text = response_text
                    else:
                        # Otherwise, add our file context
                        assistant_message_text = f"{file_info_text}\n\n{response_text if response_text else 'How can I help you with these files?'}"
                else:
                    # No files, just use the text response
                    assistant_message_text = response_text
                
                # Store the assistant message in history
                assistant_message = self.chat_repository.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=assistant_message_text
                )
                
                # Update in-memory history
                self.chat_sessions[session_id]["history"].append({
                    "role": "assistant",
                    "parts": [{"text": assistant_message_text}]
                })
                
                return {
                    "type": "text",
                    "response": assistant_message_text,
                    "session_id": session_id,
                    "message_id": str(assistant_message.id)
                }
                
        except Exception as e:
            logger.error(f"Error processing message with Gemini: {str(e)}")
            return {
                "type": "text",
                "response": f"Error processing your request: {str(e)}",
                "session_id": session_id
            }
    
    def execute_tool_call(self, function_name: str, args: Dict[str, Any], 
                         session_id: Optional[str] = None) -> Dict[str, Any]:
        """Execute a tool call with the given arguments."""
        try:
            if function_name == "upload_file":
                # Get file from attachments
                file_id = args.get("file_id")
                if not file_id:
                    return {"error": "No file ID provided"}
                    
                file = self.file_repository.find_by_id(file_id)
                if not file:
                    return {"error": "File not found"}
                    
                # Upload file and check for duplication
                file_instance, is_duplicate = self.file_repository.upload_file(file)
                
                response = {
                    "status": "success",
                    "file_id": str(file_instance.id),
                    "filename": file_instance.original_filename,
                    "size": file_instance.size,
                    "is_duplicate": is_duplicate
                }
                
                # Add duplication message if needed
                if is_duplicate:
                    response["message"] = f"This file already exists in the system. Reference count increased to {file_instance.reference_count}."
                
                return response
                
            elif function_name == "search_files":
                return self._search_files(**args)
                
            elif function_name == "list_or_show_files":
                # Make sure all parameters are properly passed through
                return self._list_or_show_files(**args)
                
            elif function_name == "find_files_to_delete":
                return self._find_files_to_delete(**args)
                
            elif function_name == "delete_files":
                return self._delete_files(**args)
                
            else:
                return {"error": f"Unknown function: {function_name}"}
                
        except Exception as e:
            logger.error(f"Error executing tool call {function_name}: {str(e)}")
            return {"error": str(e)}
    
    def _format_tool_result(self, function_name: str, result: Dict[str, Any], session_id: Optional[str] = None) -> str:
        """Format tool result as a readable message."""
        if function_name == "search_files" and "results" in result:
            files = result["results"]
            if files and len(files) > 0:
                response = f"I found {len(files)} files matching your query:\n\n"
                for idx, file in enumerate(files, 1):
                    response += f"{idx}. {file['filename']} ({file['file_type']}) - {file.get('formatted_size', '')}\n"
            else:
                response = "I didn't find any files matching your query. Try a different search term or check if the files exist."
            return response
            
        elif function_name == "list_or_show_files" and "summary" in result:
            summary = result["summary"]
            files = result.get("files", [])
            
            response = f"File Storage Summary:\n"
            response += f"Total Files: {summary['total_files']}\n"
            response += f"Unique Files: {summary['unique_files']}\n"
            response += f"Total Storage: {summary['formatted_total_size']}\n"
            response += f"Deduplication Savings: {summary['duplicate_percentage']}% ({summary['saved_files']} files)\n\n"
            
            if files and len(files) > 0:
                response += f"Files ({len(files)}):\n\n"
                for idx, file in enumerate(files, 1):
                    response += f"{idx}. {file['filename']} ({file['file_type']}) - {file['formatted_size']}\n"
                    if file.get('reference_count', 0) > 1:
                        response += f"   References: {file['reference_count']}\n"
            elif summary['total_files'] > 0:
                response += f"You have {summary['total_files']} files in storage. Request details to see the list."
            else:
                response += "There are no files in storage yet. Use the Upload button to add files."
                
            return response
            
        elif function_name == "find_files_to_delete" and "results" in result:
            files = result["results"]
            pattern = result.get("pattern", "")
            
            if files and len(files) > 0:
                response = f"I found {len(files)} files matching the pattern '{pattern}':\n\n"
                for idx, file in enumerate(files, 1):
                    response += f"{idx}. {file['filename']} ({file['file_type']}) - {file.get('formatted_size', '')}\n"
                
                # Store file IDs in context for the delete operation
                file_ids = [file["id"] for file in files]
                if session_id and session_id in self.chat_sessions:
                    self.chat_sessions[session_id]["pending_deletion"] = file_ids
                
                response += "\nTo delete these files, simply type 'yes'."
                
            else:
                response = f"I didn't find any files matching the pattern '{pattern}'. Try a different pattern or check if the files exist."
            
            return response
            
        elif function_name == "delete_files":
            if "error" in result and result.get("requires_confirmation", False):
                return "Please confirm if you want to delete these files by typing 'yes'."
                
            if "deleted_count" in result:
                deleted_count = result["deleted_count"]
                total = result.get("total_requested", 0)
                
                if deleted_count > 0:
                    response = f"Successfully deleted {deleted_count} file{'s' if deleted_count > 1 else ''}."
                    
                    # If we have detailed file info, include it
                    if "files_info" in result and result["files_info"]:
                        response += " The following files were deleted:\n\n"
                        for idx, file in enumerate(result["files_info"], 1):
                            response += f"{idx}. {file['filename']}\n"
                else:
                    response = "No files were deleted. There might have been an error or the files may not exist."
                
                return response
        
        elif function_name == "upload_file":
            return "To upload a file, please use the Upload button in the navigation bar or drag and drop files into the upload area."
        
        # If result is a dict, format it more nicely
        if isinstance(result, dict):
            try:
                # Convert to a more readable format
                return self._format_dict_result(result)
            except Exception as e:
                logger.error(f"Error formatting dict result: {str(e)}")
                
        # Default text if we can't format specifically
        return f"Result from {function_name}: {str(result)}"
    
    def _format_dict_result(self, result: Dict[str, Any]) -> str:
        """Format a dictionary result in a more readable way."""
        if not result:
            return "No results found."
            
        # Start with an empty string
        formatted = ""
        
        # Handle common result structures
        if "error" in result:
            return f"Error: {result['error']}"
            
        if "message" in result:
            formatted += f"{result['message']}\n\n"
            
        if "status" in result:
            formatted += f"Status: {result['status']}\n"
            
        # Handle results with file information
        if "file_id" in result:
            formatted += f"File ID: {result['file_id']}\n"
            
        if "filename" in result:
            formatted += f"Filename: {result['filename']}\n"
            
        if "size" in result:
            size = result['size']
            if isinstance(size, int):
                formatted += f"Size: {self._format_file_size(size)}\n"
            else:
                formatted += f"Size: {size}\n"
                
        if "is_duplicate" in result:
            formatted += f"Is duplicate: {result['is_duplicate']}\n"
            
        # If we didn't format anything specifically, return a generic message
        if not formatted:
            # Try to make it more readable than just the raw dict
            readable_parts = []
            for key, value in result.items():
                readable_parts.append(f"{key}: {value}")
                
            formatted = "\n".join(readable_parts)
            
        return formatted.strip()
    
    def _search_files(self, query: str = "", file_type: Optional[str] = None, 
                   date_from: Optional[str] = None, date_to: Optional[str] = None,
                   min_size: Optional[int] = None, max_size: Optional[int] = None,
                   size_unit: str = "bytes") -> Dict[str, Any]:
        """
        Search for files based on various criteria.
        
        Args:
            query (str): Search query string
            file_type (str, optional): Filter by file type
            date_from (str, optional): Filter files uploaded after this date
            date_to (str, optional): Filter files uploaded before this date
            min_size (int, optional): Minimum file size for filtering
            max_size (int, optional): Maximum file size for filtering
            size_unit (str, optional): Unit for size filters (bytes, KB, MB, GB)
            
        Returns:
            dict: Search results
        """
        try:
            # Get all files from repository
            files = self.file_repository.find_all()
            
            # Apply filters
            filtered_files = files
            
            if query:
                filtered_files = [f for f in filtered_files if query.lower() in f.original_filename.lower()]
            
            if file_type:
                filtered_files = [f for f in filtered_files if f.file_type.lower() == file_type.lower()]
            
            if date_from:
                filtered_files = [f for f in filtered_files if f.uploaded_at and f.uploaded_at >= date_from]
            
            if date_to:
                filtered_files = [f for f in filtered_files if f.uploaded_at and f.uploaded_at <= date_to]
            
            if min_size or max_size:
                conversion_factor = 1
                if size_unit.lower() == "kb":
                    conversion_factor = 1024
                elif size_unit.lower() == "mb":
                    conversion_factor = 1024 * 1024
                elif size_unit.lower() == "gb":
                    conversion_factor = 1024 * 1024 * 1024
                
                if min_size:
                    min_bytes = min_size * conversion_factor
                    filtered_files = [f for f in filtered_files if f.size >= min_bytes]
                
                if max_size:
                    max_bytes = max_size * conversion_factor
                    filtered_files = [f for f in filtered_files if f.size <= max_bytes]
            
            # Prepare results
            results = []
            for file in filtered_files:
                results.append({
                    "id": str(file.id),
                    "filename": file.original_filename,
                    "file_type": file.file_type,
                    "size": file.size,
                    "formatted_size": self._format_file_size(file.size),
                    "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None
                })
            
            return {"results": results}
        
        except Exception as e:
            logger.error(f"Error searching files: {str(e)}")
            return {"error": str(e)}
    
    def _list_files(self, limit: int = 50, include_details: bool = True,
                  min_size: Optional[int] = None, max_size: Optional[int] = None,
                  size_unit: str = "bytes", file_type: Optional[str] = None) -> Dict[str, Any]:
        """
        List all files in the system with pagination.
        
        Args:
            limit (int, optional): Maximum number of files to return. Defaults to 50.
            include_details (bool, optional): Whether to include file details. Defaults to True.
            min_size (int, optional): Minimum file size for filtering
            max_size (int, optional): Maximum file size for filtering
            size_unit (str, optional): Unit for size filters (bytes, KB, MB, GB)
            file_type (str, optional): Filter by file type (e.g., 'pdf', 'image')
            
        Returns:
            dict: List of files and summary statistics
        """
        try:
            # Get all files from repository
            files = self.file_repository.find_all()
            
            # Apply size filters if provided
            filtered_files = files
            
            # Apply file type filter if provided
            if file_type:
                filtered_files = [f for f in filtered_files if f.file_type and file_type.lower() in f.file_type.lower()]
            
            # Convert unit to bytes for comparison
            if min_size is not None or max_size is not None:
                # Conversion factor based on size unit
                conversion_factor = 1
                if size_unit.lower() == "kb":
                    conversion_factor = 1024
                elif size_unit.lower() == "mb":
                    conversion_factor = 1024 * 1024
                elif size_unit.lower() == "gb":
                    conversion_factor = 1024 * 1024 * 1024
                
                # Apply size filters
                if min_size is not None:
                    min_bytes = min_size * conversion_factor
                    filtered_files = [f for f in filtered_files if f.size >= min_bytes]
                
                if max_size is not None:
                    max_bytes = max_size * conversion_factor
                    filtered_files = [f for f in filtered_files if f.size <= max_bytes]
            
            # Calculate size and reference statistics
            total_files = len(files)
            unique_files = sum(1 for f in files if f.reference_count == 1)
            duplicate_files = total_files - unique_files
            
            total_size = sum(f.size for f in files)
            unique_size = sum(f.size for f in files if f.reference_count == 1)
            
            duplicate_percentage = 0
            if total_files > 0:
                duplicate_percentage = int((duplicate_files / total_files) * 100)
            
            # Prepare file details
            file_details = []
            if include_details:
                # Apply limit and convert to dictionaries
                for idx, file in enumerate(filtered_files[:limit]):
                    file_details.append({
                        "id": str(file.id),
                        "filename": file.original_filename,
                        "file_type": file.file_type,
                        "size": file.size,
                        "formatted_size": self._format_file_size(file.size),
                        "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None,
                        "reference_count": file.reference_count
                    })
            
            # Return results
            return {
                "summary": {
                    "total_files": total_files,
                    "unique_files": unique_files,
                    "duplicate_files": duplicate_files,
                    "duplicate_percentage": duplicate_percentage,
                    "saved_files": duplicate_files,
                    "total_size": total_size,
                    "formatted_total_size": self._format_file_size(total_size),
                    "unique_size": unique_size,
                    "formatted_unique_size": self._format_file_size(unique_size)
                },
                "files": file_details,
                "filtered_count": len(filtered_files)
            }
            
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            return {"error": str(e)}
    
    def _format_file_size(self, size_in_bytes: int) -> str:
        """
        Format a file size from bytes to a human-readable format.
        
        Args:
            size_in_bytes (int): The file size in bytes
            
        Returns:
            str: Formatted file size (e.g., "1.2 MB")
        """
        if size_in_bytes < 1024:
            return f"{size_in_bytes} bytes"
        elif size_in_bytes < 1024 * 1024:
            return f"{size_in_bytes / 1024:.1f} KB"
        elif size_in_bytes < 1024 * 1024 * 1024:
            return f"{size_in_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_in_bytes / (1024 * 1024 * 1024):.1f} GB"
    
    def _list_or_show_files(self, command_type: str = "list", limit: int = 50, include_details: bool = True,
                         min_size: Optional[int] = None, max_size: Optional[int] = None,
                         size_unit: str = "bytes", file_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Lists or shows all files with their details and provides a summary of total size and count.
        
        Args:
            command_type (str): The type of command - either 'list' or 'show'
            limit (int, optional): Maximum number of files to list. Defaults to 50.
            include_details (bool, optional): Whether to include detailed information about each file. Defaults to True.
            min_size (int, optional): Minimum file size for filtering
            max_size (int, optional): Maximum file size for filtering
            size_unit (str, optional): Unit for size filters (bytes, KB, MB, GB). Defaults to bytes.
            file_type (str, optional): Filter by file type (e.g., 'pdf', 'image')
            
        Returns:
            dict: List of files and summary statistics
        """
        return self._list_files(limit=limit, include_details=include_details, min_size=min_size, max_size=max_size, size_unit=size_unit, file_type=file_type)
    
    def _find_files_to_delete(self, name_pattern: str, file_type: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """
        Finds files with names matching a pattern that could be deleted.
        
        Args:
            name_pattern (str): Pattern to match against filenames
            file_type (str, optional): Filter by file type
            limit (int, optional): Maximum number of files to find
            
        Returns:
            dict: Files matching the pattern
        """
        try:
            # Get all files from repository
            files = self.file_repository.find_all()
            
            # Apply filters
            filtered_files = files
            
            if name_pattern:
                filtered_files = [f for f in filtered_files if name_pattern.lower() in f.original_filename.lower()]
            
            if file_type:
                filtered_files = [f for f in filtered_files if f.file_type.lower() == file_type.lower()]
            
            # Limit results
            if limit and limit > 0:
                filtered_files = filtered_files[:limit]
            
            # Prepare results
            results = []
            for file in filtered_files:
                results.append({
                    "id": str(file.id),
                    "filename": file.original_filename,
                    "file_type": file.file_type,
                    "size": file.size,
                    "formatted_size": self._format_file_size(file.size),
                    "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None
                })
            
            return {
                "pattern": name_pattern,
                "file_type": file_type,
                "results": results
            }
        
        except Exception as e:
            logger.error(f"Error finding files to delete: {str(e)}")
            return {"error": str(e)}
            
    def _delete_files(self, file_ids: List[str], confirmed: bool = False) -> Dict[str, Any]:
        """
        Deletes files by IDs after confirmation.
        
        Args:
            file_ids (list): List of file IDs to delete
            confirmed (bool): Whether the user has confirmed the deletion
            
        Returns:
            dict: Result of the deletion operation
        """
        try:
            if not file_ids:
                return {
                    "error": "No file IDs provided",
                    "deleted_count": 0,
                    "total_requested": 0
                }
            
            if not confirmed:
                return {
                    "error": "Deletion not confirmed",
                    "requires_confirmation": True,
                    "total_requested": len(file_ids)
                }
            
            # Get file information before deletion for reporting
            files_info = []
            for file_id in file_ids:
                file = self.file_repository.find_by_id(file_id)
                if file:
                    files_info.append({
                        "id": str(file.id),
                        "filename": file.original_filename,
                        "file_type": file.file_type,
                        "size": file.size
                    })
            
            # Delete files
            deleted_count = 0
            for file_id in file_ids:
                try:
                    success = self.file_repository.delete(file_id)
                    if success:
                        deleted_count += 1
                except Exception as e:
                    logger.error(f"Error deleting file {file_id}: {str(e)}")
            
            return {
                "deleted_count": deleted_count,
                "total_requested": len(file_ids),
                "files_info": files_info
            }
        
        except Exception as e:
            logger.error(f"Error deleting files: {str(e)}")
            return {"error": str(e)}