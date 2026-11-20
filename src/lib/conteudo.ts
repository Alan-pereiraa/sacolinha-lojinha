/* Textos e seções da vitrine: o que a loja editou, com os textos padrão como reserva. */
import type { Loja, Secao, SecaoId, Vantagem } from "@/lib/tipos";

export const SECOES_INFO: Record<SecaoId, { nome: string; descricao: string }> = {
  destaque: { nome: "Destaque", descricao: "Banner do topo com título, texto e botão" },
  vantagens: { nome: "Vantagens", descricao: "Até 4 motivos para comprar com você" },
  novidades: { nome: "Peças", descricao: "As peças da sacola, com filtro por categoria" },
  sobre: { nome: "Sobre mim", descricao: "Um texto contando quem você é" },
  contato: { nome: "Chamar no WhatsApp", descricao: "Faixa final com o botão de contato" },
};

export const SECOES_PADRAO: Secao[] = [
  { id: "destaque", visivel: true },
  { id: "vantagens", visivel: true },
  { id: "novidades", visivel: true },
  { id: "sobre", visivel: false },
  { id: "contato", visivel: true },
];

export const VANTAGENS_PADRAO: Vantagem[] = [
  { titulo: "Embalagem discreta", texto: "Ninguém sabe o que tem dentro" },
  { titulo: "Entrega combinada", texto: "Dia e local que ficar bom" },
  { titulo: "Pague como preferir", texto: "Pix, cartão ou no caderninho" },
  { titulo: "Ajuda com o tamanho", texto: "Me chama que eu te oriento" },
];

export const TEXTOS_PADRAO = {
  aviso_topo: "Embalagem discreta · Entrega combinada · Pix, cartão ou combinado",
  destaque_etiqueta: "Coleção nova",
  destaque_titulo: "Renda, cetim e *você* no centro de tudo",
  destaque_texto: "Escolha suas peças, me chama no WhatsApp e eu separo no seu tamanho. Atendimento discreto e com carinho.",
  destaque_botao: "Ver a coleção",
  novidades_titulo: "Novidades *da sacola*",
  sobre_titulo: "Prazer, *eu sou a dona*",
  sobre_texto: "",
  contato_texto: "Ficou na dúvida do tamanho? *Me chama* que eu te ajudo a escolher.",
};

export type Conteudo = typeof TEXTOS_PADRAO & { vantagens: Vantagem[]; secoes: Secao[] };

/** Junta o que a loja escreveu com os textos padrão e garante todas as seções na lista. */
export function conteudoDaLoja(loja: Partial<Loja>): Conteudo {
  const texto = (k: keyof typeof TEXTOS_PADRAO) => {
    const v = loja[k];
    return typeof v === "string" && v.trim() ? v.trim() : TEXTOS_PADRAO[k];
  };
  const salvas = Array.isArray(loja.secoes) ? loja.secoes.filter((s) => s && s.id in SECOES_INFO) : [];
  const secoes = [...salvas, ...SECOES_PADRAO.filter((p) => !salvas.some((s) => s.id === p.id))];
  const vantagens = Array.isArray(loja.vantagens)
    ? loja.vantagens.filter((v) => v && v.titulo?.trim()).slice(0, 4)
    : VANTAGENS_PADRAO;
  return {
    aviso_topo: typeof loja.aviso_topo === "string" ? loja.aviso_topo.trim() : TEXTOS_PADRAO.aviso_topo,
    destaque_etiqueta: texto("destaque_etiqueta"),
    destaque_titulo: texto("destaque_titulo"),
    destaque_texto: texto("destaque_texto"),
    destaque_botao: texto("destaque_botao"),
    novidades_titulo: texto("novidades_titulo"),
    sobre_titulo: texto("sobre_titulo"),
    sobre_texto: typeof loja.sobre_texto === "string" ? loja.sobre_texto.trim() : "",
    contato_texto: texto("contato_texto"),
    vantagens,
    secoes,
  };
}

/**
 * Divide um título em partes normais e em destaque (o que está entre *asteriscos*
 * aparece em itálico na cor da loja).
 */
export function partesDoTitulo(texto: string) {
  return texto.split(/(\*[^*]+\*)/g).filter(Boolean).map((t) =>
    t.startsWith("*") && t.endsWith("*") ? { destaque: true, texto: t.slice(1, -1) } : { destaque: false, texto: t },
  );
}
