"use client";

import { createClient } from "@/lib/supabase/client";
import { MODO_DEMO } from "@/lib/config";
import { LIMITES, SUFIXO_GRANDE, SUFIXO_MINI } from "@/lib/fotos";

const MAX_ORIGINAL = 25 * 1024 * 1024; // fotos de câmera grandes ainda são aceitas: são reduzidas aqui

/** Desenha a imagem no tamanho pedido (e recortada no centro, se `quadrada`). */
function desenhar(bitmap: ImageBitmap, max: number, quadrada = false) {
  const lado = Math.min(bitmap.width, bitmap.height);
  const sx = quadrada ? (bitmap.width - lado) / 2 : 0;
  const sy = quadrada ? (bitmap.height - lado) / 2 : 0;
  const sw = quadrada ? lado : bitmap.width;
  const sh = quadrada ? lado : bitmap.height;
  const escala = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * escala));
  canvas.height = Math.max(1, Math.round(sh * escala));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** WebP quando o navegador sabe gerar (bem mais leve); senão JPEG. */
async function comprimir(canvas: HTMLCanvasElement, qualidade: number): Promise<{ blob: Blob; ext: string }> {
  const gerar = (tipo: string, q: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, q));
  const webp = await gerar("image/webp", qualidade);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await gerar("image/jpeg", Math.min(0.85, qualidade + 0.02));
  if (!jpeg) throw new Error("Não deu para processar a foto.");
  return { blob: jpeg, ext: "jpg" };
}

async function abrir(arquivo: File) {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha uma imagem (JPG, PNG ou WebP).");
  if (arquivo.size > MAX_ORIGINAL) throw new Error("Essa foto é grande demais. Escolha uma de até 25 MB.");
  try {
    return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não deu para abrir essa foto. Tente tirar um print ou escolher outra.");
  }
}

/**
 * Reduz, comprime e envia a foto para o bucket `fotos` na pasta da loja.
 * Peças: versão grande (1280 px) + miniatura (480 px). Capa: 1600 px. Logo: 512 px, quadrada.
 * Devolve a URL pública da versão grande.
 */
export async function enviarFoto(arquivo: File, lojaId: string, tipo: "produto" | "capa" | "logo") {
  if (MODO_DEMO) {
    throw new Error("O envio de fotos fica desligado na demonstração. Ele funciona com o Supabase configurado.");
  }
  const bitmap = await abrir(arquivo);
  const limite = LIMITES[tipo];
  const id = crypto.randomUUID();
  const pasta = tipo === "produto" ? "produtos" : "marca";
  const supabase = createClient();

  const versoes: { caminho: string; blob: Blob; tipoMime: string }[] = [];
  const grande = await comprimir(desenhar(bitmap, limite.grande, "quadrada" in limite && limite.quadrada), limite.qualidade);
  const nomeGrande = tipo === "produto" ? `${id}${SUFIXO_GRANDE}${grande.ext}` : `${id}.${grande.ext}`;
  versoes.push({ caminho: `${lojaId}/${pasta}/${nomeGrande}`, blob: grande.blob, tipoMime: grande.blob.type });
  if (tipo === "produto") {
    const mini = await comprimir(desenhar(bitmap, LIMITES.produto.mini), 0.75);
    versoes.push({ caminho: `${lojaId}/${pasta}/${id}${SUFIXO_MINI}${mini.ext}`, blob: mini.blob, tipoMime: mini.blob.type });
  }
  bitmap.close();

  const resultados = await Promise.all(
    versoes.map((v) =>
      supabase.storage.from("fotos").upload(v.caminho, v.blob, { contentType: v.tipoMime, cacheControl: "31536000", upsert: false }),
    ),
  );
  if (resultados.some((r) => r.error)) throw new Error("Não deu para enviar a foto. Tente de novo.");
  return supabase.storage.from("fotos").getPublicUrl(versoes[0].caminho).data.publicUrl;
}
