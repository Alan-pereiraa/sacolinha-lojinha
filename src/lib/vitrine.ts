import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { COLUNAS_LOJA_PUBLICA, type Loja, type Produto } from "@/lib/tipos";

export const getLojaPublica = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("lojas").select(COLUNAS_LOJA_PUBLICA).eq("slug", slug.toLowerCase()).maybeSingle();
  return (data as Loja | null) ?? null;
});

/** Peças visíveis com pelo menos um tamanho em estoque. */
export const getVitrine = cache(async (lojaId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtos")
    .select("id, nome, categoria, preco, fotos, cor, descricao, criado_em, variantes(id, tamanho, estoque)")
    .eq("loja_id", lojaId)
    .eq("visivel", true)
    .order("criado_em", { ascending: false });
  return ((data ?? []) as unknown as Produto[]).filter((p) => (p.variantes ?? []).some((v) => v.estoque > 0));
});

export const getProdutoPublico = cache(async (lojaId: string, id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produtos")
    .select("id, nome, categoria, preco, fotos, cor, descricao, criado_em, variantes(id, tamanho, estoque)")
    .eq("loja_id", lojaId)
    .eq("id", id)
    .eq("visivel", true)
    .maybeSingle();
  return (data as unknown as Produto | null) ?? null;
});

export { ordenarTamanhos } from "@/lib/tamanhos";
