import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import api, { ChatMessage as ChatMessageType, ChatSession } from '../../services/api';
import { PlusIcon } from '@heroicons/react/24/outline';

interface ChatInterfaceProps {
  initialSessionId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialSessionId }) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInitialSession = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (initialSessionId) {
          try {
            // Load existing session
            const loadedSession = await api.getChatSession(initialSessionId);
            setSession(loadedSession);
            setMessages(loadedSession.messages || []);
          } catch (sessionError) {
            console.error('Error loading specified chat session:', sessionError);
            // If the specified session doesn't exist, create a new one
            const newSession = await api.createChatSession();
            setSession(newSession);
            setMessages(newSession.messages || []);
            
            // Optionally update the URL to match the new session ID
            if (window.history && window.history.replaceState) {
              window.history.replaceState(
                null, 
                '', 
                window.location.pathname.replace(initialSessionId, newSession.id)
              );
            }
          }
        } else {
          // Create a new session
          const newSession = await api.createChatSession();
          setSession(newSession);
          setMessages(newSession.messages || []);
        }
      } catch (err) {
        console.error('Error loading chat session:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load chat session: ${errorMessage}. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialSession();
  }, [initialSessionId]);

  useEffect(() => {
    // Listen for AI responses (in a real app, this would be a more robust solution)
    const handleChatResponse = (event: Event) => {
      const customEvent = event as CustomEvent<{message: ChatMessageType, sessionId: string}>;
      if (customEvent.detail && session && customEvent.detail.sessionId === session.id) {
        setMessages(prev => [...prev, customEvent.detail.message]);
      }
    };

    window.addEventListener('chat-response', handleChatResponse);
    
    return () => {
      window.removeEventListener('chat-response', handleChatResponse);
    };
  }, [session]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await api.createChatSession();
      setSession(newSession);
      setMessages(newSession.messages || []);
    } catch (err) {
      console.error('Error creating new chat session:', err);
      setError('Failed to create new chat session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, files: File[]) => {
    if (!session) return;

    // Generate a unique ID for this message to prevent duplicates
    const messageId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Add user message immediately for better UX
    const optimisticUserMsg: ChatMessageType = {
      id: messageId, // Use consistent ID
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      // We will add file info later if needed for display
    };

    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      const isFileUpload = files.length > 0;
      const sessionId = session.id;

      // Double check that we have a valid session ID (UUID format)
      if (!sessionId || sessionId.length < 10) { // Simple check to avoid empty or very short IDs
        console.error('Invalid session ID:', sessionId);
        throw new Error('Invalid session ID. Please refresh and try again.');
      }

      if (isFileUpload) {
        // Add a "processing" message while converting files
        const processingMsg: ChatMessageType = {
          id: `assistant-processing-${Date.now()}`,
          role: 'assistant',
          content: `Preparing ${files.length} file${files.length > 1 ? 's' : ''}...`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, processingMsg]);

        // Convert files to Base64
        const filePromises = files.map(file => {
          return new Promise<{ name: string; type: string; base64Data: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // result is Data URL (e.g., "data:image/png;base64,iVBORw...")
              // We need to strip the prefix "data:*/*;base64,"
              const base64String = (reader.result as string).split(',')[1];
              if (base64String) {
                resolve({
                  name: file.name,
                  type: file.type,
                  base64Data: base64String,
                });
              } else {
                reject(new Error(`Failed to read file ${file.name}`));
              }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file); // Reads the file as a Base64 encoded Data URL
          });
        });

        let fileData: { name: string; type: string; base64Data: string }[] = [];
        try {
          fileData = await Promise.all(filePromises);

          // Optionally, update the processing message to confirmation
          const confirmationMsg: ChatMessageType = {
              ...processingMsg, // Reuse ID to replace
              content: `Sending message with ${fileData.length} file${fileData.length > 1 ? 's' : ''}...`,
          };
          setMessages(prev => prev.map(msg => msg.id === processingMsg.id ? confirmationMsg : msg));

        } catch (conversionError) {
            console.error("Error converting files to Base64:", conversionError);
            // Replace processing message with error
             const conversionErrorMsg: ChatMessageType = {
                ...processingMsg, // Reuse ID to replace
                role: 'assistant',
                content: `Error preparing files: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}. Message not sent.`,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => prev.map(msg => msg.id === processingMsg.id ? conversionErrorMsg : msg));
            return; // Stop processing if file conversion failed
        }


        // Send the message with Base64 file data included
        // Assuming api.sendChatMessage's 4th argument accepts this structure
        await api.sendChatMessage(
          sessionId,
          content.trim(), // Send the text content as well
          [], // No separate file IDs needed
          fileData // Pass the array of { name, type, base64Data } objects
        );
        // The response will come through WebSocket

      } else {
        // No files, just send the regular message
        await api.sendChatMessage(
          sessionId,
          content,
          [], // No file attachments (IDs)
          [] // No file data
        );
        // The response will come through WebSocket
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Display error message in chat
      const errorMessage: ChatMessageType = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleFileClick = (fileId: string) => {
    // In a real app, you would open a preview or download the file
    console.log('File clicked:', fileId);
  };

  if (isLoading && !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            <p>{error}</p>
            <button
              onClick={handleNewChat}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat header */}
      <div className="flex-none border-b border-gray-200 bg-white p-4 shadow-sm flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">
          {session?.title || 'New Conversation'}
        </h2>
        <button
          onClick={handleNewChat}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          New Chat
        </button>
      </div>
      
      {/* Chat messages - scrollable area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to Abnormal File Vault Assistant
                </h3>
                <p className="text-gray-600">
                  I can help you with file management, answer questions about your files, 
                  and provide guidance on using the storage system efficiently.
                </p>
                <p className="text-gray-600 mt-4">
                  Feel free to ask any questions or upload files for analysis.
                </p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onFileClick={handleFileClick}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Chat input - fixed at bottom */}
      <div className="flex-none border-t border-gray-200">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isDisabled={isLoading || !session}
        />
      </div>
    </div>
  );
};