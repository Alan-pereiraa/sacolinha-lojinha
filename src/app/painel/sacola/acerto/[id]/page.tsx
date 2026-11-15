import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMinhaLoja } from "@/lib/loja";
import { brl, dataCurta } from "@/lib/formatar";
import type { Produto, Sacola } from "@/lib/tipos";
import { BotaoImprimir } from "./imprimir";

export const metadata: Metadata = { title: "Acerto da sacola" };

export default async function AcertoPage({ params }: PageProps<"/painel/sacola/acerto/[id]">) {
  const { id } = await params;
  const { supabase, loja } = await getMinhaLoja();
  const { data: s } = await supabase.from("sacolas").select("*").eq("id", id).eq("loja_id", loja.id).maybeSingle();
  if (!s) notFound();
  const sacola = s as Sacola;
  const { data } = await supabase.from("produtos").select("*, variantes(*)").eq("sacola_id", id).order("nome");
  const produtos = (data ?? []) as Produto[];

  const linhas = produtos.flatMap((p) => (p.variantes ?? []).map((v) => ({ p, v })));
  const devolver = linhas.filter((l) => l.v.estoque > 0);
  const vendidas = linhas.filter((l) => l.v.vendidos > 0);
  const totalVendido = vendidas.reduce((a, l) => a + l.v.vendidos * Number(l.p.preco), 0);
  const lucro = (totalVendido * Number(sacola.percentual_lucro)) / 100;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo text-4xl">Acerto · <span className="italic text-deep">{sacola.nome}</span></h1>
          <p className="text-sm text-muted">
            {loja.nome} · recebida {dataCurta(sacola.recebida_em)}
            {sacola.status === "fechada" ? " · fechada" : " · ainda aberta"}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <BotaoImprimir />
          {sacola.status === "fechada" && <Link href="/painel/sacola" className="btn-primario">Abrir próxima sacola</Link>}
        </div>
      </header>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="cartao"><p className="text-sm text-muted">Total vendido</p><p className="text-2xl font-bold">{brl(totalVendido)}</p></div>
        <div className="cartao"><p className="text-sm text-muted">Seu lucro ({Number(sacola.percentual_lucro)}%)</p><p className="text-2xl font-bold">{brl(lucro)}</p></div>
        <div className="rounded-[28px] bg-deep p-6 text-white"><p className="text-sm opacity-85">Pagar à revendedora</p><p className="text-2xl font-bold">{brl(totalVendido - lucro)}</p></div>
      </section>

      <Tabela titulo={`Devolver (${devolver.reduce((a, l) => a + l.v.estoque, 0)} peças)`} linhas={devolver.map((l) => [l.p.nome, l.v.tamanho, l.v.codigo_barras ?? "—", String(l.v.estoque)])} cabecalho={["Peça", "Tam.", "Código", "Qtd."]} />
      <Tabela titulo={`Vendidas (${vendidas.reduce((a, l) => a + l.v.vendidos, 0)} peças)`} linhas={vendidas.map((l) => [l.p.nome, l.v.tamanho, String(l.v.vendidos), brl(l.v.vendidos * Number(l.p.preco))])} cabecalho={["Peça", "Tam.", "Qtd.", "Valor"]} />
    </>
  );
}

function Tabela({ titulo, cabecalho, linhas }: { titulo: string; cabecalho: string[]; linhas: string[][] }) {
  return (
    <section className="cartao flex flex-col gap-3">
      <h2 className="titulo text-2xl">{titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted uppercase">
              {cabecalho.map((c) => <th key={c} className="py-2 pr-3 font-bold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && <tr><td colSpan={cabecalho.length} className="py-3 text-muted">Nada aqui.</td></tr>}
            {linhas.map((l, i) => (
              <tr key={i} className="border-t border-soft">
                {l.map((c, j) => <td key={j} className="py-2.5 pr-3">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
