import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { MODO_DEMO } from "@/lib/demo";
import { CONFIG_OK, PROBLEMAS_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { criarClienteDemo } from "@/lib/demo/cliente";

type ClienteSupabase = ReturnType<typeof createServerClient>;

/** Cliente do Supabase para Server Components, Server Actions e Route Handlers. */
export async function createClient(): Promise<ClienteSupabase> {
  if (MODO_DEMO) return criarClienteDemo() as unknown as ClienteSupabase;
  // cookies() antes de tudo: marca a página como dinâmica (não é pré-renderizada no build)
  const cookieStore = await cookies();
  if (!CONFIG_OK) throw new Error(`Configuração do Supabase incompleta: ${PROBLEMAS_CONFIG.join(" ")} Veja /status.`);
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o proxy já renova a sessão.
          }
        },
      },
    },
  );
}
