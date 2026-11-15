const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const brl = (v: number | string | null | undefined) => moeda.format(Number(v ?? 0));

export function dataCurta(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export function diasAte(iso: string) {
  const alvo = new Date(iso.slice(0, 10) + "T12:00:00");
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

export function iniciais(nome: string | null | undefined) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return (partes[0][0] + (partes[1]?.[0] ?? "")).toUpperCase();
}

export function slugify(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const FORMAS_PAGAMENTO = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  fiado: "Fiado",
} as const;

/** Link do WhatsApp com mensagem pronta. */
export function linkWhatsApp(numero: string | null | undefined, texto: string) {
  const n = (numero ?? "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}
