import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/supabase-proxy`;
  }
  return supabaseUrl;
};

export const supabase = isSupabaseConfigured
  ? createClient(getSupabaseUrl(), supabaseAnonKey)
  : null;

