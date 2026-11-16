/*
 * Lê e limpa as variáveis do Supabase. Valores colados no celular costumam vir com
 * espaço, aspas ou quebra de linha; aqui isso é removido antes de usar.
 * (NEXT_PUBLIC_* precisam ser lidas pelo nome completo para o Next.js embutir no navegador.)
 */

function limpar(v: string | undefined) {
  return (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

const url = limpar(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
const chave = limpar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const forcarDemo = limpar(process.env.NEXT_PUBLIC_DEMO) === "1";

function urlValida(u: string) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.hostname === "127.0.0.1" || x.hostname === "localhost";
  } catch {
    return false;
  }
}

const chaveValida = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(chave) || /^sb_publishable_[\w-]+$/.test(chave);

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = chave;

/** Sem URL do Supabase (ou com NEXT_PUBLIC_DEMO=1) o app roda com dados de exemplo. */
export const MODO_DEMO = !url || forcarDemo;

/** Problemas encontrados na configuração (vazio = tudo certo). Nunca inclui os valores. */
export const PROBLEMAS_CONFIG: string[] = MODO_DEMO
  ? []
  : [
      ...(urlValida(url) ? [] : ["NEXT_PUBLIC_SUPABASE_URL não é um endereço válido (deve começar com https://)."]),
      ...(!chave
        ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY está vazia ou não foi configurada."]
        : chaveValida
          ? []
          : ["NEXT_PUBLIC_SUPABASE_ANON_KEY não parece a chave anon/publishable do Supabase (confira se colou inteira)."]),
    ];

export const CONFIG_OK = !MODO_DEMO && PROBLEMAS_CONFIG.length === 0;
