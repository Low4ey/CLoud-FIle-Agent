import React, { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface NavbarProps {
  onSearch?: (query: string) => void;
}

export default function Navbar({ onSearch }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkIfLoggedIn = () => {
      // TODO: Implement actual authentication check
      const userToken = localStorage.getItem('userToken');
      setIsLoggedIn(!!userToken);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfLoggedIn();
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleLogin = () => {
    // TODO: Implement actual login functionality
    setIsLoggedIn(true);
    localStorage.setItem('userToken', 'dummyToken');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('userToken');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-gray-800 px-4 py-3 fixed top-0 w-full z-10">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="text-white font-bold text-xl">Abnormal File Vault</Link>
        </div>

        {isMobile ? (
          <>
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute top-16 right-0 bg-gray-800 w-full p-4 flex flex-col space-y-4">
                <form onSubmit={handleSubmit} className="flex">
                  <input
                    type="text"
                    placeholder="Search files..."
                    className="px-3 py-1 w-full rounded-l"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-3 py-1 rounded-r flex items-center"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </button>
                </form>

                <div className="flex flex-col space-y-2">
                  <Link
                    to="/upload"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-700"
                  >
                    Upload
                  </Link>
                  <Link
                    to="/summary"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-700"
                  >
                    Summary
                  </Link>
                  <Link
                    to="/chat"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-700 flex items-center"
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5 mr-1" />
                    Chat Assistant
                  </Link>
                </div>

                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-white flex items-center space-x-1"
                  >
                    <span>Logout</span>
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="text-gray-300 hover:text-white flex items-center space-x-1"
                  >
                    <span>Login</span>
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex space-x-4 items-center">
              <Link
                to="/upload"
                className="text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-700"
              >
                Upload
              </Link>
              <Link
                to="/summary"
                className="text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-700"
              >
                Summary
              </Link>
              <Link
                to="/chat"
                className="text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-700 flex items-center"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-1" />
                Chat Assistant
              </Link>
            </div>

            <div className="flex space-x-4 items-center">
              <form onSubmit={handleSubmit} className="flex">
                <input
                  type="text"
                  placeholder="Search files..."
                  className="px-3 py-1 rounded-l"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-3 py-1 rounded-r flex items-center"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </form>

              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white flex items-center space-x-1"
                >
                  <span>Logout</span>
                  <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="text-gray-300 hover:text-white flex items-center space-x-1"
                >
                  <span>Login</span>
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}