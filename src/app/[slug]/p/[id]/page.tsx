import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLojaPublica, getProdutoPublico, ordenarTamanhos } from "@/lib/vitrine";
import { estiloDoTema, fonteDaLoja, formatoDaLoja } from "@/lib/temas";
import { nomeCategoria } from "@/lib/tipos";
import { brl } from "@/lib/formatar";
import { IconeVoltar } from "@/components/icones";
import { CabecalhoLoja, RodapeLoja } from "../../cabecalho";
import { EscolhaPeca, Galeria } from "./escolha";

export async function generateMetadata({ params }: PageProps<"/[slug]/p/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const loja = await getLojaPublica(slug);
  const produto = loja ? await getProdutoPublico(loja.id, id) : null;
  if (!loja || !produto) return { title: "Peça não encontrada" };
  return {
    title: { absolute: `${produto.nome} · ${loja.nome}` },
    description: `${produto.nome} por ${brl(produto.preco)}. Chame no WhatsApp.`,
    openGraph: { title: `${produto.nome} · ${brl(produto.preco)}`, images: produto.fotos.slice(0, 1) },
  };
}

export default async function ProdutoPage({ params }: PageProps<"/[slug]/p/[id]">) {
  const { slug, id } = await params;
  const loja = await getLojaPublica(slug);
  if (!loja) notFound();
  const produto = await getProdutoPublico(loja.id, id);
  if (!produto) notFound();

  const fonte = fonteDaLoja(loja.fonte);
  const tamanhos = ordenarTamanhos(produto.variantes ?? []).map((v) => ({ tamanho: v.tamanho, disponivel: v.estoque > 0 }));

  return (
    <div style={estiloDoTema(loja.tema)} className="min-h-screen bg-blush text-ink">
      <CabecalhoLoja loja={loja}>
        <Link href={`/${loja.slug}`} className="flex items-center gap-2 py-2.5 font-semibold text-deep">
          <IconeVoltar tamanho={18} /> Voltar para a vitrine
        </Link>
      </CabecalhoLoja>

      <main className="mx-auto flex max-w-[1240px] flex-wrap gap-12 px-6">
        <Galeria fotos={produto.fotos} categoria={produto.categoria} nome={produto.nome} formato={formatoDaLoja(loja.formato).foto} />

        <section className="flex min-w-0 flex-[1_1_380px] flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] tracking-[0.08em] text-muted uppercase">{nomeCategoria(produto.categoria)}</span>
            <h1 className={`text-4xl leading-tight not-italic sm:text-5xl ${fonte}`}>{produto.nome}</h1>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-deep">{brl(produto.preco)}</span>
              <span className="text-sm text-muted">Pix, cartão ou combinado</span>
            </div>
          </div>
          {produto.cor && <p className="text-sm"><strong>Cor:</strong> {produto.cor}</p>}
          <EscolhaPeca
            tamanhos={tamanhos}
            whatsapp={loja.whatsapp}
            nome={produto.nome}
            preco={brl(produto.preco)}
            caminho={`/${loja.slug}/p/${produto.id}`}
          />
          {produto.descricao && <p className="leading-relaxed whitespace-pre-line text-muted">{produto.descricao}</p>}
        </section>
      </main>

      <RodapeLoja loja={loja} />
    </div>
  );
}
