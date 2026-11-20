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

// ───────── cor livre: gera a paleta inteira a partir de uma cor

function hexParaHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslParaHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function luminancia(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Contraste entre uma cor e o branco (texto branco em botão precisa de 4.5 ou mais). */
export function contrasteComBranco(hex: string) {
  return 1.05 / (luminancia(hex) + 0.05);
}

/**
 * Paleta completa a partir da cor escolhida pela loja.
 * A cor principal é escurecida, se preciso, até o texto branco ficar legível em cima dela.
 */
export function paletaDeCor(hex: string): Paleta {
  const [h, s0, l0] = hexParaHsl(hex);
  const s = Math.max(s0, 25);
  let l = Math.min(l0, 60);
  let deep = hslParaHex(h, s, l);
  while (contrasteComBranco(deep) < 4.6 && l > 10) {
    l -= 2;
    deep = hslParaHex(h, s, l);
  }
  return {
    deep,
    petal: hslParaHex(h, Math.min(s, 70), 86),
    soft: hslParaHex(h, Math.min(s, 70), 93),
    blush: hslParaHex(h, Math.min(s, 60), 98),
    ink: hslParaHex(h, Math.min(s, 60), 14),
    muted: hslParaHex(h, Math.min(s, 35), 34),
  };
}

export const COR_VALIDA = /^#[0-9a-fA-F]{6}$/;

/** Cores efetivas da loja: a cor livre (se houver) ou o tema pronto. */
export function coresDaLoja(tema: string | null | undefined, cor?: string | null): Paleta {
  if (cor && COR_VALIDA.test(cor)) return paletaDeCor(cor);
  return (TEMAS[tema as TemaId] ?? TEMAS.rosa).cores;
}

/** Variáveis CSS do tema — aplique no elemento raiz da página da loja. */
export function estiloDoTema(tema: string | null | undefined, cor?: string | null): CSSProperties {
  const c = coresDaLoja(tema, cor);
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
