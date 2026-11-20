import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLojaPublica, getVitrine } from "@/lib/vitrine";
import { estiloDoTema, fonteDaLoja, formatoDaLoja } from "@/lib/temas";
import { CATEGORIAS } from "@/lib/tipos";
import { conteudoDaLoja } from "@/lib/conteudo";
import { AvisoTopo, SecoesDaVitrine } from "@/components/vitrine/secoes";
import { linkWhatsApp } from "@/lib/formatar";
import { IconeChat } from "@/components/icones";
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
  const fonte = fonteDaLoja(loja.fonte);
  const formato = formatoDaLoja(loja.formato);
  const conteudo = conteudoDaLoja(loja);
  const whats = linkWhatsApp(loja.whatsapp, `Oi! Vi a vitrine da ${loja.nome} e queria ajuda para escolher 💕`);

  return (
    <div style={estiloDoTema(loja.tema, loja.cor_personalizada)} className="min-h-screen bg-blush text-ink">
      <AvisoTopo texto={conteudo.aviso_topo} />

      <CabecalhoLoja loja={loja}>
        {whats && (
          <a href={whats} target="_blank" rel="noopener" className="btn-primario">
            <IconeChat tamanho={18} /> WhatsApp
          </a>
        )}
      </CabecalhoLoja>

      <SecoesDaVitrine
        loja={loja}
        conteudo={conteudo}
        fonte={fonte}
        formatoFoto={formato.foto}
        whats={whats}
        produtos={produtos}
        todos={todos}
        categoria={categoria}
      />

      <RodapeLoja loja={loja} />
    </div>
  );
}
