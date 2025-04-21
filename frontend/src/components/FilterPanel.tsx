import React, { useState } from 'react';
import { FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface FilterPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  searchTerm: string;
  fileType: string;
  dateRange: string;
  sizeRange: string;
  sizeValue?: number;
  sizeUnit?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    fileType: '',
    dateRange: '',
    sizeRange: '',
    sizeValue: undefined,
    sizeUnit: 'MB',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let updatedFilters = {
      ...filters,
      [name]: value,
    };
    
    // Reset size value when size range is changed to a preset option
    if (name === 'sizeRange' && ['', 'small', 'medium', 'large'].includes(value)) {
      updatedFilters.sizeValue = undefined;
    }
    
    // If we're setting size value, ensure it's a number
    if (name === 'sizeValue') {
      const numValue = value === '' ? undefined : Number(value);
      updatedFilters.sizeValue = numValue;
    }
    
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      searchTerm: '',
      fileType: '',
      dateRange: '',
      sizeRange: '',
      sizeValue: undefined,
      sizeUnit: 'MB',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  // Display the size input field only for certain size range options
  const showSizeInput = ['gte', 'lte'].includes(filters.sizeRange);

  return (
    <div className="bg-white shadow sm:rounded-lg p-6">
      <div className="flex items-center mb-4">
        <FunnelIcon className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Search & Filter</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700">
            Search by name
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              name="searchTerm"
              id="searchTerm"
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              placeholder="Search files..."
              value={filters.searchTerm}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* File Type */}
        <div>
          <label htmlFor="fileType" className="block text-sm font-medium text-gray-700">
            File Type
          </label>
          <select
            id="fileType"
            name="fileType"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            value={filters.fileType}
            onChange={handleInputChange}
          >
            <option value="">All Types</option>
            <option value="image/">Images</option>
            <option value="application/pdf">PDF</option>
            <option value="text/">Text</option>
            <option value="application/vnd">Documents</option>
            <option value="video/">Videos</option>
            <option value="audio/">Audio</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
            Upload Date
          </label>
          <select
            id="dateRange"
            name="dateRange"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            value={filters.dateRange}
            onChange={handleInputChange}
          >
            <option value="">Any Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Size Range */}
        <div className={showSizeInput ? "lg:col-span-1" : ""}>
          <label htmlFor="sizeRange" className="block text-sm font-medium text-gray-700">
            File Size
          </label>
          <select
            id="sizeRange"
            name="sizeRange"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            value={filters.sizeRange}
            onChange={handleInputChange}
          >
            <option value="">Any Size</option>
            <option value="small">Small (&lt; 1MB)</option>
            <option value="medium">Medium (1-10MB)</option>
            <option value="large">Large (&gt; 10MB)</option>
            <option value="gte">Greater than or equal to</option>
            <option value="lte">Less than or equal to</option>
          </select>
        </div>

        {/* Size value input - conditionally shown */}
        {showSizeInput && (
          <div className="lg:col-span-1 flex items-end space-x-2">
            <div className="flex-grow">
              <label htmlFor="sizeValue" className="block text-sm font-medium text-gray-700">
                Size Value
              </label>
              <input
                type="number"
                id="sizeValue"
                name="sizeValue"
                min="0"
                step="0.1"
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={filters.sizeValue || ''}
                onChange={handleInputChange}
                placeholder="Size"
              />
            </div>
            <div className="flex-shrink-0 w-1/3">
              <label htmlFor="sizeUnit" className="block text-sm font-medium text-gray-700">
                Unit
              </label>
              <select
                id="sizeUnit"
                name="sizeUnit"
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={filters.sizeUnit}
                onChange={handleInputChange}
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};