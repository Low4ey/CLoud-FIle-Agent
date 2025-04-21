import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { SummaryPage } from './pages/SummaryPage';
import { ChatPage } from './pages/ChatPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient();

function App() {
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGlobalSearch = (searchTerm: string) => {
    setGlobalSearchTerm(searchTerm);
  };

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navbar onSearch={handleGlobalSearch} />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-16">
            <div className="px-4 py-6 sm:px-0">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <>
                      <DashboardPage 
                        globalSearchTerm={globalSearchTerm}
                        refreshKey={refreshKey}
                      />
                      <footer className="bg-white shadow mt-8">
                        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">
                              © 2024 Abnormal File Vault. All rights reserved.
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Secure file storage with intelligent deduplication
                            </p>
                          </div>
                        </div>
                      </footer>
                    </>
                  } 
                />
                <Route 
                  path="/upload" 
                  element={
                    <UploadPage onUploadSuccess={handleUploadSuccess} />
                  } 
                />
                <Route 
                  path="/summary" 
                  element={
                    <SummaryPage refreshKey={refreshKey} />
                  } 
                />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:sessionId" element={<ChatPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
