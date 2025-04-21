import React, { useState, useEffect, useMemo } from 'react';
import { File as FileType } from '../types/file';
import { DocumentIcon, TrashIcon, ArrowDownTrayIcon, DocumentDuplicateIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FilterPanel, FilterOptions } from './FilterPanel';
import { FilePreview } from './FilePreview';
import api from '../services/api';

interface FileListProps {
  globalSearchTerm?: string;
}

export const FileList: React.FC<FileListProps> = ({ globalSearchTerm = '' }) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    fileType: '',
    dateRange: '',
    sizeRange: '',
  });
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);

  // Update search term when global search changes
  useEffect(() => {
    if (globalSearchTerm) {
      setFilters(prev => ({ ...prev, searchTerm: globalSearchTerm }));
    }
  }, [globalSearchTerm]);

  // Query for fetching files
  const { data: files, isLoading, error } = useQuery({
    queryKey: ['files'],
    queryFn: api.getFiles.bind(api),
  });

  // Mutation for deleting files
  const deleteMutation = useMutation({
    mutationFn: api.deleteFile.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });

  // Mutation for downloading files
  const downloadMutation = useMutation({
    mutationFn: ({ fileUrl, filename }: { fileUrl: string; filename: string }) =>
      api.downloadFile(fileUrl, filename),
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      await downloadMutation.mutateAsync({ fileUrl, filename });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handlePreview = (file: FileType) => {
    setPreviewFile(file);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // Apply filters to the files
  const filteredFiles = files?.filter((file) => {
    // Search term filter
    if (
      filters.searchTerm &&
      !file.original_filename.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) {
      return false;
    }

    // File type filter
    if (filters.fileType && !file.file_type.startsWith(filters.fileType)) {
      return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const fileDate = new Date(file.uploaded_at);
      const now = new Date();
      
      if (filters.dateRange === 'today') {
        if (
          fileDate.getDate() !== now.getDate() ||
          fileDate.getMonth() !== now.getMonth() ||
          fileDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (filters.dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (fileDate < weekAgo) {
          return false;
        }
      } else if (filters.dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        if (fileDate < monthAgo) {
          return false;
        }
      } else if (filters.dateRange === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        if (fileDate < yearAgo) {
          return false;
        }
      }
    }

    // Size range filter
    if (filters.sizeRange) {
      const sizeInBytes = file.size;
      
      // For preset size filters
      if (filters.sizeRange === 'small' && sizeInBytes >= 1 * 1024 * 1024) { // 1MB
        return false;
      } else if (filters.sizeRange === 'medium' && (sizeInBytes < 1 * 1024 * 1024 || sizeInBytes > 10 * 1024 * 1024)) { // Between 1MB and 10MB
        return false;
      } else if (filters.sizeRange === 'large' && sizeInBytes <= 10 * 1024 * 1024) { // > 10MB
        return false;
      } 
      // For custom size filters
      else if ((filters.sizeRange === 'gte' || filters.sizeRange === 'lte') && filters.sizeValue !== undefined) {
        // Convert the user-specified size to bytes
        let sizeInBytesThreshold = 0;
        if (filters.sizeUnit === 'KB') {
          sizeInBytesThreshold = filters.sizeValue * 1024;
        } else if (filters.sizeUnit === 'MB') {
          sizeInBytesThreshold = filters.sizeValue * 1024 * 1024;
        } else if (filters.sizeUnit === 'GB') {
          sizeInBytesThreshold = filters.sizeValue * 1024 * 1024 * 1024;
        }
        
        // Apply the filter based on comparison type
        if (filters.sizeRange === 'gte' && sizeInBytes < sizeInBytesThreshold) {
          return false; // File is smaller than the minimum size
        } else if (filters.sizeRange === 'lte' && sizeInBytes > sizeInBytesThreshold) {
          return false; // File is larger than the maximum size
        }
      }
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Failed to load files. Please try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <FilterPanel onFilterChange={handleFilterChange} />
      
      {/* Files List */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Files</h2>
        {!filteredFiles || filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
            <p className="mt-1 text-sm text-gray-500">
              {files && files.length > 0 
                ? 'No files match the current filters'
                : 'Get started by uploading a file'}
            </p>
          </div>
        ) : (
          <div className="mt-6 flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <li key={file.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <DocumentIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.original_filename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {file.file_type} • {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <p className="text-sm text-gray-500">
                        Uploaded {new Date(file.uploaded_at).toLocaleString()}
                      </p>
                      {file.reference_count > 1 && (
                        <p className="flex items-center text-sm text-primary-600 mt-1">
                          <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                          Deduplicated ({file.reference_count} references)
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePreview(file)}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownload(file.file, file.original_filename)}
                        disabled={downloadMutation.isPending}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview 
          file={previewFile} 
          onClose={handleClosePreview} 
        />
      )}
    </div>
  );
};