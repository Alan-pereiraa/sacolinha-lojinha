import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Fornecedora, Loja, SacolaComEmpresa } from "@/lib/tipos";
import { CONFIG_OK, MODO_DEMO } from "@/lib/config";

/** Usuária logada + loja dela. Redireciona para /login se não houver sessão. */
export const getMinhaLoja = cache(async () => {
  if (!MODO_DEMO && !CONFIG_OK) redirect("/status");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: loja } = await supabase.from("lojas").select("*").eq("dono_id", user.id).maybeSingle();
  if (!loja) redirect("/cadastro?erro=sem-loja");

  return { supabase, user, loja: loja as Loja };
});

/** Sacolas abertas da loja (uma por empresa), com o nome da empresa; a que vence primeiro vem antes. */
export const getSacolasAbertas = cache(async (lojaId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sacolas")
    .select("*, fornecedoras(nome)")
    .eq("loja_id", lojaId)
    .eq("status", "aberta")
    .order("devolver_ate", { ascending: true });
  return ((data ?? []) as SacolaComEmpresa[]).map((s) => ({
    ...s,
    fornecedoras: Array.isArray(s.fornecedoras) ? s.fornecedoras[0] ?? null : s.fornecedoras ?? null,
  }));
});

/** Empresas (fornecedoras) com quem a revendedora trabalha. */
export const getEmpresas = cache(async (lojaId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("fornecedoras").select("*").eq("loja_id", lojaId).order("nome");
  return (data ?? []) as Fornecedora[];
});

