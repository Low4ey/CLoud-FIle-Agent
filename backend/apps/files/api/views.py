from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view

from ..services.file_service import FileService
from ..services.ai_service import GeminiAIService
from ..services.storage_service import FileStorageService
from ..repositories.file_repository import DjangoFileRepository
from ..repositories.chat_repository import DjangoChatRepository
from ..serializers.file_serializer import FileSerializer, StorageStatsSerializer
from ..serializers.chat_serializer import ChatSessionSerializer, ChatMessageSerializer
from ..models.chat import ChatSession, ChatMessage

# Create instances for dependency injection
file_repository = DjangoFileRepository()
chat_repository = DjangoChatRepository()
storage_service = FileStorageService(file_repository)
file_service = FileService(file_repository, storage_service)
ai_service = GeminiAIService(file_repository, chat_repository)
# Connect file_service to ai_service
ai_service.file_service = file_service

class FileViewSet(viewsets.ModelViewSet):
    """API endpoint for file operations."""
    serializer_class = FileSerializer
    
    def get_queryset(self):
        """Return all files."""
        return file_service.get_all_files()
    
    def create(self, request, *args, **kwargs):
        """Create a new file with deduplication."""
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Upload file with deduplication
        file_instance, is_duplicate = file_service.upload_file(file_obj)
        
        # Return the file data with duplicate flag
        serializer = self.get_serializer(file_instance)
        response_data = serializer.data
        response_data['is_duplicate'] = is_duplicate
        response_data['reference_count'] = file_instance.reference_count
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific file."""
        file_id = kwargs.get('pk')
        file_instance = file_service.get_file(file_id)
        
        if not file_instance:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(file_instance)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a file."""
        file_id = kwargs.get('pk')
        success = file_service.delete_file(file_id)
        
        if not success:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get storage statistics."""
        stats = file_service.get_storage_stats()
        serializer = StorageStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search files based on query parameters."""
        # Extract query parameters
        query = request.query_params.get('query', '')
        file_type = request.query_params.get('file_type', None)
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)
        
        # Use AI service to search files
        search_results = ai_service._search_files(
            query=query,
            file_type=file_type,
            date_from=date_from,
            date_to=date_to
        )
        
        return Response(search_results)


@api_view(['POST'])
def process_ai_message(request):
    """Process a message using the AI assistant."""
    try:
        data = request.data
        message = data.get('message', '')
        file_attachments = data.get('file_attachments', [])
        files_data = data.get('files', [])
        session_id = data.get('session_id')
        
        # Validate session_id if provided
        if session_id:
            try:
                # Check if session_id is a valid UUID
                import uuid
                uuid_obj = uuid.UUID(session_id)
                # If we get here, the UUID is valid
            except ValueError:
                # Invalid UUID, create a new one
                session = chat_repository.create_session()
                session_id = str(session.id)
        else:
            # No session_id provided, create a new one
            session = chat_repository.create_session()
            session_id = str(session.id)
        
        # Validate file_attachments format
        if not isinstance(file_attachments, list):
            return Response(
                {'error': 'file_attachments must be a list of file IDs'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify files exist in the database
        valid_file_attachments = []
        for file_id in file_attachments:
            try:
                file = file_repository.find_by_id(file_id)
                if file:
                    valid_file_attachments.append(file_id)
            except:
                # Skip invalid file IDs
                continue
        
        # Handle empty message with attachments as a file upload intent
        if not message and valid_file_attachments:
            message = "Here are some files I'd like to upload"
        
        # Process message with AI service
        response = ai_service.process_message(
            message=message, 
            file_attachments=valid_file_attachments,
            files=files_data,
            session_id=session_id
        )
        
        # Handle tool calls
        if response and response.get('type') == 'tool_call':
            function_name = response.get('function')
            args = response.get('args', {})
            
            # Execute the tool call
            result = ai_service.execute_tool_call(
                function_name=function_name, 
                args=args,
                session_id=response.get('session_id')
            )
            
            # Format the result if it's a text response
            formatted_result = ai_service._format_tool_result(
                function_name=function_name, 
                result=result,
                session_id=response.get('session_id')
            )
            
            # Add the result to the response
            response['result'] = result
            response['formatted_result'] = formatted_result
            
            # Handle special case for find_files_to_delete to save file IDs in the session
            if function_name == "find_files_to_delete" and "results" in result:
                file_ids = [file["id"] for file in result["results"]]
                session_id = response.get('session_id')
                if session_id and session_id in ai_service.chat_sessions:
                    ai_service.chat_sessions[session_id]["pending_deletion"] = file_ids
            
            # Handle special case for delete_files to get file IDs from the session
            if function_name == "delete_files" and not args.get("file_ids") and args.get("confirmed", False):
                session_id = response.get('session_id')
                if session_id and session_id in ai_service.chat_sessions:
                    pending_deletion = ai_service.chat_sessions[session_id].get("pending_deletion", [])
                    if pending_deletion:
                        # Update the result with actual deletion
                        result = ai_service._delete_files(file_ids=pending_deletion, confirmed=True)
                        # Re-format the result
                        formatted_result = ai_service._format_tool_result(
                            function_name=function_name,
                            result=result,
                            session_id=session_id
                        )
                        response['result'] = result
                        response['formatted_result'] = formatted_result
            
            # Record the AI assistant's response in chat history
            session_id = response.get('session_id')
            if session_id:
                assistant_message = chat_repository.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=formatted_result
                )
                response['message_id'] = str(assistant_message.id)
        
        return Response(response)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        error_message = str(e)
        # Provide a more detailed error message if possible
        return Response(
            {
                'error': f'Error processing request: {error_message}',
                'type': 'text',
                'response': f'Sorry, I encountered an error: {error_message}'
            }, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class ChatSessionViewSet(viewsets.ModelViewSet):
    """API endpoint for chat sessions."""
    serializer_class = ChatSessionSerializer
    
    def get_queryset(self):
        """Return all chat sessions."""
        return ChatSession.objects.all().order_by('-updated_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new chat session."""
        title = request.data.get('title', 'New Conversation')
        chat_session = chat_repository.create_session(title)
        serializer = self.get_serializer(chat_session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific chat session with messages."""
        chat_session = self.get_object()
        serializer = self.get_serializer(chat_session)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a chat session."""
        chat_session = self.get_object()
        success = chat_repository.delete_session(str(chat_session.id))
        if not success:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """Add a message to a chat session."""
        chat_session = self.get_object()
        role = request.data.get('role', 'user')
        content = request.data.get('content')
        file_attachments = request.data.get('file_attachments', [])
        
        if not content:
            return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        message = chat_repository.add_message(
            session_id=str(chat_session.id),
            role=role,
            content=content,
            file_attachments=file_attachments
        )
        
        serializer = ChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)