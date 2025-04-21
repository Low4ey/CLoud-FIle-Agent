import React, { useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { DocumentTextIcon, ArrowDownTrayIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { ChatMessage as ChatMessageType } from '../../services/api';
import { format } from 'date-fns';
import api from '../../services/api';
import { File as FileType } from '../../types/file';

interface ChatMessageProps {
  message: ChatMessageType;
  onFileClick?: (fileId: string) => void;
}

// Function to format JSON-like content
const formatJsonContent = (content: string): string => {
  const trimmedContent = content.trim();
  
  // First check: Is the entire content JSON?
  if ((trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) || 
      (trimmedContent.startsWith('[') && trimmedContent.endsWith(']'))) {
    try {
      // Attempt to parse as JSON
      const parsedData = JSON.parse(trimmedContent);
      
      // Check if the JSON contains Python code in certain properties
      if (parsedData && typeof parsedData === 'object') {
        // Handle Python code in 'source_code' or similar fields
        if (parsedData.source_code && typeof parsedData.source_code === 'string') {
          parsedData.source_code = formatPythonCode(parsedData.source_code);
        }
        
        // Handle nested objects with code
        if (parsedData.files && Array.isArray(parsedData.files)) {
          parsedData.files = parsedData.files.map((file: any) => {
            if (file.content && typeof file.content === 'string') {
              file.content = formatPythonCode(file.content);
            }
            return file;
          });
        }
      }
      
      // Format the JSON with proper indentation to make it human-readable
      return JSON.stringify(parsedData, null, 2);
    } catch (e) {
      // Not valid JSON, continue to next check
    }
  }
  
  // Improved check for tool results with pattern: "TOOL RESULT\n{...json...}"
  const toolResultPattern = /TOOL\s+RESULT\s*\n*\s*({[\s\S]*}|(\[[\s\S]*\]))/;
  const toolResultMatch = content.match(toolResultPattern);
  
  if (toolResultMatch && toolResultMatch[1]) {
    try {
      const jsonPart = toolResultMatch[1];
      const parsedData = JSON.parse(jsonPart);
      
      // Handle Python code in tool results
      if (parsedData && typeof parsedData === 'object') {
        if (parsedData.source_code && typeof parsedData.source_code === 'string') {
          parsedData.source_code = formatPythonCode(parsedData.source_code);
        }
        
        if (parsedData.files && Array.isArray(parsedData.files)) {
          parsedData.files = parsedData.files.map((file: any) => {
            if (file.content && typeof file.content === 'string') {
              file.content = formatPythonCode(file.content);
            }
            return file;
          });
        }
      }
      
      const formattedJson = JSON.stringify(parsedData, null, 2);
      
      // Replace the JSON part while keeping the "TOOL RESULT" text
      return content.replace(jsonPart, "\n" + formattedJson);
    } catch (e) {
      console.log("Error parsing tool result JSON:", e);
      // Not valid JSON, continue to next check
    }
  }
  
  // Additional pattern for "name": "tool_name" results
  const toolNamePattern = /"name":\s*"[a-z_]+"[\s\S]*?({[\s\S]*}|(\[[\s\S]*\]))/;
  const toolNameMatch = content.match(toolNamePattern);
  
  if (toolNameMatch && toolNameMatch[1]) {
    try {
      const jsonPart = toolNameMatch[1];
      const parsedData = JSON.parse(jsonPart);
      
      // Handle Python code in this pattern too
      if (parsedData && typeof parsedData === 'object') {
        if (parsedData.source_code && typeof parsedData.source_code === 'string') {
          parsedData.source_code = formatPythonCode(parsedData.source_code);
        }
        
        if (parsedData.files && Array.isArray(parsedData.files)) {
          parsedData.files = parsedData.files.map((file: any) => {
            if (file.content && typeof file.content === 'string') {
              file.content = formatPythonCode(file.content);
            }
            return file;
          });
        }
      }
      
      const formattedJson = JSON.stringify(parsedData, null, 2);
      
      // Replace the JSON part with formatted JSON
      return content.replace(jsonPart, formattedJson);
    } catch (e) {
      // Not valid JSON, continue to next check
    }
  }
  
  // Enhanced general check: Look for JSON objects or arrays in the content
  let modifiedContent = content;
  
  // First try to find complete JSON objects
  const jsonObjectRegex = /({[\s\S]*?})/g;
  let match;
  
  while ((match = jsonObjectRegex.exec(content)) !== null) {
    try {
      const jsonStr = match[1];
      // Only try to parse if it looks like potentially valid JSON
      if (jsonStr.includes('"') || jsonStr.includes("'")) {
        const parsedJson = JSON.parse(jsonStr);
        
        // Handle Python code in these objects too
        if (parsedJson && typeof parsedJson === 'object') {
          if (parsedJson.source_code && typeof parsedJson.source_code === 'string') {
            parsedJson.source_code = formatPythonCode(parsedJson.source_code);
          }
          
          if (parsedJson.files && Array.isArray(parsedJson.files)) {
            parsedJson.files = parsedJson.files.map((file: any) => {
              if (file.content && typeof file.content === 'string') {
                file.content = formatPythonCode(file.content);
              }
              return file;
            });
          }
        }
        
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        modifiedContent = modifiedContent.replace(jsonStr, "\n" + formattedJson + "\n");
      }
    } catch (e) {
      // Not valid JSON, skip this match
    }
  }
  
  // Also search for JSON arrays
  const jsonArrayRegex = /(\[[\s\S]*?\])/g;
  while ((match = jsonArrayRegex.exec(content)) !== null) {
    try {
      const jsonStr = match[1];
      // Only try to parse if it looks like potentially valid JSON
      if (jsonStr.includes('"') || jsonStr.includes("'")) {
        const parsedJson = JSON.parse(jsonStr);
        
        // Handle Python code in arrays too
        if (Array.isArray(parsedJson)) {
          parsedJson.forEach((item: any) => {
            if (item && typeof item === 'object') {
              if (item.source_code && typeof item.source_code === 'string') {
                item.source_code = formatPythonCode(item.source_code);
              }
              if (item.content && typeof item.content === 'string') {
                item.content = formatPythonCode(item.content);
              }
            }
          });
        }
        
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        modifiedContent = modifiedContent.replace(jsonStr, "\n" + formattedJson + "\n");
      }
    } catch (e) {
      // Not valid JSON, skip this match
    }
  }
  
  if (modifiedContent !== content) {
    return modifiedContent;
  }
  
  // Not JSON-like, return original content
  return trimmedContent;
};

// Helper function to format Python code
const formatPythonCode = (code: string): string => {
  // If the code already has escaped newlines, unescape them for better display
  let processedCode = code.replace(/\\n/g, '\n');
  
  // If the code has escaped quotes, unescape them
  processedCode = processedCode.replace(/\\"/g, '"').replace(/\\'/g, "'");
  
  // If the code has escaped tabs, unescape them
  processedCode = processedCode.replace(/\\t/g, '    ');
  
  return processedCode;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onFileClick }) => {
  const isUser = message.role === 'user';
  const hasAttachments = message.file_attachments && message.file_attachments.length > 0;
  const [fileInfo, setFileInfo] = useState<Record<string, FileType>>({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Format message content immediately upon component initialization
  const initialFormattedContent = isUser ? message.content : formatJsonContent(message.content);
  const [formattedContent, setFormattedContent] = useState<string>(initialFormattedContent);
  
  // Re-format content whenever message changes
  useEffect(() => {
    if (!isUser) {
      const formatted = formatJsonContent(message.content);
      setFormattedContent(formatted);
    }
  }, [message.content, isUser]);
  
  // Format the timestamp
  const formattedTime = format(new Date(message.timestamp), 'h:mm a');

  // Check if message content contains a tool call indication
  const isToolCall = !isUser && (
    // File upload tool calls
    message.content.includes('`upload_file`') || 
    message.content.includes('Processing') && message.content.includes('file(s)...') ||
    // Generic tool calls
    message.content.includes('I\'ll use the `') ||
    message.content.match(/`[a-z_]+`\s+tool/) // Matches any "tool_name" tool pattern
  );
  
  // Check if message is a result of a tool call
  const isToolResult = !isUser && (
    // File upload result - including duplicate file messages
    message.content.includes('Successfully uploaded') ||
    message.content.includes('Duplicate file already exists') ||
    message.content.includes('Duplicate files already exist') ||
    message.content.includes('Duplicate file') ||
    // Generic tool results
    message.id.includes('assistant-tool-result') ||
    // Matches patterns like "I found X files matching your query"
    message.content.match(/found \d+ files/) ||
    // List files results
    message.content.includes('File Storage Summary')
  );

  // Fetch file information for each attachment
  useEffect(() => {
    const fetchFiles = async () => {
      if (!hasAttachments) return;
      
      setLoading(true);
      try {
        // Get all files first
        const allFiles = await api.getFiles();
        
        // Create a map of file ID to file info
        const fileMap: Record<string, FileType> = {};
        for (const file of allFiles) {
          fileMap[file.id] = file;
        }
        
        // Filter only the files that are in the attachments
        const attachmentMap: Record<string, FileType> = {};
        message.file_attachments?.forEach(fileId => {
          if (fileMap[fileId]) {
            attachmentMap[fileId] = fileMap[fileId];
          }
        });
        
        setFileInfo(attachmentMap);
      } catch (error) {
        console.error('Error fetching file info:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFiles();
  }, [hasAttachments, message.file_attachments]);

  const handleDownload = async (fileId: string) => {
    const file = fileInfo[fileId];
    if (!file) return;

    setDownloading(fileId);
    try {
      await api.downloadFile(file.file, file.original_filename);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloading(null);
    }
  };
  
  return (
    <div className={`mb-4 ${isUser ? 'ml-12' : 'mr-12'}`}>
      <div className={`flex items-start ${isUser ? 'justify-end' : ''}`}>
        {!isUser && (
          <div className="flex-shrink-0 mr-3">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
              <span className="text-xs font-medium">AI</span>
            </div>
          </div>
        )}
        
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div 
            className={`max-w-3xl rounded-lg px-4 py-3 ${
              isUser 
                ? 'bg-primary-600 text-white' 
                : isToolCall
                  ? 'bg-orange-50 text-gray-800 border border-orange-200'
                  : isToolResult
                    ? 'bg-green-50 text-gray-800 border border-green-200'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {/* Tool call indicator */}
            {isToolCall && (
              <div className="flex items-center mb-2 text-orange-600">
                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                <span className="text-xs font-semibold">TOOL CALL</span>
              </div>
            )}

            {/* Tool result indicator */}
            {isToolResult && (
              <div className="flex items-center mb-2 text-green-600">
                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                <span className="text-xs font-semibold">TOOL RESULT</span>
              </div>
            )}
            
            {/* Handle file attachments if any */}
            {hasAttachments && message.file_attachments && (
              <div className="mb-2 border-b pb-2 border-gray-200">
                <p className="text-sm font-medium mb-1">
                  {isUser ? 'You shared' : 'Shared with you'}:
                </p>
                {loading ? (
                  <div className="text-xs font-medium">Loading file information...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {message.file_attachments.map(fileId => {
                      const file = fileInfo[fileId];
                      return (
                        <button
                          key={fileId}
                          onClick={() => handleDownload(fileId)}
                          className={`inline-flex items-center text-xs px-2 py-1 rounded ${
                            isUser 
                              ? 'bg-primary-500 text-white hover:bg-primary-400' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          title={file?.original_filename || fileId}
                          disabled={downloading === fileId}
                        >
                          {downloading === fileId ? (
                            <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <>
                              <DocumentTextIcon className="h-3 w-3 mr-1" />
                              {file ? file.original_filename.substring(0, 15) + (file.original_filename.length > 15 ? '...' : '') : `File ${fileId ? fileId.substring(0, 6) : 'Unknown'}...`}
                              <ArrowDownTrayIcon className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Message content with support for line breaks */}
            <div className="whitespace-pre-wrap">
              {formattedContent.split('\n').map((text, i) => (
                <React.Fragment key={i}>
                  {text}
                  {i < formattedContent.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {isUser ? 'You' : 'AI Assistant'} • {formattedTime}
          </div>
        </div>
        
        {isUser && (
          <div className="flex-shrink-0 ml-3">
            <UserCircleIcon className="h-8 w-8 text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
};