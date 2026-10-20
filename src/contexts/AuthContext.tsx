import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { usePipelineStore } from '../store/pipeline-store';
import { useConnectorStore } from '../store/connector-store';

interface Org {
  id: string;
  name: string;
  plan_tier: string;
  seat_limit: number;
}

interface AuthContextType {
  user: User | null;
  org: Org | null;
  role: string | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  org: null,
  role: null,
  session: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgDetails = async (userId: string) => {
    try {
      // Get user's org mapping
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', userId)
        .single();
        
      if (userError || !userData) {
        console.error('Error fetching user org mapping', userError);
        return;
      }
      
      setRole(userData.role);

      // Get org details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.org_id)
        .single();
        
      if (orgError) {
        console.error('Error fetching org details', orgError);
        return;
      }
      
      setOrg(orgData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const { loadAllPipelines, loadRuns } = usePipelineStore.getState();
    const { loadInstances } = useConnectorStore.getState();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrgDetails(session.user.id).then(() => {
          setLoading(false);
          loadAllPipelines();
          loadInstances();
          loadRuns();
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchOrgDetails(session.user.id);
        loadAllPipelines();
        loadInstances();
        loadRuns();
      } else {
        setOrg(null);
        setRole(null);
        usePipelineStore.setState({ pipelines: [], activePipelineId: null });
        useConnectorStore.setState({ instances: [] });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, org, role, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
