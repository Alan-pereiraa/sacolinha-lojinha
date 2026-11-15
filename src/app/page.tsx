import Link from "next/link";
import { IlustracaoPeca } from "@/components/peca";
import { IconeCaixa, IconeCodigo, IconeMegafone, IconeSacola } from "@/components/icones";

export default function Home() {
  return (
    <div className="min-h-screen bg-blush">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
        <span className="font-elegante text-3xl text-deep italic">Sacolinha</span>
        <nav className="flex gap-2">
          <Link href="/login" className="btn-secundario">Entrar</Link>
          <Link href="/cadastro" className="btn-primario">Criar minha loja</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[1200px] px-6">
        <section className="flex flex-wrap items-end gap-10 overflow-hidden rounded-[40px] bg-soft px-8 pt-14 sm:px-14">
          <div className="flex flex-[1_1_420px] flex-col gap-5 pb-14">
            <span className="text-xs font-bold tracking-[0.16em] text-deep uppercase">Para revendedoras de lingerie</span>
            <h1 className="titulo text-5xl leading-[1.02] sm:text-6xl">
              Sua vitrine, suas vendas e sua sacola <span className="italic text-deep">num lugar só</span>
            </h1>
            <p className="max-w-lg text-lg text-muted">
              Mostre as peças num link bonito, venda bipando a etiqueta e saiba na hora quanto acertar com a revendedora.
            </p>
            <Link href="/cadastro" className="btn-primario h-14 self-start px-8 text-base">Criar minha loja grátis</Link>
          </div>
          <div className="hidden flex-[0_1_360px] items-end justify-center gap-4 sm:flex" aria-hidden="true">
            <div className="flex h-72 w-40 items-center justify-center rounded-t-full bg-petal"><IlustracaoPeca categoria="camisolas" tamanho={120} /></div>
            <div className="flex h-56 w-36 items-center justify-center rounded-t-full bg-white"><IlustracaoPeca categoria="sutias" tamanho={96} /></div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 pb-16">
          {[
            { I: IconeSacola, t: "Vitrine com a sua cara", s: "Escolha cor, letras e formato. A cliente vê as peças e te chama no WhatsApp." },
            { I: IconeCodigo, t: "Bipou, vendeu", s: "Leia o código de barras da etiqueta com a câmera do celular." },
            { I: IconeCaixa, t: "Acerto sem planilha", s: "No fim do ciclo, a lista do que devolver e quanto pagar fica pronta." },
            { I: IconeMegafone, t: "Novidades no grupo", s: "Mande as peças novas para o grupo das clientes com foto e preço." },
          ].map(({ I, t, s }) => (
            <div key={t} className="cartao flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-soft text-deep"><I /></span>
              <h2 className="text-lg font-bold">{t}</h2>
              <p className="text-sm text-muted">{s}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
