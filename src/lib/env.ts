const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseEnv = {
  url,
  anonKey,
  configured: url.startsWith("https://") && anonKey.length > 20 && !anonKey.includes("service_role"),
};
