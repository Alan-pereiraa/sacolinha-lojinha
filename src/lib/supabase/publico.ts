import "server-only";
import { createClient as criar, type SupabaseClient } from "@supabase/supabase-js";
import { MODO_DEMO } from "@/lib/demo";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { criarClienteDemo } from "@/lib/demo/cliente";

let cliente: SupabaseClient | null = null;

/**
 * Cliente anônimo, sem cookies: lê só o que a vitrine pública pode ver (RLS de visitante).
 * Por não depender da sessão, o resultado pode ficar em cache e servir todo mundo.
 */
export function clientePublico(): SupabaseClient {
  if (MODO_DEMO) return criarClienteDemo() as unknown as SupabaseClient;
  cliente ??= criar(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}
