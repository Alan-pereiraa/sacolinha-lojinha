import { brl } from "@/lib/formatar";
import { ordenarTamanhos } from "@/lib/tamanhos";
import type { Produto } from "@/lib/tipos";

/** Texto que acompanha a foto da peça no grupo do WhatsApp. */
export function legendaDaPeca(p: Pick<Produto, "nome" | "preco" | "variantes">, nomeLoja: string, link: string) {
  const tamanhos = ordenarTamanhos((p.variantes ?? []).filter((v) => v.estoque > 0)).map((v) => v.tamanho);
  return [
    `✨ *Novidade na ${nomeLoja}*`,
    ``,
    `*${p.nome}*`,
    tamanhos.length ? `Tamanhos: ${tamanhos.join(" · ")}` : null,
    `💕 ${brl(p.preco)}`,
    ``,
    `Quer a sua? Me chama no privado ou veja aqui: ${link}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

