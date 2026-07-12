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

// Mock empty pages for remaining routes
const Transforms = () => <div className="p-8"><h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Transform Library</h1><p className="text-slate-500">Manage custom code transforms.</p></div>;
const Team = () => <div className="p-8"><h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">Team & Permissions</h1><p className="text-slate-500">Manage workspace members.</p></div>;
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
