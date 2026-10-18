import { create } from 'zustand';
import { connectorDefinitions } from '../data/mock-connectors';
import type { ConnectorDefinition, ConnectorInstance } from '../types/connector';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

interface ConnectorState {
  definitions: ConnectorDefinition[];
  instances: ConnectorInstance[];
  isLoading: boolean;
  
  loadInstances: () => Promise<void>;
  addInstance: (instance: Omit<ConnectorInstance, 'id' | 'createdAt' | 'health' | 'pipelinesUsing'>) => Promise<string>;
  updateInstance: (id: string, updates: Partial<ConnectorInstance>) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  
  testConnection: (instanceId: string) => Promise<boolean>;
  
  getDefinition: (id: string) => ConnectorDefinition | undefined;
  getInstance: (id: string) => ConnectorInstance | undefined;
  getInstancesByDirection: (direction: 'source' | 'destination') => ConnectorInstance[];
}

export const useConnectorStore = create<ConnectorState>()((set, get) => ({
  definitions: connectorDefinitions,
  instances: [],
  isLoading: false,

  loadInstances: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('connector_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not load connector credentials from Supabase, using local state:', error.message);
        set({ isLoading: false });
        return;
      }

      if (data && data.length > 0) {
        const loadedInstances: ConnectorInstance[] = data.map((row: any) => ({
          id: row.id,
          connectorId: row.connector_id,
          name: row.name,
          config: row.config || {},
          health: (row.health as any) || 'healthy',
          lastTested: row.last_tested,
          createdAt: row.created_at,
          createdBy: row.created_by,
          pipelinesUsing: []
        }));
        set({ instances: loadedInstances, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Error fetching connector instances:', err);
      set({ isLoading: false });
    }
  },
  
  addInstance: async (instance) => {
    const id = uuidv4();
    const newInstance: ConnectorInstance = {
      ...instance,
      id,
      createdAt: new Date().toISOString(),
      health: 'healthy',
      pipelinesUsing: []
    };
    
    // Optimistic UI update
    set(state => ({ instances: [...state.instances, newInstance] }));

    try {
      const { data: userData } = await supabase.auth.getUser();
      let orgId: string | null = null;
      if (userData?.user) {
        const { data: uData } = await supabase.from('users').select('org_id').eq('id', userData.user.id).single();
        if (uData) orgId = uData.org_id;
      }

      if (orgId) {
        await supabase.from('connector_credentials').insert({
          id,
          org_id: orgId,
          connector_id: instance.connectorId || instance.definitionId || 'generic',
          name: instance.name,
          config: instance.config || {},
          health: 'healthy',
          created_by: userData?.user?.id
        });
      }
    } catch (e) {
      console.warn('Failed to persist connector credential to Supabase:', e);
    }

    return id;
  },
  
  updateInstance: async (id, updates) => {
    set(state => ({
      instances: state.instances.map(i => i.id === id ? { ...i, ...updates } : i)
    }));

    try {
      await supabase.from('connector_credentials').update({
        ...(updates.name ? { name: updates.name } : {}),
        ...(updates.config ? { config: updates.config } : {}),
        ...(updates.health ? { health: updates.health } : {}),
        updated_at: new Date().toISOString()
      }).eq('id', id);
    } catch (e) {
      console.warn('Failed to update connector credential in Supabase:', e);
    }
  },
  
  deleteInstance: async (id) => {
    set(state => ({
      instances: state.instances.filter(i => i.id !== id)
    }));

    try {
      await supabase.from('connector_credentials').delete().eq('id', id);
    } catch (e) {
      console.warn('Failed to delete connector credential from Supabase:', e);
    }
  },
  
  testConnection: async (instanceId) => {
    const instance = get().instances.find(i => i.id === instanceId);
    if (!instance) return false;

    // Simulate real connection test latency
    await new Promise(resolve => setTimeout(resolve, 1000));
    const isHealthy = Boolean(instance.config && Object.keys(instance.config).length > 0);
    
    await get().updateInstance(instanceId, {
      health: isHealthy ? 'healthy' : 'error',
      lastTested: new Date().toISOString()
    });

    return isHealthy;
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
