import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CONFIG_OK, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { hojeBrasil, montarMensagem } from "@/lib/cobranca";
import * as evo from "@/lib/evolution";

/*
 * Cobrança automática do Caderninho.
 * A Vercel chama esta rota uma vez por dia (vercel.json → crons) com
 * "Authorization: Bearer <CRON_SECRET>". O mesmo segredo libera, no banco,
 * as funções cobrancas_do_dia e registrar_cobranca (o banco guarda só o hash).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_POR_EXECUCAO = 40;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Cobranca = {
  parcela_id: string;
  tipo: "antes" | "hoje" | "atrasada";
  loja_nome: string;
  wa_instancia: string;
  mensagem_modelo: string | null;
  chave_pix: string | null;
  cliente_nome: string | null;
  cliente_whatsapp: string;
  numero: number;
  total_parcelas: number;
  valor: number;
  vence_em: string;
};

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!CONFIG_OK) return NextResponse.json({ ok: true, aviso: "Supabase não configurado (modo demonstração)" });
  if (!evo.evolutionConfigurada) return NextResponse.json({ ok: true, aviso: "Evolution API não configurada: nada enviado" });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("cobrancas_do_dia", { p_segredo: segredo });
  if (error) {
    console.error("[cobrancas] erro ao buscar", error.message);
    return NextResponse.json({ erro: "falha ao buscar cobranças" }, { status: 500 });
  }

  const lista = ((data ?? []) as Cobranca[]).slice(0, MAX_POR_EXECUCAO);
  const hoje = hojeBrasil();
  const instanciasFora = new Set<string>();
  let enviadas = 0;
  let falhas = 0;

  for (const c of lista) {
    if (instanciasFora.has(c.wa_instancia)) continue;
    // WhatsApp da loja desconectado: pula todas as cobranças dela nesta execução
    const estado = await evo.estadoConexao(c.wa_instancia).catch(() => "close" as const);
    if (estado !== "open") {
      instanciasFora.add(c.wa_instancia);
      continue;
    }
    const texto = montarMensagem(
      c.mensagem_modelo,
      {
        nome: c.cliente_nome,
        loja: c.loja_nome,
        numero: c.numero,
        total: c.total_parcelas,
        valor: Number(c.valor),
        venceEm: c.vence_em,
        chavePix: c.chave_pix,
      },
      hoje,
    );
    try {
      await evo.enviarTexto(c.wa_instancia, c.cliente_whatsapp, texto);
      await supabase.rpc("registrar_cobranca", { p_segredo: segredo, p_parcela: c.parcela_id, p_tipo: c.tipo });
      enviadas++;
    } catch (e) {
      falhas++;
      console.error("[cobrancas] falha ao enviar", c.parcela_id, (e as Error).message);
    }
    // intervalo entre mensagens para o envio parecer humano
    await espera(3000 + Math.random() * 4000);
  }

  return NextResponse.json({
    ok: true,
    hoje,
    encontradas: data?.length ?? 0,
    enviadas,
    falhas,
    lojas_desconectadas: instanciasFora.size,
  });
}
