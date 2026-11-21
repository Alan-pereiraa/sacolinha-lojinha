import Link from "next/link";
import { getMinhaLoja } from "@/lib/loja";
import { estiloDoTema } from "@/lib/temas";
import { sair } from "../(acesso)/actions";
import { IconeSair } from "@/components/icones";
import { MenuInferior, MenuLateral } from "./navegacao";
import { MODO_DEMO } from "@/lib/demo";

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const { loja } = await getMinhaLoja();

  return (
    <div style={estiloDoTema(loja.tema, loja.cor_personalizada)} className="flex min-h-screen bg-blush text-ink">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col gap-7 border-r border-petal bg-white px-5 py-7 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <MarcaLoja nome={loja.nome} logo={loja.logo_url} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-elegante text-xl italic">{loja.nome}</span>
            <span className="text-xs text-muted">Painel da loja</span>
          </span>
        </div>
        <MenuLateral />
        <div className="mt-auto flex flex-col gap-2">
          <Link href={`/${loja.slug}`} target="_blank" className="flex flex-col gap-1 rounded-[20px] bg-soft p-4">
            <span className="text-[13px] text-muted">Sua vitrine</span>
            <span className="truncate text-sm font-bold text-deep">sacolinha.app/{loja.slug} ↗</span>
          </Link>
          <form action={sair}>
            <button className="flex h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-muted hover:bg-blush">
              <IconeSair /> Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 bg-white px-5 py-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <MarcaLoja nome={loja.nome} logo={loja.logo_url} />
            <span className="truncate font-elegante text-xl italic">{loja.nome}</span>
          </div>
          <form action={sair}>
            <button aria-label="Sair" className="flex size-11 items-center justify-center rounded-full text-muted">
              <IconeSair />
            </button>
          </form>
        </header>
        {MODO_DEMO && (
          <p className="bg-ink px-5 py-2 text-center text-[13px] text-white">
            Modo demonstração: dados de exemplo. O que você mudar some quando o servidor reiniciar.
          </p>
        )}
        <main className="flex w-full max-w-[1200px] flex-col gap-6 px-5 pt-6 pb-32 sm:px-8 lg:pb-12">{children}</main>
      </div>

      <MenuInferior />
    </div>
  );
}

function MarcaLoja({ nome, logo }: { nome: string; logo: string | null }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="size-11 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-deep font-elegante text-xl text-white italic">
      {nome.trim()[0]?.toUpperCase() ?? "S"}
    </span>
  );
}
