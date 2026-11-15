import Link from "next/link";
import type { Loja } from "@/lib/tipos";
import { fonteDaLoja } from "@/lib/temas";

export function CabecalhoLoja({ loja, children }: { loja: Loja; children?: React.ReactNode }) {
  const fonte = fonteDaLoja(loja.fonte);
  return (
    <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-5">
      <Link href={`/${loja.slug}`} className="flex items-center gap-3">
        {loja.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.logo_url} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <span className={`flex size-12 items-center justify-center rounded-full bg-deep text-[22px] text-white ${fonte}`}>
            {loja.nome.trim()[0]?.toUpperCase()}
          </span>
        )}
        <span className="flex flex-col">
          <span className={`text-[26px] leading-none ${fonte}`}>{loja.nome}</span>
          <span className="text-xs tracking-[0.12em] text-muted uppercase">lingerie{loja.cidade ? ` · ${loja.cidade}` : ""}</span>
        </span>
      </Link>
      {children}
    </header>
  );
}

export function RodapeLoja({ loja }: { loja: Loja }) {
  return (
    <footer className="mx-auto mt-16 flex max-w-[1240px] flex-wrap justify-between gap-4 border-t border-petal px-6 pt-8 pb-10 text-sm text-muted">
      <span>{loja.nome}{loja.cidade ? ` · ${loja.cidade}` : ""}</span>
      <span>
        Loja criada com <Link href="/" className="font-elegante text-base text-deep italic">Sacolinha</Link>
      </span>
    </footer>
  );
}
