import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { FileList } from './FileList';
import { StorageStats } from './StorageStats';

interface DashboardProps {
  globalSearchTerm: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ globalSearchTerm }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Upload */}
        <div className="md:col-span-1">
          <div className="bg-white shadow sm:rounded-lg">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
        
        {/* Right column - Storage Stats */}
        <div className="md:col-span-2">
          <StorageStats key={refreshKey} />
        </div>
      </div>
      
      {/* File List spans full width */}
      <FileList key={refreshKey} globalSearchTerm={globalSearchTerm} />
    </div>
  );
}; 