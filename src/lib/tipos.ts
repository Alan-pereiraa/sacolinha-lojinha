export type Categoria = "conjuntos" | "sutias" | "calcinhas" | "bodies" | "camisolas" | "outros";

export const CATEGORIAS: { id: Categoria; nome: string }[] = [
  { id: "conjuntos", nome: "Conjuntos" },
  { id: "sutias", nome: "Sutiãs" },
  { id: "calcinhas", nome: "Calcinhas" },
  { id: "bodies", nome: "Bodies" },
  { id: "camisolas", nome: "Camisolas" },
  { id: "outros", nome: "Outros" },
];

export function nomeCategoria(id: string) {
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? "Outros";
}

export type Loja = {
  id: string;
  dono_id: string;
  nome: string;
  slug: string;
  cidade: string | null;
  whatsapp: string | null;
  tema: string;
  fonte: string;
  formato: string;
  logo_url: string | null;
  capa_url: string | null;
  wa_instancia?: string | null;
  wa_grupo_id?: string | null;
  wa_grupo_nome?: string | null;
  cobranca_ativa?: boolean;
  cobranca_dias_antes?: number;
  cobranca_repetir_dias?: number;
  cobranca_max_atraso?: number;
  cobranca_mensagem?: string | null;
  chave_pix?: string | null;
};

export type Parcela = {
  id: string;
  venda_id: string;
  numero: number;
  total_parcelas: number;
  valor: number;
  vence_em: string;
  pago_em: string | null;
  lembretes: number;
  ultimo_lembrete_em: string | null;
  vendas?: {
    cliente_nome: string | null;
    cliente_whatsapp: string | null;
    cobranca_automatica: boolean;
    criado_em: string;
    venda_itens?: { produto_nome: string; tamanho: string; quantidade: number }[];
  } | null;
};

export type Sacola = {
  id: string;
  loja_id: string;
  nome: string;
  recebida_em: string;
  devolver_ate: string;
  percentual_lucro: number;
  status: "aberta" | "fechada";
};

export type Variante = {
  id: string;
  produto_id: string;
  tamanho: string;
  codigo_barras: string | null;
  estoque: number;
  vendidos: number;
};

export type Produto = {
  id: string;
  loja_id: string;
  sacola_id: string | null;
  nome: string;
  categoria: Categoria;
  descricao: string | null;
  cor: string | null;
  preco: number;
  fotos: string[];
  visivel: boolean;
  novidade_enviada_em: string | null;
  criado_em: string;
  variantes?: Variante[];
};

export type Venda = {
  id: string;
  total: number;
  lucro: number;
  /** "fiado" é o Caderninho (o nome no banco ficou o antigo) */
  forma_pagamento: "pix" | "cartao" | "dinheiro" | "fiado";
  parcelas: number;
  cliente_nome: string | null;
  cliente_whatsapp?: string | null;
  cobranca_automatica?: boolean;
  pago: boolean;
  criado_em: string;
  venda_itens?: { produto_nome: string; tamanho: string; quantidade: number }[];
};

/** Colunas da loja que a vitrine pública pode ler (o anon não tem acesso às colunas de WhatsApp). */
export const COLUNAS_LOJA_PUBLICA =
  "id, dono_id, nome, slug, cidade, whatsapp, tema, fonte, formato, logo_url, capa_url";
