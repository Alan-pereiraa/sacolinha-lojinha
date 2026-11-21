/** Etiquetas do cache da vitrine pública: as ações do painel limpam a etiqueta certa ao salvar. */
export const tagLoja = (slug: string) => `loja:${slug.toLowerCase()}`;
export const tagProdutos = (lojaId: string) => `produtos:${lojaId}`;

/** Peças por página na vitrine. */
export const POR_PAGINA = 20;
