import { miniatura } from "@/lib/fotos";
import type { Metadata } from "next";
import Link from "next/link";
import { getEmpresas, getMinhaLoja, getSacolasAbertas } from "@/lib/loja";
import { brl, dataCurta, diasAte } from "@/lib/formatar";
import { nomeCategoria, type Produto } from "@/lib/tipos";
import { FotoPeca } from "@/components/peca";
import { IconeMais } from "@/components/icones";
import { fecharSacola } from "../actions";
import { FormNovaSacola } from "./form-nova-sacola";
import { Empresas } from "./empresas";

export const metadata: Metadata = { title: "Sacola" };

const POR_PAGINA_PAINEL = 30;

const ABAS = [
  { id: "disponiveis", rotulo: "Disponíveis" },
  { id: "vendidas", rotulo: "Vendidas" },
  { id: "todas", rotulo: "Todas" },
] as const;

export default async function SacolaPage({ searchParams }: PageProps<"/painel/sacola">) {
  const sp = await searchParams;
  const aba = (ABAS.find((a) => a.id === sp.aba)?.id ?? "disponiveis") as (typeof ABAS)[number]["id"];
  const busca = typeof sp.q === "string" ? sp.q.trim() : "";
  const { supabase, loja } = await getMinhaLoja();
  const [sacolas, empresas] = await Promise.all([getSacolasAbertas(loja.id), getEmpresas(loja.id)]);
  const sacola = sacolas.find((s) => s.id === sp.sacola) ?? sacolas[0];
  const ocupadas = new Set(sacolas.map((s) => s.fornecedora_id));
  const livres = empresas.filter((e) => !ocupadas.has(e.id));
  const qs = (extra: Record<string, string>) =>
    "?" + new URLSearchParams({ ...(sacola ? { sacola: sacola.id } : {}), ...extra }).toString();

  if (!sacola || sp.nova) {
    const { data: ultimas } = await supabase
      .from("sacolas")
      .select("id, nome, fechada_em")
      .eq("loja_id", loja.id)
      .eq("status", "fechada")
      .order("fechada_em", { ascending: false })
      .limit(5);
    return (
      <>
        <h1 className="titulo text-4xl">Abrir uma <span className="italic text-deep">sacola nova</span></h1>
        {sacolas.length > 0 && (
          <p className="text-sm text-muted">
            Já abertas: {sacolas.map((s) => s.fornecedoras?.nome ?? s.nome).join(", ")}. Cada empresa tem uma sacola aberta por vez.{" "}
            <Link href="/painel/sacola" className="font-bold text-deep">Voltar</Link>
          </p>
        )}
        <FormNovaSacola empresas={livres} />
        <Empresas empresas={empresas} />
        {ultimas && ultimas.length > 0 && (
          <section className="cartao flex flex-col gap-2">
            <h2 className="font-bold">Sacolas anteriores</h2>
            {(ultimas as { id: string; nome: string }[]).map((s) => (
              <Link key={s.id} href={`/painel/sacola/acerto/${s.id}`} className="flex justify-between border-t border-soft py-2.5 first:border-0">
                <span>{s.nome}</span>
                <span className="text-sm font-semibold text-deep">Ver acerto</span>
              </Link>
            ))}
          </section>
        )}
      </>
    );
  }

  // 1) Resumo leve de todas as peças da sacola (sem fotos): números da sacola, filtros e busca
  type Leve = { id: string; nome: string; preco: number; criado_em: string; variantes: { estoque: number; vendidos: number }[] };
  const { data: leves } = await supabase
    .from("produtos")
    .select("id, nome, preco, criado_em, variantes(estoque, vendidos)")
    .eq("loja_id", loja.id)
    .eq("sacola_id", sacola.id)
    .order("criado_em", { ascending: false });
  const resumo = ((leves ?? []) as Leve[]).map((p) => ({
    ...p,
    est: p.variantes.reduce((a, v) => a + v.estoque, 0),
    vend: p.variantes.reduce((a, v) => a + v.vendidos, 0),
  }));
  const pecas = resumo.reduce((a, p) => a + p.est + p.vend, 0);
  const vendidas = resumo.reduce((a, p) => a + p.vend, 0);
  const devolver = resumo.reduce((a, p) => a + p.est, 0);
  const vendidoValor = resumo.reduce((a, p) => a + p.vend * Number(p.preco), 0);
  const aPagar = vendidoValor * (1 - Number(sacola.percentual_lucro) / 100);

  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtradosIds = resumo
    .filter((p) => aba === "todas" || (aba === "disponiveis" ? p.est > 0 : p.vend > 0))
    .filter((p) => !busca || sem(p.nome).includes(sem(busca)))
    .map((p) => p.id);

  // 2) Só a página atual vem completa (com fotos e tamanhos)
  const paginas = Math.max(1, Math.ceil(filtradosIds.length / POR_PAGINA_PAINEL));
  const pagina = Math.min(paginas, Math.max(1, Number.parseInt(typeof sp.pagina === "string" ? sp.pagina : "1", 10) || 1));
  const idsPagina = filtradosIds.slice((pagina - 1) * POR_PAGINA_PAINEL, pagina * POR_PAGINA_PAINEL);
  const { data: completos } = idsPagina.length
    ? await supabase.from("produtos").select("*, variantes(*)").eq("loja_id", loja.id).in("id", idsPagina)
    : { data: [] };
  const porId = new Map(((completos ?? []) as Produto[]).map((p) => [p.id, p]));
  const filtrados = idsPagina.map((id) => porId.get(id)).filter((p): p is Produto => Boolean(p));
  const produtos = resumo; // para saber se a sacola está vazia
  const dias = diasAte(sacola.devolver_ate);

  return (
    <>
      <nav aria-label="Sacolas abertas" className="flex flex-wrap gap-2">
        {sacolas.map((s) => (
          <Link
            key={s.id}
            href={`/painel/sacola?sacola=${s.id}`}
            aria-current={s.id === sacola.id ? "page" : undefined}
            className={`flex flex-col rounded-2xl px-4 py-2.5 text-sm ${s.id === sacola.id ? "bg-deep text-white" : "bg-white"}`}
          >
            <span className="font-bold">{s.fornecedoras?.nome ?? "Sacola"}</span>
            <span className={s.id === sacola.id ? "opacity-85" : "text-muted"}>{s.nome}</span>
          </Link>
        ))}
        <Link href="/painel/sacola?nova=1" className="flex items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-deep px-4 py-2.5 text-sm font-bold text-deep">
          <IconeMais tamanho={16} />Sacola de outra empresa
        </Link>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {sacola.fornecedoras?.nome && <p className="text-xs font-bold tracking-[0.14em] text-deep uppercase">{sacola.fornecedoras.nome}</p>}
          <h1 className="titulo text-4xl">{sacola.nome}</h1>
          <p className="text-sm text-muted">
            Recebida {dataCurta(sacola.recebida_em)} · devolver até {dataCurta(sacola.devolver_ate)} ·{" "}
            {dias >= 0 ? `faltam ${dias} dias` : `atrasada ${-dias} dias`}
          </p>
        </div>
        <Link href={`/painel/produtos/novo?sacola=${sacola.id}`} className="btn-primario"><IconeMais tamanho={18} />Cadastrar peça</Link>
      </header>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <Numero rotulo="Peças na sacola" valor={String(pecas)} />
        <Numero rotulo="Vendidas" valor={String(vendidas)} destaque />
        <Numero rotulo="Para devolver" valor={String(devolver)} />
        <div className="flex flex-col gap-1 rounded-3xl bg-soft p-5">
          <span className="text-sm text-muted">A pagar para {sacola.fornecedoras?.nome ?? "a empresa"}</span>
          <span className="text-2xl font-bold text-deep">{brl(aPagar)}</span>
        </div>
      </section>

      {sp.salvo && <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">Peça salva!</p>}

      <section className="cartao flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Filtrar peças" className="flex gap-1 rounded-full bg-blush p-1">
            {ABAS.map((a) => (
              <Link
                key={a.id}
                href={`/painel/sacola${qs({ aba: a.id, ...(busca ? { q: busca } : {}) })}`}
                aria-current={a.id === aba ? "page" : undefined}
                className={`rounded-full px-4 py-2.5 text-sm font-bold ${a.id === aba ? "bg-deep text-white" : "text-ink"}`}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
          <form className="flex">
            <input type="hidden" name="aba" value={aba} />
            <input type="hidden" name="sacola" value={sacola.id} />
            <label htmlFor="q" className="sr-only">Buscar peça</label>
            <input id="q" name="q" defaultValue={busca} placeholder="Buscar por nome" className="campo h-11 w-56 rounded-full" />
          </form>
        </div>

        {filtrados.length === 0 ? (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-petal p-7 text-center text-muted">
            {produtos.length === 0 ? (
              <>Nenhuma peça cadastrada ainda. <Link href={`/painel/produtos/novo?sacola=${sacola.id}`} className="font-bold text-deep">Cadastrar a primeira</Link></>
            ) : (
              "Nenhuma peça neste filtro."
            )}
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtrados.map((p) => {
              const vs = p.variantes ?? [];
              const est = vs.reduce((a, v) => a + v.estoque, 0);
              const vend = vs.reduce((a, v) => a + v.vendidos, 0);
              return (
                <li key={p.id} className="border-t border-soft first:border-0">
                  <Link href={`/painel/produtos/${p.id}`} className="flex items-center gap-3.5 py-3 hover:bg-blush/60">
                    <FotoPeca foto={miniatura(p.fotos[0])} categoria={p.categoria} alt="" className="h-16 w-13 shrink-0 rounded-t-full rounded-b-lg" tamanhoIlustracao={36} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{p.nome}</span>
                      <span className="truncate text-[13px] text-muted">
                        {nomeCategoria(p.categoria)} · {vs.map((v) => `${v.tamanho} (${v.estoque})`).join(" · ")}
                      </span>
                    </span>
                    <span className="hidden flex-col items-end text-sm sm:flex">
                      <span className="font-bold text-deep">{brl(p.preco)}</span>
                      <span className="text-muted">{est} em estoque · {vend} vendidas</span>
                    </span>
                    {!p.visivel && <span className="rounded-full bg-blush px-2.5 py-1 text-[11px] font-bold text-muted">Oculta</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {paginas > 1 && (
          <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 border-t border-soft pt-4 text-sm">
            <span className="text-muted">
              {filtradosIds.length} peças · página {pagina} de {paginas}
            </span>
            <span className="flex gap-2">
              {pagina > 1 && (
                <Link href={`/painel/sacola${qs({ aba, ...(busca ? { q: busca } : {}), pagina: String(pagina - 1) })}`} className="btn-secundario h-10">
                  ‹ Anterior
                </Link>
              )}
              {pagina < paginas && (
                <Link href={`/painel/sacola${qs({ aba, ...(busca ? { q: busca } : {}), pagina: String(pagina + 1) })}`} className="btn-secundario h-10">
                  Próxima ›
                </Link>
              )}
            </span>
          </nav>
        )}
      </section>

      <Empresas empresas={empresas} />

      <details className="cartao">
        <summary className="cursor-pointer font-bold">Fechar sacola e gerar acerto</summary>
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-muted">
            As {devolver} peças restantes saem da vitrine e vão para a lista de devolução. Você paga {brl(aPagar)} para {sacola.fornecedoras?.nome ?? "a empresa"}.
            As outras sacolas abertas continuam como estão.
          </p>
          <form action={fecharSacola.bind(null, sacola.id)}>
            <button className="btn-primario">Sim, fechar {sacola.nome}</button>
          </form>
        </div>
      </details>
    </>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl bg-white p-5">
      <span className="text-sm text-muted">{rotulo}</span>
      <span className={`text-2xl font-bold ${destaque ? "text-deep" : ""}`}>{valor}</span>
    </div>
  );
}
