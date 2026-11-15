import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MODO_DEMO } from "@/lib/demo";

/** Renova a sessão em cada request e protege /painel. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Demonstração: não há sessão de verdade para renovar nem rotas para proteger
  if (MODO_DEMO) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Não coloque código entre createServerClient e getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
