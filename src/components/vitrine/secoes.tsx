/*
 * Seções da vitrine. Componentes puros (sem estado e sem dados do servidor):
 * a página pública e a prévia do editor usam exatamente os mesmos.
 */
import Link from "next/link";
import type { Conteudo } from "@/lib/conteudo";
import type { Loja, Produto, SecaoId } from "@/lib/tipos";
import { CATEGORIAS } from "@/lib/tipos";
import { brl } from "@/lib/formatar";
import { ordenarTamanhos } from "@/lib/tamanhos";
import { FotoPeca } from "@/components/peca";
import { IconeBusca, IconeCaixa, IconeChat, IconeInstagram, IconePin } from "@/components/icones";
import { TituloLoja } from "@/components/titulo-loja";

type Base = { loja: Loja; conteudo: Conteudo; fonte: string; formatoFoto: string; whats: string | null; compacto?: boolean };

export function AvisoTopo({ texto }: { texto: string }) {
  if (!texto) return null;
  return <div className="bg-deep px-4 py-2.5 text-center text-[13px] font-medium text-white">{texto}</div>;
}

/** Topo estilo perfil: capa, foto da loja sobreposta, nome, cidade, bio e botões. */
export function PerfilLoja({
  loja,
  conteudo,
  fonte,
  whats,
  totalPecas,
}: {
  loja: Loja;
  conteudo: Conteudo;
  fonte: string;
  whats: string | null;
  totalPecas: number;
}) {
  const bio = conteudo.sobre_texto || conteudo.destaque_texto;
  return (
    <section aria-label={loja.nome} className="mx-auto max-w-[1240px] sm:px-6">
      <div className="relative h-44 overflow-hidden bg-deep sm:h-72 sm:rounded-b-[28px] lg:h-80">
        {loja.capa_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.capa_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0">
            <span className="absolute -top-16 -left-10 size-64 rounded-full bg-white/10" />
            <span className="absolute -right-12 -bottom-24 size-80 rounded-full bg-white/10" />
            <span className="absolute top-8 right-1/3 size-24 rounded-full bg-white/10" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 border-b border-petal bg-white px-5 pb-5 sm:flex-row sm:items-end sm:gap-6 sm:rounded-b-[28px] sm:border-0 sm:bg-transparent sm:px-8 sm:pb-6">
        <div className="relative z-10 -mt-16 shrink-0 rounded-full bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:-mt-20">
          {loja.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loja.logo_url} alt="" className="size-28 rounded-full object-cover sm:size-40" />
          ) : (
            <span className={`flex size-28 items-center justify-center rounded-full bg-soft text-5xl text-deep sm:size-40 sm:text-6xl ${fonte}`}>
              {loja.nome.trim()[0]?.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center sm:items-start sm:pb-2 sm:text-left">
          <h1 className={`text-3xl leading-tight not-italic sm:text-[40px] ${fonte}`}>{loja.nome}</h1>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted sm:justify-start">
            {loja.cidade && (
              <span className="inline-flex items-center gap-1">
                <IconePin tamanho={16} />
                {loja.cidade}
              </span>
            )}
            <span>
              <strong className="text-ink">{totalPecas}</strong> {totalPecas === 1 ? "produto" : "produtos"}
            </span>
          </p>
          {bio && <p className="line-clamp-2 max-w-xl text-[15px] text-muted">{bio}</p>}
        </div>

        <div className="flex w-full gap-2.5 sm:w-auto sm:pb-2">
          {whats && (
            <a href={whats} target="_blank" rel="noopener" className="btn-primario flex-1 sm:flex-none">
              <IconeChat tamanho={18} /> WhatsApp
            </a>
          )}
          {loja.instagram && (
            <a
              href={`https://instagram.com/${loja.instagram}`}
              target="_blank"
              rel="noopener"
              aria-label={`Instagram @${loja.instagram}`}
              className="btn-secundario flex-1 sm:flex-none"
            >
              <IconeInstagram tamanho={18} /> <span className="sm:hidden lg:inline">Instagram</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function SecaoDestaque({ loja, conteudo, fonte }: Base & { produtos: Produto[] }) {
  return (
    <section className="mx-auto max-w-[1240px] px-3 sm:px-6">
      <div className="relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl bg-soft px-6 py-6 sm:px-10 sm:py-8">
        <div className="relative flex min-w-0 flex-[1_1_320px] flex-col gap-2">
          {conteudo.destaque_etiqueta && <span className="text-xs font-bold tracking-[0.16em] text-deep uppercase">{conteudo.destaque_etiqueta}</span>}
          <h2 className={`text-2xl leading-tight not-italic sm:text-3xl ${fonte}`}>
            <TituloLoja texto={conteudo.destaque_titulo} />
          </h2>
        </div>
        <a href={`/${loja.slug}#novidades`} className="btn-primario relative">
          {conteudo.destaque_botao}
        </a>
      </div>
    </section>
  );
}

function SecaoVantagens({ conteudo }: Base) {
  if (conteudo.vantagens.length === 0) return null;
  return (
    <section aria-label="Vantagens" className="mx-auto max-w-[1240px] px-3 sm:px-6">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:gap-3">
        {conteudo.vantagens.map((v) => (
          <li key={v.titulo} className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft text-deep">
              <IconeCaixa tamanho={18} />
            </span>
            <span className="flex min-w-0 flex-col">
              <strong className="text-[13px] leading-tight sm:text-sm">{v.titulo}</strong>
              {v.texto && <span className="hidden text-xs text-muted sm:block">{v.texto}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardProduto({ p, novo }: { p: Produto; novo: boolean }) {
  const disponiveis = ordenarTamanhos((p.variantes ?? []).filter((v) => v.estoque > 0));
  const estoque = disponiveis.reduce((a, v) => a + v.estoque, 0);
  return (
    <>
      <div className="relative">
        <FotoPeca foto={p.fotos[0]} categoria={p.categoria} alt={p.nome} className="aspect-square w-full" fundo="bg-soft" tamanhoIlustracao={72} />
        {novo && <span className="absolute top-2 left-2 rounded-md bg-deep px-2 py-0.5 text-[11px] font-bold text-white">Novo</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <span className="line-clamp-2 min-h-[2.5em] text-[13px] leading-[1.25] sm:text-sm">{p.nome}</span>
        <span className="text-lg leading-tight font-bold text-ink sm:text-xl">{brl(p.preco)}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-2 text-[11px] text-muted sm:text-xs">
          <span className="truncate">Tam. {disponiveis.map((v) => v.tamanho).join(" · ")}</span>
          {estoque === 1 && <span className="font-semibold text-deep">Última unidade</span>}
        </span>
      </div>
    </>
  );
}

function SecaoNovidades({
  loja,
  conteudo,
  fonte,
  produtos,
  todos,
  categoria,
  busca,
  linkProduto,
}: Base & { produtos: Produto[]; todos: Produto[]; categoria: string | null; busca: string; linkProduto: boolean }) {
  const categoriasComPecas = CATEGORIAS.filter((c) => todos.some((p) => p.categoria === c.id));
  // "Novo": chegou até 7 dias antes da peça mais recente (só marca se nem todas forem novas)
  const semanaPassada = Date.parse(todos[0]?.criado_em ?? "") - 7 * 86_400_000;
  const ehNovo = (p: Produto) => Date.parse(p.criado_em ?? "") >= semanaPassada;
  const marcarNovos = todos.some((p) => !ehNovo(p));
  const href = (cat: string | null) => {
    const q = new URLSearchParams({ ...(cat ? { cat } : {}), ...(busca ? { q: busca } : {}) }).toString();
    return `/${loja.slug}${q ? `?${q}` : ""}#novidades`;
  };
  return (
    <section id="novidades" className="mx-auto flex max-w-[1240px] scroll-mt-4 flex-col gap-3 px-3 sm:gap-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className={`text-2xl not-italic sm:text-3xl ${fonte}`}>
          <TituloLoja texto={conteudo.novidades_titulo} />
        </h2>
        {linkProduto ? (
          <form action={`/${loja.slug}#novidades`} role="search" className="relative w-full sm:w-80">
            {categoria && <input type="hidden" name="cat" value={categoria} />}
            <label htmlFor="busca-vitrine" className="sr-only">
              Buscar nesta loja
            </label>
            <input
              id="busca-vitrine"
              name="q"
              defaultValue={busca}
              placeholder="Buscar nesta loja"
              className="h-11 w-full rounded-full border border-petal bg-white pr-12 pl-4 text-[15px] outline-none focus:border-deep"
            />
            <button aria-label="Buscar" className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-deep text-white">
              <IconeBusca tamanho={18} />
            </button>
          </form>
        ) : (
          <div className="flex h-11 w-full items-center rounded-full border border-petal bg-white pl-4 text-[15px] text-muted sm:w-80">Buscar nesta loja</div>
        )}
      </div>

      {categoriasComPecas.length > 1 && (
        <nav aria-label="Categorias" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: null as string | null, nome: "Todos" }, ...categoriasComPecas].map((c) => {
            const on = c.id === categoria;
            return (
              <Link
                key={c.nome}
                href={href(c.id)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${on ? "border-deep bg-deep text-white" : "border-petal bg-white"}`}
              >
                {c.nome}
              </Link>
            );
          })}
        </nav>
      )}

      <p className="px-1 text-sm text-muted">
        {busca ? (
          <>
            Resultados para <strong className="text-ink">“{busca}”</strong>:{" "}
          </>
        ) : null}
        {produtos.length} {produtos.length === 1 ? "produto" : "produtos"}
        {busca && (
          <>
            {" "}
            ·{" "}
            <Link href={href(categoria).replace(/q=[^&#]*&?/, "")} scroll={false} className="font-semibold text-deep">
              limpar busca
            </Link>
          </>
        )}
      </p>

      {produtos.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-petal bg-white p-10 text-center text-muted">
          {busca
            ? "Nada encontrado com esse nome. Tente outra palavra ou me chama no WhatsApp."
            : "Os produtos novos chegam em breve. Me chama no WhatsApp para saber antes!"}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
          {produtos.map((p) => {
            const novo = marcarNovos && ehNovo(p);
            const classe =
              "flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.10)]";
            return (
              <li key={p.id}>
                {linkProduto ? (
                  <Link href={`/${loja.slug}/p/${p.id}`} className={classe}>
                    <CardProduto p={p} novo={novo} />
                  </Link>
                ) : (
                  <div className={classe}>
                    <CardProduto p={p} novo={novo} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SecaoSobre({ loja, conteudo, fonte }: Base) {
  if (!conteudo.sobre_texto) return null;
  return (
    <section className="mx-auto max-w-[1240px] px-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-8 rounded-2xl bg-white p-6 sm:p-10">
        {loja.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.logo_url} alt="" className="size-32 shrink-0 rounded-full object-cover" />
        ) : (
          <span className={`flex size-32 shrink-0 items-center justify-center rounded-full bg-soft text-5xl text-deep ${fonte}`}>
            {loja.nome.trim()[0]?.toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          <h2 className={`text-3xl not-italic sm:text-4xl ${fonte}`}>
            <TituloLoja texto={conteudo.sobre_titulo} />
          </h2>
          <p className="leading-relaxed whitespace-pre-line text-muted">{conteudo.sobre_texto}</p>
        </div>
      </div>
    </section>
  );
}

function SecaoContato({ conteudo, fonte, whats }: Base) {
  if (!whats) return null;
  return (
    <section className="mx-auto max-w-[1240px] px-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-deep p-7 text-white sm:p-10">
        <p className={`flex-[1_1_380px] text-2xl leading-tight not-italic sm:text-3xl ${fonte}`}>
          <TituloLoja texto={conteudo.contato_texto} classeDestaque="italic" />
        </p>
        <a href={whats} target="_blank" rel="noopener" className="btn h-14 bg-white px-7 text-base text-deep">
          <IconeChat /> Chamar no WhatsApp
        </a>
      </div>
    </section>
  );
}

/** Desenha as seções visíveis, na ordem escolhida pela loja. */
export function SecoesDaVitrine(props: Base & { produtos: Produto[]; todos: Produto[]; categoria: string | null; busca?: string; linkProduto?: boolean }) {
  const mapa: Record<SecaoId, React.ReactNode> = {
    destaque: <SecaoDestaque {...props} produtos={props.todos} />,
    vantagens: <SecaoVantagens {...props} />,
    novidades: <SecaoNovidades {...props} busca={props.busca ?? ""} linkProduto={props.linkProduto ?? true} />,
    sobre: <SecaoSobre {...props} />,
    contato: <SecaoContato {...props} />,
  };
  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      {props.conteudo.secoes
        .filter((s) => s.visivel)
        .map((s) => (
          <div key={s.id}>{mapa[s.id]}</div>
        ))}
    </div>
  );
}

export function RedesSociais({ loja }: { loja: Pick<Loja, "instagram" | "tiktok"> }) {
  if (!loja.instagram && !loja.tiktok) return null;
  return (
    <span className="flex flex-wrap gap-4">
      {loja.instagram && (
        <a href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener" className="font-semibold text-deep">
          Instagram @{loja.instagram}
        </a>
      )}
      {loja.tiktok && (
        <a href={`https://tiktok.com/@${loja.tiktok}`} target="_blank" rel="noopener" className="font-semibold text-deep">
          TikTok @{loja.tiktok}
        </a>
      )}
    </span>
  );
}
