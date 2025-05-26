import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  
  // State for various settings toggles
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  
  // Logout function
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Toggle handler for switches
  const handleToggle = (setter) => {
    return () => setter(prev => !prev);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto p-6 transition-colors duration-300">
        <div className={`p-6 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="text-3xl font-bold mb-6">Settings</h2>

          {/* Appearance Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Appearance</h3>
            <div className="flex items-center justify-between p-4 rounded-lg mb-2 border">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enable dark theme for the application</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={darkMode}
                  onChange={handleToggle(setDarkMode)}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                               peer-focus:ring-blue-300 rounded-full peer 
                               ${darkMode ? 'after:translate-x-full after:border-white bg-blue-600' : 'bg-gray-200'} 
                               after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                               after:bg-white after:border-gray-300 after:border after:rounded-full 
                               after:h-5 after:w-5 after:transition-all`}>
                </div>
              </label>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Notifications</h3>
            <div className="flex items-center justify-between p-4 rounded-lg mb-2 border">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Receive push notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notifications}
                  onChange={handleToggle(setNotifications)}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                               peer-focus:ring-blue-300 rounded-full peer 
                               ${notifications ? 'after:translate-x-full after:border-white bg-blue-600' : 'bg-gray-200'} 
                               after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                               after:bg-white after:border-gray-300 after:border after:rounded-full 
                               after:h-5 after:w-5 after:transition-all`}>
                </div>
              </label>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Privacy</h3>
            <div className="flex items-center justify-between p-4 rounded-lg mb-2 border">
              <div>
                <p className="font-medium">Analytics</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Allow usage data collection</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={analytics}
                  onChange={handleToggle(setAnalytics)}
                />
                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                               peer-focus:ring-blue-300 rounded-full peer 
                               ${analytics ? 'after:translate-x-full after:border-white bg-blue-600' : 'bg-gray-200'} 
                               after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                               after:bg-white after:border-gray-300 after:border after:rounded-full 
                               after:h-5 after:w-5 after:transition-all`}>
                </div>
              </label>
            </div>
          </div>

          {/* Security Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Security</h3>
              <button 
                onClick={() => setIsSecurityOpen(!isSecurityOpen)}
                className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {isSecurityOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {isSecurityOpen && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="space-y-4">
                  <button 
                    className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} border transition`}
                    onClick={() => alert('Change Password dialog would open')}
                  >
                    <span>Change Password</span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
                  </button>
                  
                  <button 
                    className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} border transition`}
                    onClick={() => alert('Two-factor authentication settings would open')}
                  >
                    <span>Two-Factor Authentication</span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
                  </button>
                  
                  <button 
                    className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} border transition`}
                    onClick={() => alert('Device management page would open')}
                  >
                    <span>Manage Devices</span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legal Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Legal</h3>
            <div className="space-y-3">
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} transition`}
                onClick={() => navigate('/privacy-policy')}
              >
                <span>Privacy Policy</span>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
              </button>
              
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} transition`}
                onClick={() => navigate('/terms-of-service')}
              >
                <span>Terms & Conditions</span>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
              </button>
              
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} transition`}
                onClick={() => navigate('/liability-disclaimer')}
              >
                <span>Liability</span>
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
              </button>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Advanced Settings</h3>
              <button 
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {isAdvancedOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {isAdvancedOpen && (
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="space-y-4">
                  <button 
                    className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} border transition`}
                    onClick={() => alert('Data export requested')}
                  >
                    <span>Export Your Data</span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
                  </button>
                  
                  <button 
                    className={`w-full py-3 px-4 rounded-lg font-medium text-left flex justify-between items-center ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} border transition`}
                    onClick={() => alert('Account deletion confirmation would appear')}
                  >
                    <span>Delete Account</span>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <div className="mt-8">
            <button
              onClick={handleLogout}
              className={`w-full py-3 px-4 rounded-lg font-medium 
                        ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} 
                        text-white transition-colors duration-300`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}