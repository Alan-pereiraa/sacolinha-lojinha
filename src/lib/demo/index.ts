/** Sem Supabase configurado (ou com NEXT_PUBLIC_DEMO=1), o app roda com dados de exemplo. */
export const MODO_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_DEMO === "1";
