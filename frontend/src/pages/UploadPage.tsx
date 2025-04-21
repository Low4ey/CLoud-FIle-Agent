import React from 'react';
import { FileUpload } from '../components/FileUpload';

interface UploadPageProps {
  onUploadSuccess: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onUploadSuccess }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Upload Files</h1>
        <p className="text-gray-600 mb-6">Upload new files to your vault</p>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <FileUpload onUploadSuccess={onUploadSuccess} />
        </div>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Upload Guidelines</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>Maximum file size: 10MB</li>
            <li>Supported file types: all common document, image, and media formats</li>
            <li>Duplicate files will be automatically detected and deduplicated</li>
            <li>Files are securely stored and accessible only to you</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 