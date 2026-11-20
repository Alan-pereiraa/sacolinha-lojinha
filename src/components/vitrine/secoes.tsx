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
import { IconeCaixa, IconeChat } from "@/components/icones";
import { TituloLoja } from "@/components/titulo-loja";

type Base = { loja: Loja; conteudo: Conteudo; fonte: string; formatoFoto: string; whats: string | null; compacto?: boolean };

export function AvisoTopo({ texto }: { texto: string }) {
  if (!texto) return null;
  return <div className="bg-deep px-4 py-2.5 text-center text-[13px] font-medium text-white">{texto}</div>;
}

function SecaoDestaque({ loja, conteudo, fonte, produtos }: Base & { produtos: Produto[] }) {
  return (
    <section className="mx-auto max-w-[1240px] px-6">
      <div className="relative flex flex-wrap items-end gap-8 overflow-hidden rounded-[40px] bg-soft px-8 pt-12 sm:px-14 sm:pt-14">
        {loja.capa_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.capa_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="relative flex flex-[1_1_380px] flex-col gap-5 pb-12 sm:pb-14">
          {conteudo.destaque_etiqueta && (
            <span className="text-xs font-bold tracking-[0.16em] text-deep uppercase">{conteudo.destaque_etiqueta}</span>
          )}
          <h1 className={`text-5xl leading-[1.02] not-italic sm:text-6xl ${fonte}`}>
            <TituloLoja texto={conteudo.destaque_titulo} />
          </h1>
          {conteudo.destaque_texto && <p className="max-w-md text-lg leading-relaxed text-muted">{conteudo.destaque_texto}</p>}
          <a href="#novidades" className="btn-primario h-14 self-start px-7 text-base">{conteudo.destaque_botao}</a>
        </div>
        <div className="relative hidden flex-[0_1_380px] items-end justify-center gap-5 sm:flex" aria-hidden="true">
          <div className="flex h-80 w-44 items-center justify-center rounded-t-full bg-petal">
            <FotoPeca foto={produtos[0]?.fotos[0]} categoria={produtos[0]?.categoria ?? "camisolas"} alt="" className="h-full w-full rounded-t-full" fundo="bg-petal" tamanhoIlustracao={130} />
          </div>
          <div className="flex h-60 w-36 items-center justify-center rounded-t-full bg-white">
            <FotoPeca foto={produtos[1]?.fotos[0]} categoria={produtos[1]?.categoria ?? "sutias"} alt="" className="h-full w-full rounded-t-full" fundo="bg-white" tamanhoIlustracao={100} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SecaoVantagens({ conteudo }: Base) {
  if (conteudo.vantagens.length === 0) return null;
  return (
    <section aria-label="Vantagens" className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 px-6">
      {conteudo.vantagens.map((v) => (
        <div key={v.titulo} className="flex items-center gap-3.5 rounded-3xl bg-white px-5 py-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-soft text-deep"><IconeCaixa /></span>
          <span className="flex min-w-0 flex-col">
            <strong className="text-[15px]">{v.titulo}</strong>
            {v.texto && <span className="text-[13px] text-muted">{v.texto}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}

function SecaoNovidades({
  loja,
  conteudo,
  fonte,
  formatoFoto,
  produtos,
  todos,
  categoria,
  linkProduto,
}: Base & { produtos: Produto[]; todos: Produto[]; categoria: string | null; linkProduto: boolean }) {
  const categoriasComPecas = CATEGORIAS.filter((c) => todos.some((p) => p.categoria === c.id));
  return (
    <section id="novidades" className="mx-auto flex max-w-[1240px] flex-col gap-6 px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className={`text-4xl not-italic sm:text-5xl ${fonte}`}>
          <TituloLoja texto={conteudo.novidades_titulo} />
        </h2>
        <span className="text-muted">{produtos.length} {produtos.length === 1 ? "peça" : "peças"}</span>
      </div>
      {categoriasComPecas.length > 1 && (
        <nav aria-label="Categorias" className="flex flex-wrap gap-2.5">
          {[{ id: null as string | null, nome: "Todas" }, ...categoriasComPecas].map((c) => {
            const on = c.id === categoria;
            return (
              <Link
                key={c.nome}
                href={c.id ? `/${loja.slug}?cat=${c.id}#novidades` : `/${loja.slug}#novidades`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`flex h-11 items-center rounded-full border px-5 text-[15px] font-semibold ${on ? "border-deep bg-deep text-white" : "border-petal bg-white"}`}
              >
                {c.nome}
              </Link>
            );
          })}
        </nav>
      )}
      {produtos.length === 0 ? (
        <p className="rounded-3xl border-[1.5px] border-dashed border-petal p-10 text-center text-muted">
          As peças novas chegam em breve. Me chama no WhatsApp para saber antes!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] sm:gap-x-6">
          {produtos.map((p, i) => {
            const conteudoCard = (
              <>
                <FotoPeca foto={p.fotos[0]} categoria={p.categoria} alt={p.nome} className={`aspect-[3/4] w-full ${formatoFoto}`} fundo={i % 2 ? "bg-petal" : "bg-soft"} />
                <span className="mt-2 font-medium">{p.nome}</span>
                <span className="text-[13px] text-muted">
                  Tam. {ordenarTamanhos((p.variantes ?? []).filter((v) => v.estoque > 0)).map((v) => v.tamanho).join(" · ")}
                </span>
                <span className="text-lg font-bold text-deep">{brl(p.preco)}</span>
              </>
            );
            return linkProduto ? (
              <Link key={p.id} href={`/${loja.slug}/p/${p.id}`} className="flex flex-col gap-1.5">{conteudoCard}</Link>
            ) : (
              <div key={p.id} className="flex flex-col gap-1.5">{conteudoCard}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SecaoSobre({ loja, conteudo, fonte }: Base) {
  if (!conteudo.sobre_texto) return null;
  return (
    <section className="mx-auto max-w-[1240px] px-6">
      <div className="flex flex-wrap items-center gap-8 rounded-[40px] bg-white p-8 sm:p-12">
        {loja.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.logo_url} alt="" className="size-32 shrink-0 rounded-full object-cover" />
        ) : (
          <span className={`flex size-32 shrink-0 items-center justify-center rounded-full bg-soft text-5xl text-deep ${fonte}`}>
            {loja.nome.trim()[0]?.toUpperCase()}
          </span>
        )}
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          <h2 className={`text-3xl not-italic sm:text-4xl ${fonte}`}><TituloLoja texto={conteudo.sobre_titulo} /></h2>
          <p className="leading-relaxed whitespace-pre-line text-muted">{conteudo.sobre_texto}</p>
        </div>
      </div>
    </section>
  );
}

function SecaoContato({ conteudo, fonte, whats }: Base) {
  if (!whats) return null;
  return (
    <section className="mx-auto max-w-[1240px] px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[40px] bg-deep p-10 text-white sm:p-12">
        <p className={`flex-[1_1_380px] text-3xl leading-tight not-italic sm:text-4xl ${fonte}`}>
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
export function SecoesDaVitrine(
  props: Base & { produtos: Produto[]; todos: Produto[]; categoria: string | null; linkProduto?: boolean },
) {
  const mapa: Record<SecaoId, React.ReactNode> = {
    destaque: <SecaoDestaque {...props} produtos={props.todos} />,
    vantagens: <SecaoVantagens {...props} />,
    novidades: <SecaoNovidades {...props} linkProduto={props.linkProduto ?? true} />,
    sobre: <SecaoSobre {...props} />,
    contato: <SecaoContato {...props} />,
  };
  return (
    <div className={`flex flex-col ${props.compacto ? "gap-8" : "gap-14"}`}>
      {props.conteudo.secoes.filter((s) => s.visivel).map((s) => (
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
