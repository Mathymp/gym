import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

export const supabase: SupabaseClient | null = supabaseEnv.configured
  ? createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

export function requireClient() {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}
