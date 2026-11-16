"use client";

import { createClient } from "@/lib/supabase/client";
import { MODO_DEMO } from "@/lib/config";

/** Reduz a foto do celular para no máximo `max` px e converte para JPEG antes de enviar. */
async function reduzir(arquivo: File, max = 1600): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha uma imagem.");
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Falha ao processar a foto."))), "image/jpeg", 0.85),
  );
}

/** Envia uma foto para o bucket `fotos` na pasta da loja e devolve a URL pública. */
export async function enviarFoto(arquivo: File, lojaId: string, pasta: "produtos" | "marca") {
  if (MODO_DEMO) {
    throw new Error("O envio de fotos fica desligado na demonstração. Ele funciona com o Supabase configurado.");
  }
  const supabase = createClient();
  const blob = await reduzir(arquivo, pasta === "marca" ? 1200 : 1600);
  const caminho = `${lojaId}/${pasta}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("fotos").upload(caminho, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw new Error("Não deu para enviar a foto. Tente de novo.");
  return supabase.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
}
