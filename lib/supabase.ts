import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — se crea en el primer uso, no al importar el módulo.
// Evita el error "supabaseUrl is required" durante el build de Next.js.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    _client = createClient(url, key);
  }
  return _client;
}
