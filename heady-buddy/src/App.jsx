import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Monitor, Code, Activity, Settings, History, Zap, Shield, Brain } from 'lucide-react';

// Components
import ControlPanel from './components/ControlPanel';
import AdminIDE from './components/AdminIDE';
import IDEOnly from './components/IDEOnly';
import SettingsPanel from './components/SettingsPanel';
import SystemHealth from './components/SystemHealth';
import ArenaMode from './components/ArenaMode';

function App() {
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    defaultMode: 'admin-ide',
    autoStart: true
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [currentView, setCurrentView] = useState('control-panel');

  // Load initial data
  useEffect(() => {
    loadPreferences();
    loadRecentProjects();
    setupEventListeners();
    
    // Check system health on load
    checkHealth();
    
    // Periodic health check
    const healthInterval = setInterval(checkHealth, 30000);
    
    return () => {
      clearInterval(healthInterval);
      if (window.headyAPI) {
        window.headyAPI.removeAllListeners('system-health');
        window.headyAPI.removeAllListeners('launch-mode');
      }
    };
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await window.headyAPI?.getUserPreferences();
      if (prefs) setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const loadRecentProjects = async () => {
    try {
      const projects = await window.headyAPI?.getRecentProjects();
      if (projects) setRecentProjects(projects);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  };

  const setupEventListeners = () => {
    if (!window.headyAPI) return;

    window.headyAPI.onSystemHealth((event, data) => {
      setSystemHealth(data);
    });

    window.headyAPI.onLaunchMode((event, data) => {
      setCurrentView(data.mode === 'admin-ide' ? 'admin-ide' : 'ide-only');
    });
  };

  const checkHealth = async () => {
    try {
      const health = await window.headyAPI?.checkHeadyServices();
      setSystemHealth(health);
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({ status: 'error', message: 'Unable to connect' });
    }
  };

  const savePreferences = async (newPreferences) => {
    try {
      await window.headyAPI?.setUserPreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const addProject = async (project) => {
    try {
      await window.headyAPI?.addRecentProject(project);
      await loadRecentProjects();
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const launchArenaMode = async () => {
    try {
      const result = await window.headyAPI?.launchArenaMode();
      if (result.status === 'success') {
        setCurrentView('arena-mode');
      }
    } catch (error) {
      console.error('Failed to launch Arena Mode:', error);
    }
  };

  const renderSidebar = () => (
    <div className="w-64 bg-gray-900 text-white p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Heady Buddy
        </h1>
        <p className="text-gray-400 text-sm mt-1">Your AI Companion</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setCurrentView('control-panel')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'control-panel' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Control Panel
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('admin-ide')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'admin-ide' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Admin + IDE
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('ide-only')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'ide-only' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Code className="w-4 h-4" />
              IDE Only
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('arena-mode')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'arena-mode' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              Arena Mode
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('system-health')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'system-health' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              System Health
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === 'settings' 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </li>
        </ul>
      </nav>

      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center gap-2 text-sm">
          <Shield className={`w-4 h-4 ${
            systemHealth?.status === 'OPTIMAL' ? 'text-green-500' : 
            systemHealth?.status === 'running' ? 'text-yellow-500' : 
            'text-red-500'
          }`} />
          <span className="text-gray-400">
            {systemHealth?.status || 'Checking...'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    switch (currentView) {
      case 'control-panel':
        return (
          <ControlPanel
            preferences={preferences}
            recentProjects={recentProjects}
            onLaunchArenaMode={launchArenaMode}
            onAddProject={addProject}
          />
        );
      case 'admin-ide':
        return <AdminIDE />;
      case 'ide-only':
        return <IDEOnly />;
      case 'arena-mode':
        return <ArenaMode />;
      case 'system-health':
        return <SystemHealth health={systemHealth} onRefresh={checkHealth} />;
      case 'settings':
        return <SettingsPanel preferences={preferences} onSave={savePreferences} />;
      default:
        return <ControlPanel />;
    }
  };

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {renderSidebar()}
        <main className="flex-1 overflow-hidden">
          {renderMainContent()}
        </main>
      </div>
    </Router>
  );
}

export default App;
