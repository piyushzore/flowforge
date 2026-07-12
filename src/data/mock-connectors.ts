import type { ConnectorDefinition } from '../types/connector';

export const connectorDefinitions: ConnectorDefinition[] = [
  // Databases
  {
    id: 'postgres', name: 'PostgreSQL', category: 'database', direction: 'both',
    icon: '🐘', color: '#336791', description: 'Connect to PostgreSQL database.',
    shortDescription: 'Open source relational database', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '5432' }, { name: 'database', label: 'Database', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental', 'cdc'], maturity: 'ga', popular: true
  },
  {
    id: 'mysql', name: 'MySQL', category: 'database', direction: 'both',
    icon: '🐬', color: '#4479A1', description: 'Connect to MySQL database.',
    shortDescription: 'Relational database', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '3306' }, { name: 'database', label: 'Database', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental', 'cdc'], maturity: 'ga', popular: true
  },
  {
    id: 'sqlserver', name: 'SQL Server', category: 'database', direction: 'both',
    icon: '🗄️', color: '#CC292B', description: 'Connect to Microsoft SQL Server.',
    shortDescription: 'Microsoft relational database', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '1433' }, { name: 'database', label: 'Database', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental', 'cdc'], maturity: 'ga'
  },
  {
    id: 'oracle', name: 'Oracle DB', category: 'database', direction: 'both',
    icon: '🔴', color: '#F80000', description: 'Connect to Oracle Database.',
    shortDescription: 'Enterprise relational database', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '1521' }, { name: 'service_name', label: 'Service Name', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'mongodb', name: 'MongoDB', category: 'database', direction: 'both',
    icon: '🍃', color: '#47A248', description: 'Connect to MongoDB NoSQL database.',
    shortDescription: 'NoSQL document database', authType: 'basic',
    authFields: [{ name: 'connection_string', label: 'Connection String', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'redis', name: 'Redis', category: 'database', direction: 'both',
    icon: '🟥', color: '#DC382D', description: 'Connect to Redis in-memory store.',
    shortDescription: 'In-memory data structure store', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '6379' }, { name: 'password', label: 'Password', type: 'password', required: false }],
    supportedSyncModes: ['full-refresh'], maturity: 'beta'
  },
  // Warehouses
  {
    id: 'snowflake', name: 'Snowflake', category: 'warehouse', direction: 'both',
    icon: '❄️', color: '#29B5E8', description: 'Connect to Snowflake data cloud.',
    shortDescription: 'Cloud data warehouse', authType: 'basic',
    authFields: [{ name: 'account', label: 'Account Identifier', type: 'text', required: true }, { name: 'warehouse', label: 'Warehouse', type: 'text', required: true }, { name: 'database', label: 'Database', type: 'text', required: true }, { name: 'schema', label: 'Schema', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'bigquery', name: 'BigQuery', category: 'warehouse', direction: 'both',
    icon: '🔍', color: '#4285F4', description: 'Connect to Google BigQuery.',
    shortDescription: 'Google cloud data warehouse', authType: 'oauth2',
    authFields: [{ name: 'project_id', label: 'Project ID', type: 'text', required: true }, { name: 'dataset_id', label: 'Dataset ID', type: 'text', required: true }, { name: 'credentials_json', label: 'Service Account JSON', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'redshift', name: 'Amazon Redshift', category: 'warehouse', direction: 'both',
    icon: '📦', color: '#8C4FFF', description: 'Connect to Amazon Redshift.',
    shortDescription: 'AWS data warehouse', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '5439' }, { name: 'database', label: 'Database Name', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'databricks', name: 'Databricks', category: 'warehouse', direction: 'both',
    icon: '🧱', color: '#FF3621', description: 'Connect to Databricks Lakehouse.',
    shortDescription: 'Unified data analytics platform', authType: 'api-key',
    authFields: [{ name: 'server_hostname', label: 'Server Hostname', type: 'text', required: true }, { name: 'http_path', label: 'HTTP Path', type: 'text', required: true }, { name: 'access_token', label: 'Personal Access Token', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'clickhouse', name: 'ClickHouse', category: 'warehouse', direction: 'both',
    icon: '⚡', color: '#FFCC01', description: 'Connect to ClickHouse OLAP.',
    shortDescription: 'Fast open-source OLAP DBMS', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '8123' }, { name: 'database', label: 'Database Name', type: 'text', required: true }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'beta'
  },
  // SaaS
  {
    id: 'google-sheets', name: 'Google Sheets', category: 'saas', direction: 'both',
    icon: '📊', color: '#0F9D58', description: 'Read data from or write data to Google Sheets.',
    shortDescription: 'Online spreadsheet app', authType: 'oauth2',
    authFields: [], supportedSyncModes: ['full-refresh'], maturity: 'ga', popular: true
  },
  {
    id: 'salesforce', name: 'Salesforce', category: 'saas', direction: 'source',
    icon: '☁️', color: '#00A1E0', description: 'Extract data from Salesforce CRM.',
    shortDescription: 'Customer relationship management', authType: 'oauth2',
    authFields: [{ name: 'environment', label: 'Environment', type: 'select', required: true, options: [{label: 'Production', value: 'login'}, {label: 'Sandbox', value: 'test'}] }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'stripe', name: 'Stripe', category: 'saas', direction: 'source',
    icon: '💳', color: '#635BFF', description: 'Extract payment and customer data.',
    shortDescription: 'Payment processing platform', authType: 'api-key',
    authFields: [{ name: 'api_key', label: 'Secret API Key', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'hubspot', name: 'HubSpot', category: 'saas', direction: 'both',
    icon: '🧡', color: '#FF7A59', description: 'Sync marketing and CRM data.',
    shortDescription: 'Inbound marketing and sales', authType: 'oauth2',
    authFields: [{ name: 'access_token', label: 'Private App Token', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'shopify', name: 'Shopify', category: 'saas', direction: 'source',
    icon: '🛍️', color: '#95BF47', description: 'Extract e-commerce store data.',
    shortDescription: 'E-commerce platform', authType: 'api-key',
    authFields: [{ name: 'shop_name', label: 'Shop Name', type: 'text', required: true }, { name: 'access_token', label: 'Admin API Access Token', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'zendesk', name: 'Zendesk Support', category: 'saas', direction: 'source',
    icon: '🎧', color: '#03363D', description: 'Extract customer support tickets.',
    shortDescription: 'Customer service platform', authType: 'api-key',
    authFields: [{ name: 'subdomain', label: 'Subdomain', type: 'text', required: true }, { name: 'email', label: 'Email', type: 'text', required: true }, { name: 'api_token', label: 'API Token', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'github', name: 'GitHub', category: 'saas', direction: 'source',
    icon: '🐙', color: '#24292E', description: 'Extract issues, PRs, and commits.',
    shortDescription: 'Code hosting platform', authType: 'api-key',
    authFields: [{ name: 'personal_access_token', label: 'Personal Access Token', type: 'password', required: true }, { name: 'repository', label: 'Repository (owner/repo)', type: 'text', required: false }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'slack', name: 'Slack', category: 'saas', direction: 'destination',
    icon: '💬', color: '#E01E5A', description: 'Send alerts or data to Slack.',
    shortDescription: 'Team messaging platform', authType: 'oauth2',
    authFields: [{ name: 'bot_token', label: 'Bot User OAuth Token', type: 'password', required: true }, { name: 'channel_id', label: 'Default Channel ID', type: 'text', required: true }],
    supportedSyncModes: ['full-refresh'], maturity: 'ga'
  },
  {
    id: 'airtable', name: 'Airtable', category: 'saas', direction: 'both',
    icon: '🎈', color: '#F82B60', description: 'Sync records with Airtable bases.',
    shortDescription: 'Cloud collaboration service', authType: 'api-key',
    authFields: [{ name: 'personal_access_token', label: 'Personal Access Token', type: 'password', required: true }, { name: 'base_id', label: 'Base ID', type: 'text', required: true }],
    supportedSyncModes: ['full-refresh'], maturity: 'ga'
  },
  {
    id: 'notion', name: 'Notion', category: 'saas', direction: 'both',
    icon: '📓', color: '#000000', description: 'Read and write to Notion databases.',
    shortDescription: 'Connected workspace', authType: 'api-key',
    authFields: [{ name: 'internal_integration_token', label: 'Internal Integration Token', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh'], maturity: 'beta'
  },
  // Cloud Storage
  {
    id: 's3', name: 'Amazon S3', category: 'cloud-storage', direction: 'both',
    icon: '🪣', color: '#E3512B', description: 'Read or write files in AWS S3.',
    shortDescription: 'AWS object storage', authType: 'basic',
    authFields: [{ name: 'bucket', label: 'Bucket Name', type: 'text', required: true }, { name: 'access_key_id', label: 'AWS Access Key ID', type: 'password', required: true }, { name: 'secret_access_key', label: 'AWS Secret Access Key', type: 'password', required: true }, { name: 'region', label: 'AWS Region', type: 'text', required: true, defaultValue: 'us-east-1' }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'gcs', name: 'Google Cloud Storage', category: 'cloud-storage', direction: 'both',
    icon: '🗂️', color: '#4285F4', description: 'Read or write files in Google Cloud.',
    shortDescription: 'GCP object storage', authType: 'oauth2',
    authFields: [{ name: 'bucket', label: 'Bucket Name', type: 'text', required: true }, { name: 'service_account_json', label: 'Service Account JSON', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'azure-blob', name: 'Azure Blob Storage', category: 'cloud-storage', direction: 'both',
    icon: '☁️', color: '#0078D4', description: 'Read or write files in Azure.',
    shortDescription: 'Microsoft object storage', authType: 'api-key',
    authFields: [{ name: 'account_name', label: 'Storage Account Name', type: 'text', required: true }, { name: 'container_name', label: 'Container Name', type: 'text', required: true }, { name: 'account_key', label: 'Account Key', type: 'password', required: true }],
    supportedSyncModes: ['full-refresh', 'incremental'], maturity: 'ga'
  },
  {
    id: 'sftp', name: 'SFTP', category: 'cloud-storage', direction: 'both',
    icon: '📁', color: '#4B5563', description: 'Read or write files over SFTP.',
    shortDescription: 'Secure File Transfer Protocol', authType: 'basic',
    authFields: [{ name: 'host', label: 'Host', type: 'text', required: true }, { name: 'port', label: 'Port', type: 'number', required: true, defaultValue: '22' }, { name: 'username', label: 'Username', type: 'text', required: true }, { name: 'password', label: 'Password', type: 'password', required: false }, { name: 'private_key', label: 'Private Key', type: 'password', required: false }],
    supportedSyncModes: ['full-refresh'], maturity: 'ga'
  },
  // Streaming
  {
    id: 'kafka', name: 'Apache Kafka', category: 'streaming', direction: 'both',
    icon: '📨', color: '#231F20', description: 'Consume or produce Kafka messages.',
    shortDescription: 'Distributed event streaming', authType: 'basic',
    authFields: [{ name: 'bootstrap_servers', label: 'Bootstrap Servers', type: 'text', required: true }, { name: 'topic', label: 'Topic Name', type: 'text', required: true }, { name: 'security_protocol', label: 'Security Protocol', type: 'select', required: true, options: [{label: 'PLAINTEXT', value: 'PLAINTEXT'}, {label: 'SASL_SSL', value: 'SASL_SSL'}] }],
    supportedSyncModes: ['incremental'], maturity: 'ga', popular: true
  },
  {
    id: 'webhook', name: 'Webhook', category: 'streaming', direction: 'source',
    icon: '🎣', color: '#8B5CF6', description: 'Receive real-time HTTP payloads.',
    shortDescription: 'HTTP push API', authType: 'none',
    authFields: [{ name: 'webhook_url', label: 'Generated Webhook URL (Read Only)', type: 'text', required: false }],
    supportedSyncModes: ['incremental'], maturity: 'ga'
  },
  // Generic / File
  {
    id: 'rest-api', name: 'REST API', category: 'generic', direction: 'both',
    icon: '🌐', color: '#3B82F6', description: 'Connect to any generic REST API.',
    shortDescription: 'Generic HTTP requests', authType: 'none',
    authFields: [{ name: 'base_url', label: 'Base URL', type: 'url', required: true }, { name: 'auth_header', label: 'Authorization Header', type: 'password', required: false }],
    supportedSyncModes: ['full-refresh'], maturity: 'ga'
  },
  {
    id: 'graphql', name: 'GraphQL', category: 'generic', direction: 'source',
    icon: '🕸️', color: '#E10098', description: 'Fetch data via GraphQL queries.',
    shortDescription: 'GraphQL API Endpoint', authType: 'none',
    authFields: [{ name: 'endpoint', label: 'GraphQL Endpoint URL', type: 'url', required: true }, { name: 'auth_token', label: 'Auth Token', type: 'password', required: false }],
    supportedSyncModes: ['full-refresh'], maturity: 'beta'
  },
  {
    id: 'csv-upload', name: 'CSV Upload', category: 'file', direction: 'source',
    icon: '📄', color: '#10B981', description: 'Upload a CSV file directly.',
    shortDescription: 'Comma-separated values file', authType: 'none',
    authFields: [], supportedSyncModes: ['full-refresh'], maturity: 'ga'
  }
];
