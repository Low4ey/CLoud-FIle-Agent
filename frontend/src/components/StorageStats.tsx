import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { StorageStats as StorageStatsType } from '../services/api';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface StorageStatsProps {
  refreshKey?: number;
}

export const StorageStats: React.FC<StorageStatsProps> = ({ refreshKey }) => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: api.getStorageStats.bind(api),
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
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
              <p className="text-sm text-red-700">Failed to load storage statistics.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
        <p className="text-gray-500">No storage data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Storage Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="font-medium text-gray-700">Total Files</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total_files}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <ChartBarIcon className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="font-medium text-gray-700">Storage Used</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.total_size_bytes)}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
            <ChartBarIcon className="h-5 w-5 text-indigo-500 mr-2" />
            <h3 className="font-medium text-gray-700">Space Saved</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.saved_size_bytes)}</p>
          <p className="text-sm text-gray-500">
            {stats.duplicate_percentage.toFixed(1)}% duplication detected
          </p>
        </div>
      </div>
      
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Efficiency</h3>
          <p className="text-sm font-medium text-gray-900">
            {stats.unique_files} unique files ({(stats.unique_files / stats.total_files * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-primary-600 h-2.5 rounded-full" 
            style={{ width: `${100 - stats.duplicate_percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}; 