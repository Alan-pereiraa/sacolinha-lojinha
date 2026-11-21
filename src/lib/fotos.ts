/*
 * Fotos enviadas pelo painel são guardadas em dois tamanhos:
 *   <id>__g.webp  → grande (página da peça)
 *   <id>__p.webp  → miniatura (grades e listas)
 * As fotos antigas (sem o sufixo) continuam valendo e são usadas como estão.
 */
export const SUFIXO_GRANDE = "__g.";
export const SUFIXO_MINI = "__p.";

/** URL da miniatura de uma foto, quando ela existe. */
export function miniatura(url?: string | null): string | null {
  if (!url) return null;
  return url.includes(SUFIXO_GRANDE) ? url.replace(SUFIXO_GRANDE, SUFIXO_MINI) : url;
}

/** Tamanhos máximos (lado maior, em px) e qualidade de cada tipo de imagem. */
export const LIMITES = {
  produto: { grande: 1280, mini: 480, qualidade: 0.8 },
  capa: { grande: 1600, qualidade: 0.8 },
  logo: { grande: 512, qualidade: 0.85, quadrada: true },
} as const;
