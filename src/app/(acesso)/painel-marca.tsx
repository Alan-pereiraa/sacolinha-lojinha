import { IlustracaoPeca } from "@/components/peca";

/** Painel lateral colorido das telas de login/cadastro. */
export function PainelMarca({ titulo, texto }: { titulo: React.ReactNode; texto: string }) {
  return (
    <section className="relative flex min-h-[320px] flex-[1_1_480px] flex-col justify-between gap-10 overflow-hidden bg-deep p-8 text-white sm:p-12">
      <span className="font-elegante text-3xl italic">Sacolinha</span>
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="titulo text-4xl leading-[1.05] sm:text-5xl">{titulo}</h1>
        <p className="text-[17px] leading-relaxed opacity-90">{texto}</p>
      </div>
      <div className="flex items-end gap-4" aria-hidden="true">
        <div className="h-44 w-28 rounded-t-full bg-white/15" />
        <div className="flex h-60 w-28 items-center justify-center rounded-t-full bg-white/25 [--deep:#fff]">
          <IlustracaoPeca categoria="sutias" tamanho={80} />
        </div>
        <div className="h-36 w-28 rounded-t-full bg-white/10" />
      </div>
    </section>
  );
}
