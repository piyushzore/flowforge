import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PipelineEditor from './pages/PipelineEditor';
import Dashboard from './pages/Dashboard';
import Connectors from './pages/Connectors';
import ConnectorGallery from './pages/ConnectorGallery';
import Monitoring from './pages/Monitoring';
import Schedules from './pages/Schedules';
import PipelineList from './pages/PipelineList';
import Templates from './pages/Templates';
import { usePipelineStore } from './store/pipeline-store';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Team from './pages/settings/Team';

// Mock empty pages for remaining routes
const Transforms = () => <div className="p-8"><h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Transform Library</h1><p className="text-slate-500">Manage custom code transforms.</p></div>;
const Settings = () => <div className="p-8"><h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Settings</h1><p className="text-slate-500">Workspace settings and API keys.</p></div>;
const Marketplace = () => <div className="p-8"><h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Marketplace</h1><p className="text-slate-500">Discover community extensions.</p></div>;

function PipelineEditorWrapper() {
  const { id } = useParams();
  const setActivePipeline = usePipelineStore(s => s.setActivePipeline);
  
  React.useEffect(() => {
    if (id) setActivePipeline(id);
  }, [id, setActivePipeline]);

  return <PipelineEditor />;
}

function App() {
  const loadAllPipelines = usePipelineStore(s => s.loadAllPipelines);
  
  React.useEffect(() => {
    loadAllPipelines();
  }, [loadAllPipelines]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="pipelines" element={<PipelineList />} />
            <Route path="pipelines/:id" element={<PipelineEditorWrapper />} />
            <Route path="connectors" element={<Connectors />} />
            <Route path="connector-gallery" element={<ConnectorGallery />} />
            <Route path="transforms" element={<Transforms />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="templates" element={<Templates />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
            <Route path="marketplace" element={<Marketplace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
