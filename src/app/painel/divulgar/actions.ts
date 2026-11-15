"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getMinhaLoja } from "@/lib/loja";
import * as evo from "@/lib/evolution";
import type { Produto } from "@/lib/tipos";
import { legendaDaPeca } from "@/lib/legenda";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export async function conectarWhatsApp(): Promise<{ qr?: string | null; estado?: evo.EstadoConexao; erro?: string }> {
  const { supabase, loja } = await getMinhaLoja();
  try {
    let instancia = loja.wa_instancia;
    if (!instancia || (await evo.estadoConexao(instancia)) === "inexistente") {
      instancia = `sacolinha-${loja.slug}`;
      const criada = await evo.criarInstancia(instancia).catch(async (e) => {
        // Já existe no servidor (ex.: banco recriado): reaproveita
        if (/already in use|403/i.test((e as Error).message)) return null;
        throw e;
      });
      await supabase.from("lojas").update({ wa_instancia: instancia }).eq("id", loja.id);
      if (criada?.qrcode?.base64) return { qr: criada.qrcode.base64, estado: "connecting" };
    }
    const estado = await evo.estadoConexao(instancia);
    if (estado === "open") return { estado };
    return { qr: await evo.pedirQrCode(instancia), estado };
  } catch (e) {
    console.error(e);
    return { erro: "Não consegui falar com o servidor do WhatsApp. Confira se a Evolution API está no ar." };
  }
}

export async function verEstado() {
  const { loja } = await getMinhaLoja();
  if (!loja.wa_instancia) return "close" as const;
  try {
    return await evo.estadoConexao(loja.wa_instancia);
  } catch {
    return "close" as const;
  }
}

export async function buscarGrupos() {
  const { loja } = await getMinhaLoja();
  if (!loja.wa_instancia) return { erro: "Conecte o WhatsApp primeiro." };
  try {
    return { grupos: await evo.listarGrupos(loja.wa_instancia) };
  } catch {
    return { erro: "Não consegui listar os grupos agora." };
  }
}

export async function escolherGrupo(id: string, nome: string) {
  const { supabase, loja } = await getMinhaLoja();
  if (!/@g\.us$/.test(id)) return;
  await supabase.from("lojas").update({ wa_grupo_id: id, wa_grupo_nome: nome }).eq("id", loja.id);
  revalidatePath("/painel/divulgar");
}

export async function desconectarWhatsApp() {
  const { supabase, loja } = await getMinhaLoja();
  if (loja.wa_instancia) await evo.desconectar(loja.wa_instancia).catch(() => null);
  await supabase.from("lojas").update({ wa_grupo_id: null, wa_grupo_nome: null }).eq("id", loja.id);
  revalidatePath("/painel/divulgar");
}

/** Envia as peças escolhidas para o grupo, uma por mensagem, com intervalo entre elas. */
export async function enviarNovidades(produtoIds: string[], mensagemAbertura: string) {
  const { supabase, loja } = await getMinhaLoja();
  if (!loja.wa_instancia || !loja.wa_grupo_id) return { erro: "Conecte o WhatsApp e escolha o grupo." };
  if (produtoIds.length === 0) return { erro: "Escolha pelo menos uma peça." };
  if (produtoIds.length > 15) return { erro: "Envie no máximo 15 peças por vez, para não parecer spam." };

  const { data } = await supabase
    .from("produtos")
    .select("id, nome, preco, fotos, variantes(tamanho, estoque)")
    .eq("loja_id", loja.id)
    .in("id", produtoIds);
  const produtos = (data ?? []) as unknown as Produto[];
  const base = await siteUrl();

  let enviados = 0;
  try {
    if (mensagemAbertura.trim()) {
      await evo.enviarTexto(loja.wa_instancia, loja.wa_grupo_id, mensagemAbertura.trim().slice(0, 1000));
      await espera(2500);
    }
    for (const p of produtos) {
      const link = `${base}/${loja.slug}/p/${p.id}`;
      const legenda = legendaDaPeca(p, loja.nome, link);
      if (p.fotos[0]) await evo.enviarImagem(loja.wa_instancia, loja.wa_grupo_id, p.fotos[0], legenda);
      else await evo.enviarTexto(loja.wa_instancia, loja.wa_grupo_id, legenda);
      await supabase.from("produtos").update({ novidade_enviada_em: new Date().toISOString() }).eq("id", p.id);
      enviados++;
      // Intervalo aleatório entre mensagens: reduz o risco de bloqueio do número
      await espera(3000 + Math.random() * 4000);
    }
  } catch (e) {
    console.error(e);
    revalidatePath("/painel/divulgar");
    return { erro: `Enviei ${enviados} de ${produtos.length}. O WhatsApp parou de responder; tente o resto daqui a pouco.` };
  }
  revalidatePath("/painel/divulgar");
  return { ok: `Pronto! ${enviados} ${enviados === 1 ? "novidade enviada" : "novidades enviadas"} para ${loja.wa_grupo_nome ?? "o grupo"}.` };
}
