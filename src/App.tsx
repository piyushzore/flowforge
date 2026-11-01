import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { usePipelineStore } from './store/pipeline-store';

// Route-level code-splitting with React.lazy
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PipelineEditor = lazy(() => import('./pages/PipelineEditor'));
const Connectors = lazy(() => import('./pages/Connectors'));
const ConnectorGallery = lazy(() => import('./pages/ConnectorGallery'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Schedules = lazy(() => import('./pages/Schedules'));
const PipelineList = lazy(() => import('./pages/PipelineList'));
const Templates = lazy(() => import('./pages/Templates'));
const Transforms = lazy(() => import('./pages/Transforms'));
const Settings = lazy(() => import('./pages/Settings'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Lineage = lazy(() => import('./pages/Lineage'));
const DataQuality = lazy(() => import('./pages/DataQuality'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Team = lazy(() => import('./pages/settings/Team'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px] w-full text-blue-600 dark:text-blue-400">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Loading view...</span>
      </div>
    </div>
  );
}

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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
                <Route path="lineage" element={<Lineage />} />
                <Route path="data-quality" element={<DataQuality />} />
                <Route path="schedules" element={<Schedules />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="templates" element={<Templates />} />
                <Route path="team" element={<Team />} />
                <Route path="settings" element={<Settings />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="pricing" element={<Pricing />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
