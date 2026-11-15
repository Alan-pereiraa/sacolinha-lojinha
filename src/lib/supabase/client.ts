"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Cliente do Supabase para componentes de navegador (upload de fotos, leitor). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
