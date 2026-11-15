import type { CSSProperties } from "react";

export type TemaId = "rosa" | "lilas" | "pessego" | "salvia";
export type FonteId = "elegante" | "romantica" | "moderna";
export type FormatoId = "arco" | "suave" | "reto";

type Paleta = { deep: string; petal: string; soft: string; blush: string; ink: string; muted: string };

export const TEMAS: Record<TemaId, { nome: string; cores: Paleta }> = {
  rosa:    { nome: "Rosa",    cores: { deep: "#A3195B", petal: "#F9C9DA", soft: "#FCE1EB", blush: "#FFF6F9", ink: "#3B0F26", muted: "#7A3B58" } },
  lilas:   { nome: "Lilás",   cores: { deep: "#6B3FA0", petal: "#DCCBF3", soft: "#EEE5FA", blush: "#FAF7FE", ink: "#2A1640", muted: "#5A4775" } },
  pessego: { nome: "Pêssego", cores: { deep: "#A63F22", petal: "#F9CDB9", soft: "#FDE6DC", blush: "#FFF8F4", ink: "#3D1A10", muted: "#7A4232" } },
  salvia:  { nome: "Sálvia",  cores: { deep: "#3F6B52", petal: "#C6DDCD", soft: "#E3F0E7", blush: "#F7FBF8", ink: "#16291E", muted: "#3F5A49" } },
};

export const FONTES: Record<FonteId, { nome: string; classe: string }> = {
  elegante:  { nome: "Elegante",  classe: "font-elegante italic" },
  romantica: { nome: "Romântica", classe: "font-romantica italic font-semibold" },
  moderna:   { nome: "Moderna",   classe: "font-sans font-bold not-italic" },
};

export const FORMATOS: Record<FormatoId, { nome: string; foto: string; mini: string }> = {
  arco:  { nome: "Arco",  foto: "rounded-t-[999px] rounded-b-3xl", mini: "rounded-t-full rounded-b-md" },
  suave: { nome: "Suave", foto: "rounded-3xl",                    mini: "rounded-lg" },
  reto:  { nome: "Reto",  foto: "rounded-md",                     mini: "rounded-sm" },
};

/** Variáveis CSS do tema — aplique no elemento raiz da página da loja. */
export function estiloDoTema(tema: string | null | undefined): CSSProperties {
  const c = (TEMAS[tema as TemaId] ?? TEMAS.rosa).cores;
  return {
    "--deep": c.deep,
    "--petal": c.petal,
    "--soft": c.soft,
    "--blush": c.blush,
    "--ink": c.ink,
    "--muted": c.muted,
  } as CSSProperties;
}

export function fonteDaLoja(fonte: string | null | undefined) {
  return (FONTES[fonte as FonteId] ?? FONTES.elegante).classe;
}

export function formatoDaLoja(formato: string | null | undefined) {
  return FORMATOS[formato as FormatoId] ?? FORMATOS.arco;
}
