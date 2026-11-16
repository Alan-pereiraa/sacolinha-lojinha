import type { Metadata } from "next";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { CONFIG_OK, MODO_DEMO, PROBLEMAS_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { evolutionConfigurada } from "@/lib/evolution";

export const metadata: Metadata = { title: "Diagnóstico", robots: { index: false } };

async function testarBanco(): Promise<{ ok: boolean; detalhe: string }> {
  if (!CONFIG_OK) return { ok: false, detalhe: "não testado (configuração incompleta)" };
  try {
    const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookies: { getAll: () => [], setAll: () => {} } });
    const { error } = await sb.rpc("slug_disponivel", { p_slug: "teste-de-conexao" });
    if (!error) return { ok: true, detalhe: "conectado e com o banco da Sacolinha instalado" };
    if (/Invalid API key|JWT/i.test(error.message)) return { ok: false, detalhe: "o Supabase recusou a chave anon (confira se é do mesmo projeto da URL)" };
    if (/slug_disponivel|schema cache|does not exist/i.test(error.message)) return { ok: false, detalhe: "conectou, mas a migração do banco não foi aplicada neste projeto" };
    return { ok: false, detalhe: `erro do Supabase: ${error.message}` };
  } catch (e) {
    return { ok: false, detalhe: `não foi possível conectar: ${(e as Error).message}` };
  }
}

export default async function StatusPage() {
  await connection();
  const banco = await testarBanco();
  const linhas: [string, boolean, string][] = [
    ["Modo", !MODO_DEMO, MODO_DEMO ? "demonstração (sem Supabase)" : "produção"],
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(SUPABASE_URL) && !PROBLEMAS_CONFIG.some((p) => p.includes("_URL")), SUPABASE_URL ? new URL(SUPABASE_URL.startsWith("http") ? SUPABASE_URL : "https://invalida").hostname : "não configurada"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(SUPABASE_ANON_KEY) && !PROBLEMAS_CONFIG.some((p) => p.includes("ANON_KEY")), SUPABASE_ANON_KEY ? `configurada (${SUPABASE_ANON_KEY.length} caracteres)` : "não configurada"],
    ["NEXT_PUBLIC_SITE_URL", Boolean(process.env.NEXT_PUBLIC_SITE_URL), process.env.NEXT_PUBLIC_SITE_URL?.trim() || "não configurada (opcional)"],
    ["Conexão com o banco", banco.ok, banco.detalhe],
    ["WhatsApp (Evolution API)", evolutionConfigurada, evolutionConfigurada ? "configurada" : "não configurada (opcional)"],
    ["CRON_SECRET (cobrança automática)", Boolean(process.env.CRON_SECRET?.trim()), process.env.CRON_SECRET?.trim() ? "configurada" : "não configurada (lembretes automáticos desligados)"],
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <span className="font-elegante text-3xl text-deep italic">Sacolinha</span>
      <h1 className="titulo text-4xl">Diagnóstico</h1>
      {PROBLEMAS_CONFIG.length > 0 && (
        <ul className="list-disc rounded-2xl bg-[#FFF1D6] py-3 pr-4 pl-9 text-sm text-[#5C3A00]">
          {PROBLEMAS_CONFIG.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <ul className="cartao flex flex-col">
        {linhas.map(([nome, ok, detalhe]) => (
          <li key={nome} className="flex items-start gap-3 border-t border-soft py-3 first:border-0">
            <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${ok ? "bg-green-700" : "bg-[#B45309]"}`}>
              {ok ? "✓" : "!"}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-sm font-semibold break-all">{nome}</span>
              <span className="text-sm break-all text-muted">{detalhe}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Esta página nunca mostra o valor das chaves.</p>
    </main>
  );
}
