import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail (confirmação de cadastro e troca de senha).
 *
 * Aceita os dois formatos que o Supabase usa:
 *   ?code=...                       (padrão; o Supabase já confirmou o e-mail antes de mandar para cá)
 *   ?token_hash=...&type=signup     (modelo de e-mail personalizado; funciona em qualquer aparelho)
 * e também os erros que o Supabase devolve (?error=...&error_code=otp_expired).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = searchParams.get("next") ?? "";
  const ehSenha = next.startsWith("/painel/senha") || searchParams.get("type") === "recovery";
  const url = request.nextUrl.clone();
  url.search = "";

  const irPara = (caminho: string, extras: Record<string, string> = {}) => {
    url.pathname = caminho;
    for (const [k, v] of Object.entries(extras)) url.searchParams.set(k, v);
    return NextResponse.redirect(url);
  };

  // O próprio Supabase avisou que o link não vale mais (expirado ou já usado)
  if (searchParams.get("error") || searchParams.get("error_code")) {
    return irPara("/confirmado", { situacao: ehSenha ? "senha-expirada" : "expirado" });
  }

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return irPara("/confirmado", { situacao: type === "recovery" ? "senha-expirada" : "expirado" });
    return type === "recovery" ? irPara("/painel/senha") : irPara("/confirmado", { situacao: "ok" });
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return ehSenha ? irPara("/painel/senha") : irPara("/confirmado", { situacao: "ok" });
    // O e-mail foi confirmado pelo Supabase, mas o link foi aberto em outro aparelho/navegador
    // (sem a chave que fica no navegador do cadastro): só falta entrar.
    return ehSenha ? irPara("/confirmado", { situacao: "senha-outro-aparelho" }) : irPara("/confirmado", { situacao: "entrar" });
  }

  return irPara("/confirmado", { situacao: "expirado" });
}
