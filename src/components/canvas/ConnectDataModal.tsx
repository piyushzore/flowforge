import React, { useState } from 'react';
import {
  X, Upload, Database, Globe, Cloud, Bot, HelpCircle,
  AlertCircle, CheckCircle2, RefreshCw, Layers, ShieldCheck, Check
} from 'lucide-react';
import { useUIStore } from '../../store/ui-store';
import { usePipelineStore } from '../../store/pipeline-store';

interface FieldSchema {
  name: string;
  type: string;
}

export default function ConnectDataModal() {
  const { activeModal, modalData, closeModal, addToast } = useUIStore();
  const { getActivePipeline, updateNode, takeSnapshot } = usePipelineStore();

  const isOpen = activeModal === 'connect-data';
  const node = modalData as { id: string; label: string; category: string; subType: string } | null;

  const [activeSourceGroup, setActiveSourceGroup] = useState<'file' | 'db' | 'api' | 'cloud' | 'saas' | 'queue'>('file');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [schemaFields, setSchemaFields] = useState<FieldSchema[]>([]);
  const [rowCount, setRowCount] = useState(0);

  // Form states
  const [fileName, setFileName] = useState('');
  const [dbName, setDbName] = useState('production_db');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUsername, setDbUsername] = useState('postgres');
  const [dbPassword, setDbPassword] = useState('password');
  const [dbTable, setDbTable] = useState('customers');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiUrl, setApiUrl] = useState('https://api.acme.com/v1/customers');
  const [apiHeaders, setApiHeaders] = useState('Content-Type: application/json');
  const [cloudProvider, setCloudProvider] = useState<'s3' | 'gcs' | 'azure'>('s3');
  const [cloudBucket, setCloudBucket] = useState('raw-data-bucket');
  const [cloudPath, setCloudPath] = useState('inbound/customers_2026.parquet');
  const [saasPlatform, setSaasPlatform] = useState('salesforce');
  const [saasObject, setSaasObject] = useState('Contact');
  const [saasAuthorized, setSaasAuthorized] = useState(false);
  const [queueTopic, setQueueTopic] = useState('customer-events');

  // Inline Transformations
  const [filterQuery, setFilterQuery] = useState('');
  const [limitCount, setLimitCount] = useState('1000');

  if (!isOpen || !node) return null;

  const handleTestConnection = () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage('');
    
    setTimeout(() => {
      setTesting(false);
      
      // Basic validation check
      if (activeSourceGroup === 'db' && (!dbHost || !dbUsername || !dbPassword)) {
        setTestResult('error');
        setErrorMessage('CONNECTION_FAILED: Could not connect to server. Check host, username, and password.');
        return;
      }
      if (activeSourceGroup === 'api' && !apiUrl) {
        setTestResult('error');
        setErrorMessage('INVALID_CONFIG: Missing required field: Base URL');
        return;
      }
      if (activeSourceGroup === 'cloud' && !cloudBucket) {
        setTestResult('error');
        setErrorMessage('AUTH_FAILED: Invalid credentials. Lacks access permission to this container.');
        return;
      }
      
      setTestResult('success');
      
      // Populate mock preview based on selected type
      if (activeSourceGroup === 'file') {
        setRowCount(1250);
        setSchemaFields([
          { name: 'id', type: 'Integer' },
          { name: 'name', type: 'String' },
          { name: 'email', type: 'String' },
          { name: 'status', type: 'String' }
        ]);
        setPreviewRows([
          { id: 1, name: 'Alice Smith', email: 'alice@example.com', status: 'Active' },
          { id: 2, name: 'Bob Jones', email: 'bob@example.com', status: 'Pending' },
          { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', status: 'Inactive' }
        ]);
      } else if (activeSourceGroup === 'db') {
        setRowCount(5000);
        setSchemaFields([
          { name: 'id', type: 'Integer' },
          { name: 'name', type: 'String' },
          { name: 'email', type: 'String' },
          { name: 'salary', type: 'Decimal' }
        ]);
        setPreviewRows([
          { id: 101, name: 'Marcus Rivera', email: 'marcus@flowforge.dev', salary: 125000.00 },
          { id: 102, name: 'Sarah Chen', email: 'sarah@flowforge.dev', salary: 145000.00 },
          { id: 103, name: 'Alex Chen', email: 'alex@flowforge.dev', salary: 110000.00 }
        ]);
      } else {
        setRowCount(350);
        setSchemaFields([
          { name: 'id', type: 'String' },
          { name: 'created_at', type: 'Timestamp' },
          { name: 'payload', type: 'JSON' }
        ]);
        setPreviewRows([
          { id: 'evt_9281a', created_at: '2026-07-18T10:00:00Z', payload: '{"event":"signup"}' },
          { id: 'evt_9281b', created_at: '2026-07-18T10:05:00Z', payload: '{"event":"checkout"}' }
        ]);
      }
    }, 1200);
  };

  const handleConfirm = () => {
    const pipeline = getActivePipeline();
    if (!pipeline) return;

    let sourceName = 'Mock Connection';
    if (activeSourceGroup === 'file') sourceName = fileName || 'Uploaded File';
    else if (activeSourceGroup === 'db') sourceName = `${dbName} (${dbTable})`;
    else if (activeSourceGroup === 'api') sourceName = `API Endpoint (${apiMethod})`;
    else if (activeSourceGroup === 'cloud') sourceName = `${cloudProvider}://${cloudBucket}/${cloudPath.split('/').pop()}`;
    else if (activeSourceGroup === 'saas') sourceName = `${saasPlatform} (${saasObject})`;
    else if (activeSourceGroup === 'queue') sourceName = `Topic: ${queueTopic}`;

    const configUpdate: any = {
      configured: true,
      connectionName: sourceName,
      sourceType: activeSourceGroup,
      rowCount: previewRows ? rowCount : 1000,
      columnCount: schemaFields.length || 3,
      lastUpdated: 'Just now',
      previewData: previewRows || [
        { key: 'sample_1', value: 'data_1' },
        { key: 'sample_2', value: 'data_2' }
      ],
      outputSchema: schemaFields.map(f => ({ name: f.name, type: f.type.toLowerCase() }))
    };

    updateNode(pipeline.id, node.id, configUpdate);
    takeSnapshot(pipeline.id);

    addToast({
      type: 'success',
      title: 'Data Connected Successfully',
      message: `Node is now linked to ${sourceName} (${configUpdate.rowCount} rows detected).`
    });
    
    closeModal();
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setTesting(true);
      setTestResult(null);
      setErrorMessage('');
      
      // Simulate auto-detection of schema and rows for the uploaded file
      setTimeout(() => {
        setTesting(false);
        setTestResult('success');
        setRowCount(Math.floor(500 + Math.random() * 2000));
        
        if (file.name.endsWith('.json')) {
          setSchemaFields([
            { name: 'user_id', type: 'String' },
            { name: 'event_type', type: 'String' },
            { name: 'properties', type: 'JSON' }
          ]);
          setPreviewRows([
            { user_id: 'usr_01', event_type: 'page_view', properties: '{"path":"/home"}' },
            { user_id: 'usr_02', event_type: 'purchase', properties: '{"amount":99.9}' }
          ]);
        } else {
          setSchemaFields([
            { name: 'id', type: 'Integer' },
            { name: 'name', type: 'String' },
            { name: 'email', type: 'String' },
            { name: 'status', type: 'String' }
          ]);
          setPreviewRows([
            { id: 1, name: 'Alice Smith', email: 'alice@example.com', status: 'Active' },
            { id: 2, name: 'Bob Jones', email: 'bob@example.com', status: 'Pending' },
            { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', status: 'Inactive' }
          ]);
        }
      }, 800);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[920px] max-w-full max-h-[85vh] flex flex-col overflow-hidden animate-slide-in-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="text-blue-600 dark:text-blue-400 w-5 h-5 animate-pulse" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Connect Data Source</h3>
              <p className="text-[11px] text-slate-500">Node: {node.label} ({node.subType.replace(/-/g, ' ')})</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Source Categories Selector */}
        <div className="flex bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-2 gap-1.5 flex-shrink-0">
          {[
            { id: 'file', label: 'File Upload', icon: <Upload size={14} /> },
            { id: 'db', label: 'Database', icon: <Database size={14} /> },
            { id: 'api', label: 'API / Webhook', icon: <Globe size={14} /> },
            { id: 'cloud', label: 'Cloud Storage', icon: <Cloud size={14} /> },
            { id: 'saas', label: 'SaaS Integration', icon: <Bot size={14} /> },
            { id: 'queue', label: 'Message Queue', icon: <Layers size={14} /> }
          ].map(grp => {
            const active = activeSourceGroup === grp.id;
            return (
              <button
                key={grp.id}
                onClick={() => {
                  setActiveSourceGroup(grp.id as any);
                  setTestResult(null);
                  setPreviewRows(null);
                  setSchemaFields([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {grp.icon}
                {grp.label}
              </button>
            );
          })}
        </div>

        {/* Form area & preview split layout */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left panel: Conditional Form */}
          <div className="w-1/2 p-6 border-r border-slate-100 dark:border-slate-800 overflow-y-auto space-y-4">
            {activeSourceGroup === 'file' && (
              <div className="space-y-4">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Drag and drop your file</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.json,.xlsx,.xls,.parquet,.tsv"
                  className="hidden"
                />
                <div
                  onClick={triggerFileSelect}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {fileName ? `Selected file: ${fileName}` : 'Click to upload CSV, JSON, Excel or Parquet'}
                  </span>
                  <span className="text-[10px] text-slate-400">Max size: 100MB</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">CSV Delimiter</label>
                    <select className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300">
                      <option value=",">Comma ( , )</option>
                      <option value=";">Semicolon ( ; )</option>
                      <option value="\t">Tab ( \t )</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Character Encoding</label>
                    <select className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300">
                      <option value="utf8">UTF-8</option>
                      <option value="ascii">ASCII</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeSourceGroup === 'db' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Database Type</label>
                    <select className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300">
                      <option value="postgres">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mongodb">MongoDB</option>
                      <option value="snowflake">Snowflake</option>
                      <option value="bigquery">BigQuery</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Configuration Name</label>
                    <input
                      type="text" value={dbName} onChange={e => setDbName(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-500 block mb-1">Host Server</label>
                    <input
                      type="text" value={dbHost} onChange={e => setDbHost(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Port</label>
                    <input
                      type="text" value={dbPort} onChange={e => setDbPort(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Username</label>
                    <input
                      type="text" value={dbUsername} onChange={e => setDbUsername(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Password</label>
                    <input
                      type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Select Table / Query Mode</label>
                  <input
                    type="text" value={dbTable} onChange={e => setDbTable(e.target.value)}
                    placeholder="Enter table name or custom SQL query"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            )}

            {activeSourceGroup === 'api' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Method</label>
                    <select
                      value={apiMethod} onChange={e => setApiMethod(e.target.value as any)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-500 block mb-1">API Endpoint URL</label>
                    <input
                      type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Request Headers (Key: Value per line)</label>
                  <textarea
                    rows={2} value={apiHeaders} onChange={e => setApiHeaders(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Authorization Method</label>
                  <select className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300">
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key Header</option>
                  </select>
                </div>
              </div>
            )}

            {activeSourceGroup === 'cloud' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Cloud Provider</label>
                  <select
                    value={cloudProvider} onChange={e => setCloudProvider(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                  >
                    <option value="s3">AWS S3 Bucket</option>
                    <option value="gcs">Google Cloud Storage</option>
                    <option value="azure">Azure Blob Storage</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Bucket Name</label>
                  <input
                    type="text" value={cloudBucket} onChange={e => setCloudBucket(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">File Path / Glob Prefix</label>
                  <input
                    type="text" value={cloudPath} onChange={e => setCloudPath(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            )}

            {activeSourceGroup === 'saas' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Select platform</label>
                  <select
                    value={saasPlatform} onChange={e => setSaasPlatform(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                  >
                    <option value="salesforce">Salesforce</option>
                    <option value="hubspot">HubSpot</option>
                    <option value="stripe">Stripe</option>
                    <option value="shopify">Shopify</option>
                    <option value="airtable">Airtable</option>
                  </select>
                </div>

                {!saasAuthorized ? (
                  <button
                    onClick={() => {
                      setTesting(true);
                      setTimeout(() => {
                        setTesting(false);
                        setSaasAuthorized(true);
                      }, 1000);
                    }}
                    className="w-full py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold"
                  >
                    🔐 Authorize via OAuth 2.0
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
                      <Check size={14} /> OAuth Connection Linked
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Target Object / Endpoint</label>
                      <input
                        type="text" value={saasObject} onChange={e => setSaasObject(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSourceGroup === 'queue' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Message Broker</label>
                  <select className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300">
                    <option value="kafka">Apache Kafka</option>
                    <option value="rabbitmq">RabbitMQ</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Queue / Topic Name</label>
                  <input
                    type="text" value={queueTopic} onChange={e => setQueueTopic(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Optional Transformation Filters */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 space-y-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Optional Transformations</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Filter Query</label>
                  <input
                    type="text" value={filterQuery} onChange={e => setFilterQuery(e.target.value)}
                    placeholder="e.g. salary > 50000"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Limit Row Count</label>
                  <input
                    type="text" value={limitCount} onChange={e => setLimitCount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Actions: Test Connection */}
            <div className="pt-2">
              <button
                disabled={testing}
                onClick={handleTestConnection}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '🔌'}
                {testing ? 'Testing connection...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {/* Right panel: Preview & Schema */}
          <div className="w-1/2 bg-slate-50/50 dark:bg-slate-950/20 p-6 flex flex-col overflow-hidden">
            {/* Header info */}
            <div className="flex-shrink-0 flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Data Source Preview</span>
              {testResult === 'success' && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={12} /> Live Connected
                </div>
              )}
            </div>

            {/* Main box content */}
            <div className="flex-1 flex flex-col justify-center min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative">
              {/* Test loading/none states */}
              {!previewRows && !testing && !errorMessage && (
                <div className="text-center p-6 space-y-2">
                  <Database className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Connection Active</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Fill in the fields on the left and click "Test Connection" to fetch live rows and detect columns.</p>
                </div>
              )}

              {testing && (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Fetching schemas and rows...</span>
                </div>
              )}

              {testResult === 'error' && errorMessage && (
                <div className="p-6 space-y-3 text-center">
                  <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-400">Connection Failed</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">{errorMessage}</p>
                </div>
              )}

              {/* Data Table Preview */}
              {previewRows && previewRows.length > 0 && !testing && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Stats header */}
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between text-[11px] text-slate-500 flex-shrink-0">
                    <span>Rows: {rowCount.toLocaleString()} (showing first 3)</span>
                    <span>Columns: {schemaFields.length}</span>
                  </div>

                  {/* Table area */}
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                          {Object.keys(previewRows[0]).map(col => (
                            <th key={col} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            {Object.values(row).map((val: any, vIdx) => (
                              <td key={vIdx} className="px-3 py-1.5 text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Detected schema list */}
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">Detected Column Schema</span>
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                      {schemaFields.map(f => (
                        <div key={f.name} className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          <span>{f.name}</span>
                          <span className="text-slate-400 text-[9px] font-mono">({f.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <span className="text-[11px] text-slate-400">Credentials are secured at rest using AES-256 keys.</span>
          <div className="flex gap-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!previewRows}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              Confirm connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
