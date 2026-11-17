import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if valid credentials are provided
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl !== 'https://your-project.supabase.co' &&
  !rawUrl.includes('placeholder')
);

// Fallback dummy credentials to prevent createClient from throwing synchronously on page load
// if the environment variables are not yet configured on deployment
const fallbackUrl = 'https://demo-placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy-anon-key';

export const supabase = createClient(
  isSupabaseConfigured ? (rawUrl as string) : fallbackUrl,
  isSupabaseConfigured ? (rawKey as string) : fallbackKey
);
