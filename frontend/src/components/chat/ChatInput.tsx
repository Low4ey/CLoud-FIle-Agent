import React, { useState, useRef } from 'react';
import api from '../../services/api';
import { PaperAirplaneIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ChatInputProps {
  onSendMessage: (content: string, files: File[]) => void;
  isDisabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isDisabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || selectedFiles.length > 0) {
      onSendMessage(
        message.trim(), 
        selectedFiles
      );
      setMessage('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to array and append to existing files
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {/* Selected files display */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div 
              key={index} 
              className="flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
            >
              <span className="truncate max-w-xs">{file.name}</span>
              <button 
                onClick={() => removeFile(index)}
                className="ml-2 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-start space-x-3">
          <div className="min-w-0 flex-1">
            <div className="relative rounded-lg border border-gray-300 shadow-sm overflow-hidden focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
              <textarea
                rows={1}
                name="message"
                id="message"
                className="block w-full resize-none border-0 bg-transparent py-3 focus:ring-0 sm:text-sm"
                placeholder={selectedFiles.length > 0 ? "What would you like to do with these files?" : "Type your message..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                style={{ minHeight: '60px', maxHeight: '200px' }}
              />
              
              <div className="py-2 flex justify-between items-center border-t border-gray-200 px-3">
                <div className="flex space-x-1">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    onClick={handleFileClick}
                    disabled={isDisabled}
                  >
                    <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Attach a file</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    disabled={isDisabled}
                  />
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    type="submit"
                    className={`inline-flex items-center rounded-full p-2 ${
                      message.trim() || selectedFiles.length > 0
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={isDisabled || !(message.trim() || selectedFiles.length > 0)}
                  >
                    <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Send message</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}; 