import type { Metadata } from "next";
import Link from "next/link";
import { getMinhaLoja } from "@/lib/loja";
import { brl, iniciais } from "@/lib/formatar";
import { hojeBrasil, linkCobranca, montarMensagem, statusDaParcela } from "@/lib/cobranca";
import { evolutionConfigurada } from "@/lib/evolution";
import type { Parcela } from "@/lib/tipos";
import { AcoesParcela } from "./acoes-parcela";
import { FormCobranca } from "./form-cobranca";
import { ligarCobrancaDaVenda } from "../actions";

export const metadata: Metadata = { title: "Caderninho" };

type Venda = NonNullable<Parcela["vendas"]>;

export default async function CaderninhoPage({ searchParams }: PageProps<"/painel/caderninho">) {
  const { aba } = await searchParams;
  const verRecebidas = aba === "recebidas";
  const { supabase, loja } = await getMinhaLoja();
  const hoje = hojeBrasil();

  // meia-noite de Brasília, 30 dias atrás
  const trintaDiasAtras = new Date(new Date(`${hoje}T03:00:00Z`).getTime() - 30 * 86_400_000).toISOString();
  const base = supabase
    .from("parcelas")
    .select("id, venda_id, numero, total_parcelas, valor, vence_em, pago_em, lembretes, ultimo_lembrete_em, vendas(cliente_nome, cliente_whatsapp, cobranca_automatica, criado_em, venda_itens(produto_nome, tamanho, quantidade))")
    .eq("loja_id", loja.id);
  const { data } = verRecebidas
    ? await base.gte("pago_em", trintaDiasAtras).order("pago_em", { ascending: false })
    : await base.is("pago_em", null).order("vence_em", { ascending: true });
  const parcelas = (data ?? []) as unknown as Parcela[];
  const vendaDe = (p: Parcela) => (Array.isArray(p.vendas) ? p.vendas[0] : p.vendas) as Venda | null;

  // Agrupa por venda (cada venda do caderninho = uma pessoa + as peças que ela levou)
  const grupos = new Map<string, { venda: Venda | null; parcelas: Parcela[] }>();
  for (const p of parcelas) {
    const g = grupos.get(p.venda_id) ?? { venda: vendaDe(p), parcelas: [] };
    g.parcelas.push(p);
    grupos.set(p.venda_id, g);
  }

  const abertas = verRecebidas ? [] : parcelas;
  const totalAberto = abertas.reduce((a, p) => a + Number(p.valor), 0);
  const atrasado = abertas.filter((p) => statusDaParcela(p, hoje) === "atrasada").reduce((a, p) => a + Number(p.valor), 0);
  const seteDias = abertas.filter((p) => ["hoje", "proxima"].includes(statusDaParcela(p, hoje))).reduce((a, p) => a + Number(p.valor), 0);
  const whatsConectado = evolutionConfigurada && Boolean(loja.wa_instancia);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo text-4xl">Caderninho</h1>
          <p className="text-muted">Quem levou para pagar depois, quando vence e os lembretes no WhatsApp.</p>
        </div>
        <Link href="/painel/vender" className="btn-primario">Nova venda no caderninho</Link>
      </header>

      {!verRecebidas && (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div className="cartao"><p className="text-sm text-muted">A receber</p><p className="text-3xl font-bold text-deep">{brl(totalAberto)}</p></div>
          <div className="cartao"><p className="text-sm text-muted">Vence nos próximos 7 dias</p><p className="text-3xl font-bold">{brl(seteDias)}</p></div>
          <div className={`rounded-[28px] p-6 ${atrasado > 0 ? "bg-[#FFF1D6]" : "bg-white"}`}>
            <p className="text-sm text-muted">Atrasado</p>
            <p className={`text-3xl font-bold ${atrasado > 0 ? "text-[#9A3412]" : ""}`}>{brl(atrasado)}</p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section className="flex min-w-0 flex-[2_1_480px] flex-col gap-4">
          <nav aria-label="Filtrar" className="flex gap-1 self-start rounded-full bg-white p-1">
            {[
              { href: "/painel/caderninho", rotulo: "Em aberto", on: !verRecebidas },
              { href: "/painel/caderninho?aba=recebidas", rotulo: "Recebidas (30 dias)", on: verRecebidas },
            ].map((a) => (
              <Link key={a.href} href={a.href} aria-current={a.on ? "page" : undefined} className={`rounded-full px-4 py-2.5 text-sm font-bold ${a.on ? "bg-deep text-white" : "text-ink"}`}>
                {a.rotulo}
              </Link>
            ))}
          </nav>

          {grupos.size === 0 && (
            <p className="cartao text-center text-muted">
              {verRecebidas ? "Nada recebido nos últimos 30 dias." : "Ninguém devendo. Que beleza! 💕"}
            </p>
          )}

          {[...grupos.entries()].map(([vendaId, { venda, parcelas: ps }]) => {
            const nome = venda?.cliente_nome ?? "Sem nome";
            const devendo = ps.filter((p) => !p.pago_em).reduce((a, p) => a + Number(p.valor), 0);
            const pecas = venda?.venda_itens?.map((i) => `${i.produto_nome} (${i.tamanho})`).join(", ");
            return (
              <article key={vendaId} className="cartao flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-petal text-sm font-bold text-deep">{iniciais(nome)}</span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">{nome}</span>
                    {pecas && <span className="truncate text-[13px] text-muted">{pecas}</span>}
                    <span className="text-[13px] text-muted">
                      {venda?.cliente_whatsapp ? `WhatsApp ${venda.cliente_whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3")}` : "Sem WhatsApp"}
                    </span>
                  </div>
                  {!verRecebidas && <span className="text-lg font-bold text-deep">{brl(devendo)}</span>}
                </div>

                {!verRecebidas && venda?.cliente_whatsapp && (
                  <form action={ligarCobrancaDaVenda.bind(null, vendaId, !venda.cobranca_automatica)} className="flex items-center justify-between gap-3 rounded-2xl bg-blush px-3.5 py-2.5 text-sm">
                    <span>Lembretes automáticos: <strong>{venda.cobranca_automatica ? "ligados" : "desligados"}</strong></span>
                    <button className="font-bold text-deep">{venda.cobranca_automatica ? "Desligar" : "Ligar"}</button>
                  </form>
                )}

                <ul className="flex flex-col">
                  {ps.map((p) => {
                    const st = statusDaParcela(p, hoje);
                    const mensagem = montarMensagem(loja.cobranca_mensagem, {
                      nome: venda?.cliente_nome ?? null,
                      loja: loja.nome,
                      numero: p.numero,
                      total: p.total_parcelas,
                      valor: Number(p.valor),
                      venceEm: p.vence_em,
                      chavePix: loja.chave_pix,
                    }, hoje);
                    return (
                      <li key={p.id} className="border-t border-soft py-3 first:border-0">
                        <AcoesParcela
                          parcela={{ id: p.id, numero: p.numero, total: p.total_parcelas, valor: Number(p.valor), venceEm: p.vence_em, pagoEm: p.pago_em, lembretes: p.lembretes, ultimoLembrete: p.ultimo_lembrete_em }}
                          status={st}
                          linkWhats={linkCobranca(venda?.cliente_whatsapp, mensagem)}
                          podeEnviarDireto={whatsConectado && Boolean(venda?.cliente_whatsapp)}
                          hoje={hoje}
                        />
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </section>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 lg:sticky lg:top-6">
          <FormCobranca
            loja={{
              nome: loja.nome,
              cobranca_ativa: loja.cobranca_ativa ?? true,
              cobranca_dias_antes: loja.cobranca_dias_antes ?? 1,
              cobranca_repetir_dias: loja.cobranca_repetir_dias ?? 3,
              cobranca_max_atraso: loja.cobranca_max_atraso ?? 3,
              cobranca_mensagem: loja.cobranca_mensagem ?? "",
              chave_pix: loja.chave_pix ?? "",
            }}
            whatsConectado={whatsConectado}
            hoje={hoje}
          />
        </aside>
      </div>
    </>
  );
}
