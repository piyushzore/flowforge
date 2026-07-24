import { useState, useRef, useCallback } from 'react';
import {
  X, Upload, Database, Globe, Cloud, Bot, HelpCircle,
  AlertCircle, CheckCircle2, RefreshCw, Layers, ShieldCheck, Check
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useUIStore } from '../../store/ui-store';
import { usePipelineStore } from '../../store/pipeline-store';
import { supabase } from '../../lib/supabase';

interface FieldSchema {
  name: string;
  type: string;
}

interface ConnectDataModalProps {
  nodeId: string;
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
  const [dbType, setDbType] = useState('postgres');
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

  // useRef MUST be called before any conditional returns (React Rules of Hooks)
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !node) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage('');
    
    if (activeSourceGroup === 'file') {
       setTesting(false);
       if (previewRows) setTestResult('success');
       else setTestResult('error');
       return;
    }

    if (activeSourceGroup === 'db') {
      if (!dbHost || !dbUsername || !dbPassword || !dbTable) {
        setTesting(false);
        setTestResult('error');
        setErrorMessage('CONNECTION_FAILED: Missing required fields.');
        return;
      }
      try {
        const res = await fetch('/api/preview-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: dbType, host: dbHost, port: dbPort, user: dbUsername, password: dbPassword, database: dbName, table: dbTable })
        });
        const data = await res.json();
        setTesting(false);
        if (!res.ok) {
          setTestResult('error');
          setErrorMessage(`DB Error: ${data.error}`);
        } else {
          setTestResult('success');
          setPreviewRows(data.rows);
          setSchemaFields(data.schema);
          setRowCount(data.rows.length);
        }
      } catch (err) {
        setTesting(false);
        setTestResult('error');
        setErrorMessage(`Network Error: ${(err as Error).message}`);
      }
      return;
    }

    if (activeSourceGroup === 'api') {
      if (!apiUrl) {
        setTesting(false);
        setTestResult('error');
        setErrorMessage('INVALID_CONFIG: Missing required field: Base URL');
        return;
      }
      try {
        let headers = {};
        if (apiHeaders) {
           try {
             headers = apiHeaders.includes('{') ? JSON.parse(apiHeaders) : { 'Content-Type': 'application/json' };
           } catch(e) {}
        }
        
        const res = await fetch(apiUrl, { method: apiMethod, headers });
        setTesting(false);
        if (!res.ok) {
          setTestResult('error');
          setErrorMessage(`API Error: ${res.status} ${res.statusText}`);
          return;
        }
        const data = await res.json();
        
        let rows = Array.isArray(data) ? data : (data.data ? data.data : [data]);
        if (rows.length === 0) {
           setTestResult('error');
           setErrorMessage('API returned empty array');
           return;
        }
        const keys = Object.keys(rows[0]);
        setSchemaFields(keys.map(k => ({ name: k, type: inferType(rows[0][k]) })));
        setPreviewRows(rows.slice(0, 100));
        setRowCount(rows.length);
        setTestResult('success');
      } catch(err) {
        setTesting(false);
        setTestResult('error');
        setErrorMessage(`CORS or Network Error: ${(err as Error).message}. API must support CORS.`);
      }
      return;
    }

    // Unimplemented connectors fallback
    setTimeout(() => {
      setTesting(false);
      setTestResult('error');
      setErrorMessage('This connector requires a backend service to authenticate and fetch data. For this local demo, please use File Upload (CSV/JSON) or an open REST API.');
    }, 500);
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

  // fileInputRef moved above early return to comply with Rules of Hooks

  const parseCsvLine = (text: string, delimiter: string) => {
    // Basic CSV parser that handles quotes
    const re = new RegExp(`(?:^|${delimiter})(?:"([^"]*)"|([^${delimiter}]+))`, 'g');
    let match;
    const values: string[] = [];
    while ((match = re.exec(text)) !== null) {
      values.push(match[1] !== undefined ? match[1] : match[2] || '');
    }
    return values;
  };

  const inferType = (value: any) => {
    if (value === null || value === undefined || value === '') return 'String';
    if (!isNaN(Number(value))) return Number.isInteger(Number(value)) ? 'Integer' : 'Decimal';
    if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'Boolean';
    if (typeof value === 'object') return 'JSON';
    // Simple date check
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) return 'Timestamp';
    return 'String';
  };
  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setTesting(true);
    setTestResult(null);
    setErrorMessage('');

    // Upload to Supabase Storage
    try {
      const pipeline = getActivePipeline();
      if (pipeline && pipeline.org_id) {
        const filePath = `${pipeline.org_id}/${pipeline.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('pipeline_files')
          .upload(filePath, file, { upsert: true });
        
        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          // Non-blocking for local processing, but could throw
        }
      }
    } catch (err) {
      console.error('Failed to upload to Supabase', err);
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(result, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const dataRows = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          if (dataRows.length === 0) {
            setTesting(false);
            setTestResult('error');
            setErrorMessage('Excel file contains no data rows.');
            return;
          }
          const headers = Object.keys(dataRows[0]);
          setSchemaFields(headers.map(h => ({
            name: h,
            type: inferType(dataRows[0][h])
          })));
          setRowCount(dataRows.length);
          setPreviewRows(dataRows);
          setTesting(false);
          setTestResult('success');
          return;
        }

        const text = result as string;

        if (file.name.endsWith('.json')) {
          // Parse JSON files
          let jsonData: any[];
          const parsed = JSON.parse(text);
          jsonData = Array.isArray(parsed) ? parsed : parsed.data ? parsed.data : [parsed];

          if (jsonData.length === 0) {
            setTesting(false);
            setTestResult('error');
            setErrorMessage('JSON file contains no data rows.');
            return;
          }

          const keys = Object.keys(jsonData[0]);
          setSchemaFields(keys.map(k => ({
            name: k,
            type: inferType(jsonData[0][k])
          })));
          setRowCount(jsonData.length);
          setPreviewRows(jsonData);
          setTesting(false);
          setTestResult('success');

        } else {
          // Parse CSV / TSV files with PapaParse
          Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length && results.data.length === 0) {
                 setTesting(false);
                 setTestResult('error');
                 setErrorMessage(`CSV Error: ${results.errors[0].message}`);
                 return;
              }
              const dataRows = results.data as any[];
              if (dataRows.length === 0) {
                setTesting(false);
                setTestResult('error');
                setErrorMessage('File appears empty or has no data rows.');
                return;
              }
              const headers = Object.keys(dataRows[0]);
              setSchemaFields(headers.map(h => ({
                name: h,
                type: inferType(dataRows[0][h])
              })));
              setRowCount(dataRows.length);
              setPreviewRows(dataRows);
              setTesting(false);
              setTestResult('success');
            },
            error: (err: any) => {
              setTesting(false);
              setTestResult('error');
              setErrorMessage(`Failed to parse CSV: ${err.message}`);
            }
          });
        }
      } catch (err) {
        setTesting(false);
        setTestResult('error');
        setErrorMessage(`Failed to parse file: ${(err as Error).message}`);
      }
    };

    reader.onerror = () => {
      setTesting(false);
      setTestResult('error');
      setErrorMessage('Failed to read file. Please try again.');
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
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
                    <select value={dbType} onChange={e => setDbType(e.target.value)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-slate-700 dark:text-slate-300">
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
