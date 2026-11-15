import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Loja, Sacola } from "@/lib/tipos";

/** Usuária logada + loja dela. Redireciona para /login se não houver sessão. */
export const getMinhaLoja = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: loja } = await supabase.from("lojas").select("*").eq("dono_id", user.id).maybeSingle();
  if (!loja) redirect("/cadastro?erro=sem-loja");

  return { supabase, user, loja: loja as Loja };
});

export const getSacolaAberta = cache(async (lojaId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sacolas")
    .select("*")
    .eq("loja_id", lojaId)
    .eq("status", "aberta")
    .maybeSingle();
  return (data as Sacola | null) ?? null;
});
