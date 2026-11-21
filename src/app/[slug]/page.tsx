import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLojaPublica, getResumoVitrine, getVitrinePagina } from "@/lib/vitrine";
import { estiloDoTema, fonteDaLoja, formatoDaLoja } from "@/lib/temas";
import { CATEGORIAS } from "@/lib/tipos";
import { conteudoDaLoja } from "@/lib/conteudo";
import { AvisoTopo, PerfilLoja, SecoesDaVitrine } from "@/components/vitrine/secoes";
import { linkWhatsApp } from "@/lib/formatar";
import { RodapeLoja } from "./cabecalho";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const loja = await getLojaPublica(slug);
  if (!loja) return { title: "Loja não encontrada" };
  return {
    title: { absolute: loja.nome },
    description: `Veja as novidades da ${loja.nome} e chame no WhatsApp.`,
    openGraph: { title: loja.nome, images: loja.capa_url ? [loja.capa_url] : loja.logo_url ? [loja.logo_url] : [] },
  };
}

export default async function VitrinePage({ params, searchParams }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const { cat, q, pagina: pag } = await searchParams;
  const loja = await getLojaPublica(slug);
  if (!loja) notFound();

  const categoria = typeof cat === "string" && CATEGORIAS.some((c) => c.id === cat) ? cat : null;
  const busca = typeof q === "string" ? q.trim().slice(0, 60) : "";
  const pedida = Math.max(1, Math.min(500, Number.parseInt(typeof pag === "string" ? pag : "1", 10) || 1));
  const [resumo, { produtos, total }] = await Promise.all([
    getResumoVitrine(loja.id),
    getVitrinePagina(loja.id, categoria, busca, pedida),
  ]);
  const fonte = fonteDaLoja(loja.fonte);
  const formato = formatoDaLoja(loja.formato);
  const conteudo = conteudoDaLoja(loja);
  const whats = linkWhatsApp(loja.whatsapp, `Oi! Vi a vitrine da ${loja.nome} e queria saber mais 💕`);

  return (
    <div style={estiloDoTema(loja.tema, loja.cor_personalizada)} className="min-h-screen bg-blush text-ink">
      <AvisoTopo texto={conteudo.aviso_topo} />

      <PerfilLoja loja={loja} conteudo={conteudo} fonte={fonte} whats={whats} totalPecas={resumo.length} />

      <div className="h-5 sm:h-6" />
      <SecoesDaVitrine
        loja={loja}
        conteudo={conteudo}
        fonte={fonte}
        formatoFoto={formato.foto}
        whats={whats}
        produtos={produtos}
        resumo={resumo}
        total={total}
        pagina={pedida}
        categoria={categoria}
        busca={busca}
      />

      <RodapeLoja loja={loja} />
    </div>
  );
}
