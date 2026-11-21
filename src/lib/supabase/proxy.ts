import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MODO_DEMO } from "@/lib/demo";
import { CONFIG_OK, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

/** Renova a sessão em cada request e protege /painel. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Demonstração: não há sessão de verdade para renovar nem rotas para proteger
  if (MODO_DEMO) return response;
  // Configuração com problema: deixa a página abrir e mostrar o aviso em vez de derrubar o site
  if (!CONFIG_OK) return response;

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Não coloque código entre createServerClient e getClaims.
  // getClaims confere a assinatura do token localmente (chaves assimétricas) e só vai ao
  // servidor de autenticação quando precisa renovar a sessão: bem mais rápido que getUser.
  let user: { sub: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims?.sub ? { sub: data.claims.sub } : null;
  } catch (e) {
    // Supabase fora do ar ou chave recusada: segue sem sessão em vez de quebrar a página
    console.error("[proxy] falha ao ler a sessão", e);
  }

  const path = request.nextUrl.pathname;
  if (!user && path.startsWith("/painel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("voltar", path);
    return NextResponse.redirect(url);
  }
  if (user && (path === "/login" || path === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
