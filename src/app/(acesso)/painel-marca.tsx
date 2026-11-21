import Link from "next/link";
import { LogoSacolinha } from "@/components/logo-sacolinha";

/** Tela de acesso (entrar / esqueci a senha): fundo rosa com a logo e o cartão do formulário. */
export function TelaAcesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-deep px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -top-24 -left-24 size-80 rounded-full bg-white/10" />
        <span className="absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-white/10" />
        <span className="absolute top-1/4 right-[12%] size-24 rounded-full bg-white/10" />
      </div>
      <Link href="/" aria-label="Sacolinha, página inicial" className="relative">
        <LogoSacolinha variante="branca" tamanho={34} />
      </Link>
      <main className="relative flex w-full max-w-[440px] justify-center rounded-[28px] bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-9 sm:py-10">
        {children}
      </main>
    </div>
  );
}
