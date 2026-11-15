import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLojaPublica, getVitrine, ordenarTamanhos } from "@/lib/vitrine";
import { estiloDoTema, fonteDaLoja, formatoDaLoja } from "@/lib/temas";
import { CATEGORIAS } from "@/lib/tipos";
import { brl, linkWhatsApp } from "@/lib/formatar";
import { FotoPeca } from "@/components/peca";
import { IconeCaixa, IconeChat } from "@/components/icones";
import { CabecalhoLoja, RodapeLoja } from "./cabecalho";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const loja = await getLojaPublica(slug);
  if (!loja) return { title: "Loja não encontrada" };
  return {
    title: { absolute: `${loja.nome} · lingerie` },
    description: `Veja as novidades da ${loja.nome} e chame no WhatsApp.`,
    openGraph: { title: loja.nome, images: loja.capa_url ? [loja.capa_url] : loja.logo_url ? [loja.logo_url] : [] },
  };
}

export default async function VitrinePage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const { cat } = await searchParams;
  const loja = await getLojaPublica(slug);
  if (!loja) notFound();

  const todos = await getVitrine(loja.id);
  const categoria = typeof cat === "string" && CATEGORIAS.some((c) => c.id === cat) ? cat : null;
  const produtos = categoria ? todos.filter((p) => p.categoria === categoria) : todos;
  const categoriasComPecas = CATEGORIAS.filter((c) => todos.some((p) => p.categoria === c.id));
  const fonte = fonteDaLoja(loja.fonte);
  const formato = formatoDaLoja(loja.formato);
  const whats = linkWhatsApp(loja.whatsapp, `Oi! Vi a vitrine da ${loja.nome} e queria ajuda para escolher 💕`);

  return (
    <div style={estiloDoTema(loja.tema)} className="min-h-screen bg-blush text-ink">
      <div className="bg-deep px-4 py-2.5 text-center text-[13px] font-medium text-white">
        Embalagem discreta · Entrega combinada{loja.cidade ? ` em ${loja.cidade}` : ""} · Pix, cartão ou combinado
      </div>

      <CabecalhoLoja loja={loja}>
        {whats && (
          <a href={whats} target="_blank" rel="noopener" className="btn-primario">
            <IconeChat tamanho={18} /> WhatsApp
          </a>
        )}
      </CabecalhoLoja>

      <section className="mx-auto max-w-[1240px] px-6">
        <div className="relative flex flex-wrap items-end gap-8 overflow-hidden rounded-[40px] bg-soft px-8 pt-12 sm:px-14 sm:pt-14">
          {loja.capa_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loja.capa_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          )}
          <div className="relative flex flex-[1_1_380px] flex-col gap-5 pb-12 sm:pb-14">
            <span className="text-xs font-bold tracking-[0.16em] text-deep uppercase">Coleção nova</span>
            <h1 className={`text-5xl leading-[1.02] not-italic sm:text-6xl ${fonte}`}>
              Renda, cetim e <span className="italic text-deep">você</span> no centro de tudo
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              Escolha suas peças, me chama no WhatsApp e eu separo no seu tamanho. Atendimento discreto e com carinho.
            </p>
            <a href="#novidades" className="btn-primario self-start h-14 px-7 text-base">Ver a coleção</a>
          </div>
          <div className="relative hidden flex-[0_1_380px] items-end justify-center gap-5 sm:flex" aria-hidden="true">
            <div className="flex h-80 w-44 items-center justify-center rounded-t-full bg-petal">
              <FotoPeca foto={todos[0]?.fotos[0]} categoria={todos[0]?.categoria ?? "camisolas"} alt="" className="h-full w-full rounded-t-full" fundo="bg-petal" tamanhoIlustracao={130} />
            </div>
            <div className="flex h-60 w-36 items-center justify-center rounded-t-full bg-white">
              <FotoPeca foto={todos[1]?.fotos[0]} categoria={todos[1]?.categoria ?? "sutias"} alt="" className="h-full w-full rounded-t-full" fundo="bg-white" tamanhoIlustracao={100} />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Vantagens" className="mx-auto mt-8 grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 px-6">
        {[
          { t: "Embalagem discreta", s: "Ninguém sabe o que tem dentro" },
          { t: "Entrega combinada", s: "Dia e local que ficar bom" },
          { t: "Pague como preferir", s: "Pix, cartão ou parcelado" },
          { t: "Ajuda com o tamanho", s: "Me chama que eu te oriento" },
        ].map((v) => (
          <div key={v.t} className="flex items-center gap-3.5 rounded-3xl bg-white px-5 py-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-soft text-deep"><IconeCaixa /></span>
            <span className="flex flex-col"><strong className="text-[15px]">{v.t}</strong><span className="text-[13px] text-muted">{v.s}</span></span>
          </div>
        ))}
      </section>

      <section id="novidades" className="mx-auto mt-16 flex max-w-[1240px] flex-col gap-6 px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={`text-4xl not-italic sm:text-5xl ${fonte}`}>Novidades <span className="italic text-deep">da sacola</span></h2>
          <span className="text-muted">{produtos.length} {produtos.length === 1 ? "peça" : "peças"}</span>
        </div>
        {categoriasComPecas.length > 1 && (
          <nav aria-label="Categorias" className="flex flex-wrap gap-2.5">
            {[{ id: null, nome: "Todas" }, ...categoriasComPecas].map((c) => {
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
            {produtos.map((p, i) => (
              <Link key={p.id} href={`/${loja.slug}/p/${p.id}`} className="flex flex-col gap-1.5">
                <FotoPeca
                  foto={p.fotos[0]}
                  categoria={p.categoria}
                  alt={p.nome}
                  className={`aspect-[3/4] w-full ${formato.foto}`}
                  fundo={i % 2 ? "bg-petal" : "bg-soft"}
                />
                <span className="mt-2 font-medium">{p.nome}</span>
                <span className="text-[13px] text-muted">
                  Tam. {ordenarTamanhos((p.variantes ?? []).filter((v) => v.estoque > 0)).map((v) => v.tamanho).join(" · ")}
                </span>
                <span className="text-lg font-bold text-deep">{brl(p.preco)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {whats && (
        <section className="mx-auto mt-18 max-w-[1240px] px-6">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[40px] bg-deep p-10 text-white sm:p-12">
            <p className={`flex-[1_1_380px] text-3xl leading-tight not-italic sm:text-4xl ${fonte}`}>
              Ficou na dúvida do tamanho? <span className="italic">Me chama</span> que eu te ajudo a escolher.
            </p>
            <a href={whats} target="_blank" rel="noopener" className="btn h-14 bg-white px-7 text-base text-deep">
              <IconeChat /> Chamar no WhatsApp
            </a>
          </div>
        </section>
      )}

      <RodapeLoja loja={loja} />
    </div>
  );
}
