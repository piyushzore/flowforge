import type { PipelineRun } from '../types/pipeline';

export const mockRuns: PipelineRun[] = [
  {
    id: 'r-1',
    pipelineId: 'p-1',
    pipelineName: 'Customer Sync',
    status: 'success',
    trigger: 'schedule',
    startedAt: '2023-10-01T09:00:00Z',
    completedAt: '2023-10-01T09:01:20Z',
    duration: 80,
    rowsIn: 5000,
    rowsOut: 4950,
    nodeResults: []
  },
  {
    id: 'r-2',
    pipelineId: 'p-1',
    pipelineName: 'Customer Sync',
    status: 'failed',
    trigger: 'manual',
    startedAt: '2023-10-02T10:15:00Z',
    completedAt: '2023-10-02T10:15:10Z',
    duration: 10,
    rowsIn: 5000,
    rowsOut: 0,
    error: 'PostgreSQL connection timeout',
    nodeResults: []
  }
];
