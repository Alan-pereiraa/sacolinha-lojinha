import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { MODO_DEMO } from "@/lib/demo";
import { criarClienteDemo } from "@/lib/demo/cliente";

type ClienteSupabase = ReturnType<typeof createServerClient>;

/** Cliente do Supabase para Server Components, Server Actions e Route Handlers. */
export async function createClient(): Promise<ClienteSupabase> {
  if (MODO_DEMO) return criarClienteDemo() as unknown as ClienteSupabase;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
