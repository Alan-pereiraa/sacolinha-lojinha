import { LogoSacolinha } from "@/components/logo-sacolinha";
import type { Metadata } from "next";
import Link from "next/link";
import { WizardCadastro } from "./wizard";


export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="flex flex-[1_1_380px] flex-col gap-10 bg-soft p-8 sm:p-12">
        <Link href="/login" aria-label="Sacolinha, entrar" className="self-start"><LogoSacolinha tamanho={30} /></Link>
        <div className="flex flex-col gap-3">
          <h1 className="titulo text-4xl leading-[1.05] sm:text-5xl">
            Sua loja de lingerie <span className="italic text-deep">no ar</span> em 3 passos
          </h1>
          <p className="text-muted">Leva uns 3 minutos. Dá para mudar tudo depois.</p>
        </div>
      </aside>
      <section className="flex min-w-0 flex-[999_1_560px] items-center justify-center px-6 py-12">
        <WizardCadastro />
      </section>
    </div>
  );
}
