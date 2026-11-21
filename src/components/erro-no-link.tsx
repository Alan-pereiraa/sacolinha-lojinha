"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Alguns erros de link do Supabase chegam depois do "#" da URL (ex.: #error_code=otp_expired),
 * que o servidor não enxerga. Aqui o navegador lê e leva para a tela de confirmação.
 */
export function ErroNoLink() {
  const router = useRouter();
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error_code") || hash.get("error")) {
      const senha = /recovery|password/i.test(hash.get("error_description") ?? "");
      router.replace(`/confirmado?situacao=${senha ? "senha-expirada" : "expirado"}`);
    }
  }, [router]);
  return null;
}
