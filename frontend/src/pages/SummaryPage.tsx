import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { File } from '../types/file';

export const SummaryPage: React.FC<{ globalSearchTerm?: string, refreshKey?: number }> = ({ 
  globalSearchTerm, 
  refreshKey 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{
    total_files: number;
    unique_files: number;
    total_size_bytes: number;
    saved_size_bytes: number;
    duplicate_percentage: number;
  } | null>(null);
  const [fileTypes, setFileTypes] = useState<Record<string, number>>({});
  const [recentFiles, setRecentFiles] = useState<File[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch storage stats
        const stats = await api.getStorageStats();
        setStorageStats(stats);
        
        // Fetch files for analysis
        const files = await api.getFiles();
        
        // Calculate file type distribution
        const typeDistribution: Record<string, number> = {};
        files.forEach(file => {
          const fileType = file.file_type || 'unknown';
          typeDistribution[fileType] = (typeDistribution[fileType] || 0) + 1;
        });
        setFileTypes(typeDistribution);
        
        // Get recent files
        const sortedFiles = [...files].sort((a, b) => 
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        );
        setRecentFiles(sortedFiles.slice(0, 5));
      } catch (err) {
        console.error('Error fetching summary data:', err);
        setError('Failed to load summary data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, globalSearchTerm]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Storage Insights</h1>
        <p className="text-gray-600 mb-8">
          AI-powered analysis of your file storage and usage patterns
        </p>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Total Files</h2>
            <p className="text-3xl font-bold text-gray-900">{storageStats?.total_files || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Unique Files</h2>
            <p className="text-3xl font-bold text-gray-900">{storageStats?.unique_files || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Total Storage</h2>
            <p className="text-3xl font-bold text-gray-900">
              {storageStats ? formatFileSize(storageStats.total_size_bytes) : '0 KB'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Storage Saved</h2>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-green-600">
                {storageStats ? formatFileSize(storageStats.saved_size_bytes) : '0 KB'}
              </p>
              {storageStats && storageStats.duplicate_percentage > 0 && (
                <span className="ml-2 text-sm font-medium text-green-600">
                  ({storageStats.duplicate_percentage}%)
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* File Type Distribution */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">File Type Distribution</h2>
          {Object.keys(fileTypes).length === 0 ? (
            <p className="text-gray-500">No files available for analysis</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(fileTypes).map(([type, count]) => (
                <div key={type} className="flex flex-col">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{type}</span>
                    <span className="text-sm font-medium text-gray-500">{count} files</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(count / (storageStats?.total_files || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Files */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Added Files</h2>
          {recentFiles.length === 0 ? (
            <p className="text-gray-500">No recent files available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {file.original_filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {file.file_type || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* AI Recommendations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Recommendations</h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Storage Optimization</h3>
            <div className="prose prose-sm text-gray-600">
              {storageStats?.duplicate_percentage ? (
                storageStats.duplicate_percentage > 15 ? (
                  <p>
                    Your storage is optimized! Deduplication has saved you {storageStats.duplicate_percentage}% 
                    of storage space. The system is efficiently handling your file uploads.
                  </p>
                ) : (
                  <p>
                    Most of your files appear to be unique. The deduplication system has saved you 
                    {storageStats.duplicate_percentage}% storage space so far.
                  </p>
                )
              ) : (
                <p>
                  Upload more files to see storage optimization recommendations. The system will
                  automatically deduplicate your files to save storage space.
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Try the AI Chat</h3>
              <p className="text-sm text-gray-600">
                Use the AI Chat to ask questions about your files, get help with file management,
                and learn more about the system's features.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">File Organization</h3>
              <p className="text-sm text-gray-600">
                Consider organizing your files by type. You have 
                {Object.keys(fileTypes).length > 0 
                  ? ` ${Object.keys(fileTypes).length} different file types` 
                  : ' no files yet'
                }.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 