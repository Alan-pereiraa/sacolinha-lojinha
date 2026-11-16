import type { Metadata } from "next";
import Link from "next/link";
import { getMinhaLoja, getSacolaAberta } from "@/lib/loja";
import { brl, dataCurta, diasAte, FORMAS_PAGAMENTO, iniciais } from "@/lib/formatar";
import type { Parcela, Venda } from "@/lib/tipos";
import { hojeBrasil, statusDaParcela } from "@/lib/cobranca";
import { IconeCodigo, IconeMais } from "@/components/icones";
import { receberParcela } from "./actions";

export const metadata: Metadata = { title: "Início" };

export default async function PainelPage() {
  const { supabase, loja, user } = await getMinhaLoja();
  const sacola = await getSacolaAberta(loja.id);

  const [{ data: variantes }, { data: vendas }, { data: pendentes }] = await Promise.all([
    sacola
      ? supabase
          .from("variantes")
          .select("estoque, vendidos, produtos!inner(nome, sacola_id)")
          .eq("loja_id", loja.id)
          .eq("produtos.sacola_id", sacola.id)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("vendas")
      .select("id, total, lucro, forma_pagamento, parcelas, cliente_nome, pago, criado_em, venda_itens(produto_nome, tamanho, quantidade)")
      .eq("loja_id", loja.id)
      .eq("sacola_id", sacola?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("criado_em", { ascending: false }),
    supabase
      .from("parcelas")
      .select("id, venda_id, numero, total_parcelas, valor, vence_em, pago_em, vendas(cliente_nome)")
      .eq("loja_id", loja.id)
      .is("pago_em", null)
      .order("vence_em", { ascending: true }),
  ]);

  type LinhaVariante = { estoque: number; vendidos: number; produtos: { nome: string } | { nome: string }[] };
  const vs = (variantes ?? []) as LinhaVariante[];
  const totalPecas = vs.reduce((a, v) => a + v.estoque + v.vendidos, 0);
  const vendidas = vs.reduce((a, v) => a + v.vendidos, 0);
  const pct = totalPecas ? Math.round((vendidas / totalPecas) * 100) : 0;

  const listaVendas = (vendas ?? []) as Venda[];
  const totalVendido = listaVendas.reduce((a, v) => a + Number(v.total), 0);
  const lucro = listaVendas.reduce((a, v) => a + Number(v.lucro), 0);

  const ranking = new Map<string, number>();
  for (const v of vs) {
    const nome = Array.isArray(v.produtos) ? v.produtos[0]?.nome : v.produtos?.nome;
    if (nome && v.vendidos) ranking.set(nome, (ranking.get(nome) ?? 0) + v.vendidos);
  }
  const maisVendidas = [...ranking.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const listaPendentes = (pendentes ?? []) as unknown as Parcela[];
  const totalReceber = listaPendentes.reduce((a, p) => a + Number(p.valor), 0);
  const hoje = hojeBrasil();
  const atrasadas = listaPendentes.filter((p) => statusDaParcela(p, hoje) === "atrasada").length;
  const nomeDe = (p: Parcela) => (Array.isArray(p.vendas) ? p.vendas[0] : p.vendas)?.cliente_nome ?? "Sem nome";
  const primeiroNome = String(user.user_metadata?.nome ?? "").split(" ")[0];
  const dias = sacola ? diasAte(sacola.devolver_ate) : 0;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="titulo text-4xl">
            Oi{primeiroNome ? "," : ""} <span className="italic text-deep">{primeiroNome || "você"}</span>
          </h1>
        </div>
        <div className="flex gap-2.5">
          <Link href="/painel/produtos/novo" className="btn-secundario"><IconeMais tamanho={18} />Cadastrar peça</Link>
          <Link href="/painel/vender" className="btn-primario"><IconeCodigo tamanho={18} />Bipar e vender</Link>
        </div>
      </header>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <div className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] bg-deep p-6 text-white">
          <div aria-hidden="true" className="absolute -top-12 -right-12 size-44 rounded-full border-[1.5px] border-white/25" />
          {sacola ? (
            <>
              <div className="relative flex flex-col gap-1">
                <span className="text-xs font-bold tracking-[0.14em] uppercase opacity-85">Sacola atual</span>
                <span className="font-elegante text-2xl">{sacola.nome}</span>
                <span className="text-sm opacity-85">
                  Devolver até {dataCurta(sacola.devolver_ate)} ·{" "}
                  {dias >= 0 ? `faltam ${dias} dias` : `atrasada ${-dias} dias`}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>{vendidas} de {totalPecas} peças vendidas</span>
                  <span className="font-bold">{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/20">
                  <div className="h-2.5 rounded-full bg-white" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="font-elegante text-2xl">Nenhuma sacola aberta</span>
              <Link href="/painel/sacola" className="btn self-start bg-white text-deep">Abrir sacola</Link>
            </div>
          )}
        </div>
        <div className="cartao flex flex-col gap-1.5">
          <span className="text-sm text-muted">Vendido na sacola</span>
          <span className="text-3xl font-bold">{brl(totalVendido)}</span>
          <span className="text-[13px] text-muted">{listaVendas.length} vendas</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-[28px] bg-soft p-6">
          <span className="text-sm text-muted">Seu lucro ({Number(sacola?.percentual_lucro ?? 0)}%)</span>
          <span className="text-3xl font-bold text-deep">{brl(lucro)}</span>
          <span className="text-[13px] text-muted">{brl(totalVendido - lucro)} para a revendedora</span>
        </div>
      </section>

      <section className="flex flex-wrap gap-4">
        <div className="cartao flex min-w-0 flex-[2_1_480px] flex-col gap-4">
          <h2 className="titulo text-2xl">Últimas <span className="italic text-deep">vendas</span></h2>
          {listaVendas.length === 0 ? (
            <p className="rounded-2xl border-[1.5px] border-dashed border-petal p-6 text-center text-muted">
              Nenhuma venda nesta sacola ainda. <Link href="/painel/vender" className="font-bold text-deep">Fazer a primeira</Link>
            </p>
          ) : (
            <ul className="flex flex-col">
              {listaVendas.slice(0, 8).map((v) => (
                <li key={v.id} className="flex items-center gap-3 border-t border-soft py-3 first:border-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-petal text-xs font-bold text-deep">
                    {v.cliente_nome ? iniciais(v.cliente_nome) : (v.venda_itens?.length ?? 0)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">
                      {v.venda_itens?.map((i) => `${i.produto_nome} (${i.tamanho})`).join(", ")}
                    </span>
                    <span className="text-xs text-muted">
                      {dataCurta(v.criado_em)}{v.cliente_nome ? ` · ${v.cliente_nome}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-bold">{brl(v.total)}</span>
                    <span className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-bold text-deep">
                      {FORMAS_PAGAMENTO[v.forma_pagamento]}{v.parcelas > 1 ? ` ${v.parcelas}x` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <div className="cartao flex flex-col gap-3.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-bold">Caderninho</h2>
              <span className="text-xl font-bold text-deep">{brl(totalReceber)}</span>
            </div>
            {atrasadas > 0 && (
              <p className="rounded-xl bg-[#FFF1D6] px-3 py-2 text-xs font-semibold text-[#7A4A00]">
                {atrasadas} {atrasadas === 1 ? "parcela atrasada" : "parcelas atrasadas"}
              </p>
            )}
            {listaPendentes.length === 0 && <p className="text-sm text-muted">Ninguém devendo. Que beleza!</p>}
            {listaPendentes.slice(0, 4).map((p) => {
              const st = statusDaParcela(p, hoje);
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-bold text-deep">
                    {iniciais(nomeDe(p))}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{nomeDe(p)}</span>
                    <span className={`text-xs ${st === "atrasada" ? "font-bold text-[#9A3412]" : "text-muted"}`}>
                      {p.total_parcelas > 1 ? `${p.numero}/${p.total_parcelas} · ` : ""}
                      {st === "atrasada" ? "venceu" : "vence"} {dataCurta(p.vence_em)}
                    </span>
                  </span>
                  <form action={receberParcela.bind(null, p.id)} className="flex items-center gap-2">
                    <span className="text-sm font-bold">{brl(p.valor)}</span>
                    <button className="h-9 rounded-full bg-soft px-3 text-xs font-bold text-deep">Recebi</button>
                  </form>
                </div>
              );
            })}
            <Link href="/painel/caderninho" className="btn-secundario h-11 text-sm">Abrir o caderninho</Link>
          </div>
          <div className="flex flex-col gap-3 rounded-[28px] bg-soft p-6">
            <h2 className="text-[17px] font-bold">Mais vendidas</h2>
            {maisVendidas.length === 0 && <p className="text-sm text-muted">Aparece aqui depois das primeiras vendas.</p>}
            {maisVendidas.map(([nome, qtd]) => (
              <div key={nome} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{nome}</span>
                <strong>{qtd}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
