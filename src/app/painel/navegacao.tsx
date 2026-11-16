"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeCaderno, IconeCasa, IconeCodigo, IconeLoja, IconeMegafone, IconeSacola } from "@/components/icones";

const ITENS = [
  { href: "/painel", rotulo: "Início", Icone: IconeCasa },
  { href: "/painel/sacola", rotulo: "Sacola", Icone: IconeSacola },
  { href: "/painel/vender", rotulo: "Vender", Icone: IconeCodigo },
  { href: "/painel/caderninho", rotulo: "Caderninho", Icone: IconeCaderno },
  { href: "/painel/divulgar", rotulo: "Divulgar", Icone: IconeMegafone },
  { href: "/painel/loja", rotulo: "Minha loja", Icone: IconeLoja },
];

/** No celular cabem 5: Divulgar fica acessível pela tela Minha loja. */
const ITENS_CELULAR = [ITENS[0], ITENS[3], ITENS[2], ITENS[1], { ...ITENS[5], rotulo: "Loja" }];

function ativo(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);
}

export function MenuLateral() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu" className="flex flex-col gap-1">
      {ITENS.map(({ href, rotulo, Icone }) => {
        const on = ativo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] ${
              on ? "bg-soft font-bold text-deep" : "font-medium text-ink hover:bg-blush"
            }`}
          >
            <Icone />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

export function MenuInferior() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu"
      className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-around rounded-t-[28px] bg-white px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-8px_24px_rgba(59,15,38,0.08)] lg:hidden"
    >
      {ITENS_CELULAR.map(({ href, rotulo, Icone }) => {
        const on = ativo(pathname, href);
        if (href === "/painel/vender") {
          return (
            <Link
              key={href}
              href={href}
              aria-label="Vender"
              className="-mt-7 flex size-15 items-center justify-center rounded-full bg-deep text-white shadow-[0_0_0_6px_var(--blush)]"
            >
              <Icone tamanho={26} />
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex min-w-14 flex-col items-center gap-0.5 py-1 text-[11px] ${on ? "font-bold text-deep" : "font-semibold text-muted"}`}
          >
            <Icone tamanho={22} />
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
