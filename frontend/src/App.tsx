import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import SettingsPage from './pages/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';

function App() {
  const [userId, setUserId] = useState<number | null>(
    localStorage.getItem('userId')
      ? parseInt(localStorage.getItem('userId')!)
      : null
  );
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          {/* Navbar */}
          <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📰</span>
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  AI News Digest
                </h1>
              </div>

              <div className="flex items-center gap-6">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold text-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm'
                  }
                >
                  ⚙️ Settings
                </NavLink>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold text-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm'
                  }
                >
                  📊 Dashboard
                </NavLink>
                <NavLink
                  to="/chat"
                  className={({ isActive }) =>
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold text-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm'
                  }
                >
                  💬 Chat
                </NavLink>

                {/* Dark mode toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 
                             hover:bg-gray-200 dark:hover:bg-gray-700 
                             transition-colors text-lg"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </nav>

          {/* Pages */}
          <div className="max-w-5xl mx-auto px-4 py-8">
            <Routes>
              <Route
                path="/"
                element={<SettingsPage userId={userId} setUserId={setUserId} darkMode={darkMode} />}
              />
              <Route
                path="/dashboard"
                element={<DashboardPage userId={userId} darkMode={darkMode} />}
              />
              <Route
                path="/chat"
                element={<ChatPage userId={userId} darkMode={darkMode} />}
              />
            </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}

export default App;