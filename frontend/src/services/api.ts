import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { File as FileType } from '../types/file';

// API response types
export interface StorageStats {
  total_files: number;
  unique_files: number;
  total_size_bytes: number;
  saved_size_bytes: number;
  duplicate_percentage: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  file_attachments?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface FileUploadResponse {
  file: FileType;
  is_duplicate: boolean;
  reference_count: number;
}

// Define the structure for Base64 file data
export interface Base64FileData {
  name: string;
  type: string;
  base64Data: string;
}

// Create and configure the API client
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add request interceptor for auth if needed
    this.client.interceptors.request.use(
      (config) => {
        // Example: Add auth token to requests
        // const token = localStorage.getItem('token');
        // if (token) {
        //   config.headers = config.headers || {};
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }
  
  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client(config);
    return response.data;
  }
  
  // Files API
  
  /**
   * Upload a file to the server
   * @param file The file to upload
   * @returns The uploaded file information and duplication status
   */
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.request<FileUploadResponse>({
      method: 'POST',
      url: '/files/',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Log the duplicate status so we know it's coming through
    if (response.is_duplicate) {
      console.log('Duplicate file detected:', response.file.original_filename);
    }
    
    return response;
  }
  
  /**
   * Get all files
   * @returns Array of file information
   */
  async getFiles(): Promise<FileType[]> {
    return this.request<FileType[]>({
      method: 'GET',
      url: '/files/',
    });
  }
  
  /**
   * Delete a file
   * @param id The ID of the file to delete
   */
  async deleteFile(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/files/${id}/`,
    });
  }
  
  /**
   * Download a file
   * @param fileUrl The URL of the file to download
   * @param filename The name to save the file as
   */
  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'blob',
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw new Error('Failed to download file');
    }
  }
  
  /**
   * Get storage statistics
   * @returns Statistics about storage usage and deduplication
   */
  async getStorageStats(): Promise<StorageStats> {
    return this.request<StorageStats>({
      method: 'GET',
      url: '/files/stats/',
    });
  }

  // Chat API

  /**
   * Get all chat sessions
   * @returns Array of chat sessions
   */
  async getChatSessions(): Promise<ChatSession[]> {
    try {
      // Make a real API call to get chat sessions
      return this.request<ChatSession[]>({
        method: 'GET',
        url: '/chat/sessions/',
      });
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      // Always throw the error to let the component handle it
      throw error;
    }
  }

  /**
   * Get a specific chat session
   * @param sessionId The ID of the chat session
   * @returns The chat session
   */
  async getChatSession(sessionId: string): Promise<ChatSession> {
    try {
      // Make a real API call to get a specific chat session
      return this.request<ChatSession>({
        method: 'GET',
        url: `/chat/sessions/${sessionId}/`,
      });
    } catch (error) {
      console.error(`Error fetching chat session ${sessionId}:`, error);
      // Always throw the error to let the component handle it
      throw error;
    }
  }

  /**
   * Create a new chat session
   * @returns The created chat session
   */
  async createChatSession(): Promise<ChatSession> {
    try {
      // Make a real API call to create a new chat session
      return this.request<ChatSession>({
        method: 'POST',
        url: '/chat/sessions/',
        data: {
          title: 'New Conversation'
        }
      });
    } catch (error) {
      console.error("Error creating chat session:", error);
      // Always throw the error to let the component handle it
      throw error;
    }
  }
  
  /**
   * Delete a chat session
   * @param sessionId The ID of the chat session to delete
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      // Make a real API call to delete a chat session
      await this.request<void>({
        method: 'DELETE',
        url: `/chat/sessions/${sessionId}/`,
      });
    } catch (error) {
      console.error(`Error deleting chat session ${sessionId}:`, error);
      // Always throw the error to let the component handle it
      throw error;
    }
  }

  /**
   * Send a message to a chat session
   * @param sessionId The ID of the chat session
   * @param content The message content
   * @param fileIds Optional array of existing file IDs to attach
   * @param files Optional array of new files to upload and attach
   * @param clientMessageId Optional client-generated message ID to prevent duplicates
   * @returns The updated chat session
   */
  async sendChatMessage(
    sessionId: string, 
    content: string, 
    fileIds: string[] = [], 
    files: Base64FileData[] = [],
    clientMessageId?: string
  ): Promise<ChatMessage> {
    // Validate session ID
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('Invalid session ID: Session ID cannot be empty');
    }
    
    // Validate UUID format
    try {
      // A simple regex to check for UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionId)) {
        throw new Error(`Invalid session ID format: ${sessionId}`);
      }
    } catch (error) {
      console.error('Session ID validation error:', error);
      throw new Error(`Invalid session ID: ${sessionId}`);
    }

    try {
      // Create the data payload for the backend
      const payload = {
        message: content,         // The user's text message
        session_id: sessionId,   // The current session ID
        file_attachments: fileIds || [], // Existing file IDs, if any
        files: files || [],       // New files with Base64 data
        client_message_id: clientMessageId // Pass the client ID if provided
      };

      // Make the API call to the backend assistant endpoint
      const response = await this.request<any>({
        method: 'POST',
        url: '/assistant/', // Assuming this endpoint handles both text and file data
        data: payload,
      });

      // Handle the response (modified existing logic)
      if (response) {
        // Wait a moment before showing the AI response
        setTimeout(() => {
          // Format and display the assistant's response
          let assistantContent = '';

          if (response.error) {
            assistantContent = `Error: ${response.error}`;
          } else if (response.type === 'tool_call') {
            // Generic handling for any tool call initiated by the backend
            // Avoid specific messages for 'upload_file' as frontend doesn't trigger it now
            if (response.function !== 'upload_file') { 
              const toolCallMessage: ChatMessage = {
                id: `assistant-tool-call-${Date.now()}`,
                role: 'assistant',
                content: `Using tool: \`${response.function}\``, // Simplified message
                timestamp: new Date().toISOString(),
              };
              if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('chat-response', { 
                  detail: { message: toolCallMessage, sessionId } 
                }));
              }
              
              // Show the tool result after a short delay
              setTimeout(() => {
                  const resultMessage: ChatMessage = {
                    id: `assistant-tool-result-${Date.now()}`,
                    role: 'assistant',
                    content: response.response || 'Tool execution finished.', // Use the response if available
                    timestamp: new Date().toISOString(),
                  };
                   if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('chat-response', { 
                      detail: { message: resultMessage, sessionId } 
                    }));
                  }
              }, 300);
            } else {
              // If backend still sends upload_file tool call, maybe log it but don't show confusing UI messages
              console.warn("Backend responded with upload_file tool call, which is unexpected in the new flow.");
              // Potentially set assistantContent based on response.response if available
              assistantContent = response.response || ''; 
            }

          } else if (response.response) {
            assistantContent = response.response;
          } else {
            assistantContent = "Received your message, but the response was unclear.";
          }

          // Create and dispatch the main assistant message (if not handled by tool call)
          if (assistantContent) {
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: assistantContent,
              timestamp: new Date().toISOString(),
            };
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('chat-response', { 
                detail: { message: assistantMessage, sessionId } 
              }));
            }
          }
        }, 300); // Delay for response display
      }

      // Return a representation of the user message that was sent
      // This might be useful for optimistic UI updates or tracking
      return {
        id: clientMessageId || `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        // Include file info if needed for UI consistency, though backend now has Base64
        // file_attachments: files.length > 0 ? files.map(f => f.name) : undefined 
      };

    } catch (err) {
      console.error('Error sending message via /assistant/ endpoint:', err);
      // Propagate the error for UI handling
      throw err;
    }
  }
}

export default new ApiClient(API_URL);