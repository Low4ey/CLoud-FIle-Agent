import React, { useState } from 'react';
import { FileList } from '../components/FileList';
import { StorageStats } from '../components/StorageStats';
import FileTypeList from '../components/FileTypeList';

interface DashboardPageProps {
  globalSearchTerm: string;
  refreshKey: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  globalSearchTerm,
  refreshKey
}) => {
  const [selectedFileType, setSelectedFileType] = useState<string>('');
  const fileTypes = [
    { label: 'All Files', value: '' },
    { label: 'PDF Files', value: 'pdf' },
    { label: 'Images', value: 'image' },
    { label: 'Documents', value: 'doc' },
    { label: 'Spreadsheets', value: 'xlsx' },
    { label: 'Text Files', value: 'txt' },
    { label: 'Archives', value: 'zip' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-6">View and manage your uploaded files</p>
        
        <StorageStats key={refreshKey} />
      </div>
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by File Type
          </label>
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {fileTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {selectedFileType ? (
          <FileTypeList fileType={selectedFileType} />
        ) : (
          <FileList key={refreshKey} globalSearchTerm={globalSearchTerm} />
        )}
      </div>
    </div>
  );
}; 