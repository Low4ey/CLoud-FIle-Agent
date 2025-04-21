import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { ChatSession } from '../services/api';
import { ChatInterface } from '../components/chat/ChatInterface';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export const ChatPage: React.FC = () => {
  const params = useParams();
  const sessionId = params.sessionId;
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loadedSessions = await api.getChatSessions();
        setSessions(loadedSessions);
        
        // If no session is selected, navigate to the most recent one
        if (!sessionId && loadedSessions.length > 0) {
          navigate(`/chat/${loadedSessions[0].id}`);
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
        setError('Failed to load chat sessions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSessions();
  }, [sessionId, navigate]);

  const handleNewChat = async () => {
    setError(null);
    try {
      const newSession = await api.createChatSession();
      setSessions(prev => [newSession, ...prev]);
      navigate(`/chat/${newSession.id}`);
    } catch (error) {
      console.error('Error creating new chat session:', error);
      setError('Failed to create a new chat session. Please try again.');
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setError(null);
    try {
      await api.deleteChatSession(id);
      setSessions(prev => prev.filter(session => session.id !== id));
      
      // If the current session is deleted, redirect to the first available one or create a new one
      if (sessionId === id) {
        const remainingSessions = sessions.filter(session => session.id !== id);
        if (remainingSessions.length > 0) {
          navigate(`/chat/${remainingSessions[0].id}`);
        } else {
          const newSession = await api.createChatSession();
          setSessions([newSession]);
          navigate(`/chat/${newSession.id}`);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete the chat session. Please try again.');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };
  
  const handleRetry = () => {
    // Reload sessions
    setIsLoading(true);
    api.getChatSessions()
      .then(loadedSessions => {
        setSessions(loadedSessions);
        setError(null);
        
        if (loadedSessions.length > 0) {
          navigate(`/chat/${loadedSessions[0].id}`);
        }
      })
      .catch(err => {
        console.error('Error retrying session load:', err);
        setError('Failed to load chat sessions. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-100">
      {/* Sidebar for chat history - conditionally show based on state */}
      <div 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } flex-none transition-all duration-300 ease-in-out overflow-hidden border-r border-gray-200 bg-white`}
      >
        <div className="flex flex-col h-full">
          <div className="flex-none p-4 border-b border-gray-200">
            <button
              onClick={handleNewChat}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : error ? (
              <div className="text-center p-4">
                <div className="text-red-500 mb-2">{error}</div>
                <button 
                  onClick={handleRetry}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Try Again
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center p-4 text-gray-500">No chat history yet</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {sessions.map(session => {
                  const isActive = sessionId === session.id;
                  const date = new Date(session.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });
                  
                  // Get first message or use title
                  const title = 
                    session.messages && session.messages.length > 0
                      ? session.messages[0].content.substring(0, 30) + (session.messages[0].content.length > 30 ? '...' : '')
                      : session.title;
                  
                  return (
                    <li 
                      key={session.id}
                      className={`hover:bg-gray-50 ${isActive ? 'bg-primary-50' : ''}`}
                    >
                      <a 
                        href={`/chat/${session.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/chat/${session.id}`);
                        }}
                        className="block px-4 py-3 relative"
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-sm font-medium text-gray-900 truncate flex-1">
                            {title}
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{date}</div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat interface main section */}
      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Toggle sidebar button */}
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-full bg-white shadow hover:bg-gray-100"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className={`transform transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
            >
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {error && !sessionId ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-100 p-6 rounded-lg max-w-md text-center">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <button 
                onClick={handleNewChat}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Try New Chat
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <ChatInterface initialSessionId={sessionId} />
          </div>
        )}
      </div>
    </div>
  );
}; 