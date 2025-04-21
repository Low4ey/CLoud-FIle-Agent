import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, ArrowUpTrayIcon, ChartBarIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: HomeIcon },
    { path: '/upload', label: 'Upload', icon: ArrowUpTrayIcon },
    { path: '/summary', label: 'Summary', icon: ChartBarIcon },
    { path: '/chat', label: 'Chat Assistant', icon: ChatBubbleLeftRightIcon }
  ];

  return (
    <div className="bg-white shadow-sm mt-4 rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {navItems.map((item) => {
          const isActive = 
            (item.path === '/' && currentPath === '/') || 
            (item.path !== '/' && currentPath.startsWith(item.path));
          
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b sm:border-b-0 sm:border-r border-gray-200 ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-5 w-5 mr-2" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}; 