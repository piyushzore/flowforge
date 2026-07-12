import { create } from 'zustand';
import { connectorDefinitions } from '../data/mock-connectors';
import type { ConnectorDefinition, ConnectorInstance } from '../types/connector';
import { v4 as uuidv4 } from 'uuid';

interface ConnectorState {
  definitions: ConnectorDefinition[];
  instances: ConnectorInstance[];
  
  addInstance: (instance: Omit<ConnectorInstance, 'id' | 'createdAt' | 'health' | 'pipelinesUsing'>) => string;
  updateInstance: (id: string, updates: Partial<ConnectorInstance>) => void;
  deleteInstance: (id: string) => void;
  
  testConnection: (instanceId: string) => Promise<boolean>;
  
  getDefinition: (id: string) => ConnectorDefinition | undefined;
  getInstance: (id: string) => ConnectorInstance | undefined;
  getInstancesByDirection: (direction: 'source' | 'destination') => ConnectorInstance[];
}

export const useConnectorStore = create<ConnectorState>()((set, get) => ({
  definitions: connectorDefinitions,
  instances: [
    {
      id: 'gs-1',
      name: 'Marketing Google Sheets',
      connectorId: 'google-sheets',
      createdAt: new Date().toISOString(),
      health: 'healthy',
      pipelinesUsing: 2,
      config: {}
    },
    {
      id: 'pg-1',
      name: 'Production PostgreSQL',
      connectorId: 'postgres',
      createdAt: new Date().toISOString(),
      health: 'healthy',
      pipelinesUsing: 5,
      config: { host: 'db.prod.internal' }
    }
  ] as any[],
  
  addInstance: (instance) => {
    const id = uuidv4();
    const newInstance: ConnectorInstance = {
      ...instance,
      id,
      createdAt: new Date().toISOString(),
      health: 'healthy',
      pipelinesUsing: []
    };
    set(state => ({ instances: [...state.instances, newInstance] }));
    return id;
  },
  
  updateInstance: (id, updates) => set(state => ({
    instances: state.instances.map(i => i.id === id ? { ...i, ...updates } : i)
  })),
  
  deleteInstance: (id) => set(state => ({
    instances: state.instances.filter(i => i.id !== id)
  })),
  
  testConnection: async (_instanceId) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(Math.random() > 0.1);
      }, 1500);
    });
  },
  
  getDefinition: (id) => get().definitions.find(d => d.id === id),
  getInstance: (id) => get().instances.find(i => i.id === id),
  getInstancesByDirection: (direction) => {
    const { instances, definitions } = get();
    return instances.filter(i => {
      const def = definitions.find(d => d.id === i.connectorId);
      return def && (def.direction === direction || def.direction === 'both');
    });
  }
}));
