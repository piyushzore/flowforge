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
  }
];
