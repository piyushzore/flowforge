import type { Pipeline } from '../types/pipeline';

export const mockPipelines: Pipeline[] = [
  {
    id: 'p-1',
    name: 'Customer Sync',
    description: 'Sync customers from Sheets to Postgres',
    status: 'active',
    workspaceId: 'ws-1',
    createdBy: 'u-1',
    createdAt: '2023-10-01T12:00:00Z',
    updatedAt: '2023-10-02T12:00:00Z',
    currentVersionIndex: 0,
    versions: [],
    schedule: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
    nodes: [
      { id: 'n1', type: 'source', position: { x: 100, y: 100 }, data: { label: 'Google Sheets', category: 'source', subType: 'google-sheets', configured: true } },
      { id: 'n2', type: 'transform', position: { x: 400, y: 100 }, data: { label: 'Filter Active', category: 'transform', subType: 'filter', configured: true } },
      { id: 'n3', type: 'destination', position: { x: 700, y: 100 }, data: { label: 'Postgres', category: 'destination', subType: 'postgres', configured: true } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'animated' },
      { id: 'e2', source: 'n2', target: 'n3', type: 'animated' }
    ]
  },
  {
    id: 'p-2',
    name: 'Revenue Report',
    description: 'Stripe to Sheets',
    status: 'draft',
    workspaceId: 'ws-1',
    createdBy: 'u-1',
    createdAt: '2023-10-05T12:00:00Z',
    updatedAt: '2023-10-05T12:00:00Z',
    currentVersionIndex: 0,
    versions: [],
    nodes: [
      { id: 'n1', type: 'source', position: { x: 100, y: 100 }, data: { label: 'Stripe', category: 'source', subType: 'stripe', configured: true } },
      { id: 'n2', type: 'destination', position: { x: 400, y: 100 }, data: { label: 'Google Sheets', category: 'destination', subType: 'google-sheets', configured: false } }
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'animated' }
    ]
  },
  {
    id: 'p-3',
    name: 'Lakehouse Medallion Pipeline',
    description: 'Bronze Raw Ingestion, Silver Quality Verification, Gold Modeling, and Servicing to BI & AI systems.',
    status: 'draft',
    workspaceId: 'ws-1',
    createdBy: 'u-1',
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
    currentVersionIndex: 0,
    versions: [],
    nodes: [
      { id: 'm1', type: 'source', position: { x: 50, y: 150 }, data: { label: 'Kafka Ingestion Stream', category: 'source', subType: 'kafka', configured: true } },
      { id: 'm2', type: 'destination', position: { x: 250, y: 150 }, data: { label: 'Bronze Landing Zone', category: 'destination', subType: 'postgres', configured: true } },
      { id: 'm3', type: 'transform', position: { x: 450, y: 150 }, data: { label: 'Data Quality Validation', category: 'transform', subType: 'validation', configured: true } },
      { id: 'm4', type: 'destination', position: { x: 650, y: 150 }, data: { label: 'Silver Cleaned Layer', category: 'destination', subType: 'snowflake', configured: true } },
      { id: 'm5', type: 'transform', position: { x: 850, y: 150 }, data: { label: 'Gold Semantic Modeling', category: 'transform', subType: 'group-by', configured: true } },
      { id: 'm6', type: 'destination', position: { x: 1050, y: 50 }, data: { label: 'BI Serving Layer (Power BI)', category: 'destination', subType: 'google-sheets', configured: true } },
      { id: 'm7', type: 'destination', position: { x: 1050, y: 250 }, data: { label: 'AI Serving Model (ML Features)', category: 'destination', subType: 'slack', configured: true } }
    ],
    edges: [
      { id: 'me1', source: 'm1', target: 'm2', type: 'animated' },
      { id: 'me2', source: 'm2', target: 'm3', type: 'animated' },
      { id: 'me3', source: 'm3', target: 'm4', type: 'animated' },
      { id: 'me4', source: 'm4', target: 'm5', type: 'animated' },
      { id: 'me5', source: 'm5', target: 'm6', type: 'animated' },
      { id: 'me6', source: 'm5', target: 'm7', type: 'animated' }
    ]
  }
];
