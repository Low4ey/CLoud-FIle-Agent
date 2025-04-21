import React from 'react';
import './PDF.css';

interface FilePreviewProps {
  file: {
    file: string;
    file_type: string;
    original_filename: string;
  };
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const renderPreview = () => {
    const fileType = file.file_type.split('/')[0];
    const mimeType = file.file_type.toLowerCase();
    
    switch (fileType) {
      case 'image':
        return (
          <img 
            src={file.file} 
            alt={file.original_filename} 
            className="max-w-full max-h-[70vh] object-contain"
          />
        );
      case 'video':
        return (
          <video 
            src={file.file} 
            controls 
            className="max-w-full max-h-[70vh]"
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'audio':
        return (
          <audio 
            src={file.file} 
            controls 
            className="w-full"
          >
            Your browser does not support the audio tag.
          </audio>
        );
      case 'application':
        if (mimeType.includes('pdf')) {
          return (
            <div className="pdf-container">
              <object
                data={file.file}
                type="application/pdf"
                width="100%"
                height="600px"
                className="pdf-viewer"
              >
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-4">
                    Unable to display PDF directly in the browser.
                  </p>
                  <a 
                    href={file.file} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Open PDF in new tab
                  </a>
                </div>
              </object>
            </div>
          );
        } else if (mimeType.includes('msword') || mimeType.includes('officedocument')) {
          // Handle Word documents (no direct preview)
          return (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-2">
                Preview not available for Microsoft Office documents.
              </p>
              <a 
                href={file.file} 
                target="_blank" 
                rel="noreferrer"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Download to view
              </a>
            </div>
          );
        } else {
          return (
            <div className="text-center py-6">
              <p className="text-gray-600">
                Preview not available for {file.file_type} files.
              </p>
              <a 
                href={file.file} 
                target="_blank" 
                rel="noreferrer"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Download to view
              </a>
            </div>
          );
        }
      default:
        return (
          <div className="text-center py-6">
            <p className="text-gray-600">
              Preview not available for this file type.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {file.original_filename}
                  </h3>
                  <span className="text-sm text-gray-500">({file.file_type})</span>
                </div>
                <div className="mt-4 flex justify-center">
                  {renderPreview()}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
            <a 
              href={file.file} 
              target="_blank" 
              rel="noreferrer"
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}; 