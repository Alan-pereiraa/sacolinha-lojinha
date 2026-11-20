import type { Metadata } from "next";
import Link from "next/link";
import { getMinhaLoja, getSacolasAbertas } from "@/lib/loja";
import { nomeDaSacola } from "@/lib/tipos";
import { CaixaVenda } from "./caixa";
import { hojeBrasil } from "@/lib/cobranca";

export const metadata: Metadata = { title: "Vender" };

export default async function VenderPage() {
  const { loja } = await getMinhaLoja();
  const sacolas = await getSacolasAbertas(loja.id);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="titulo text-4xl">Bipou, <span className="italic text-deep">vendeu</span></h1>
        <p className="text-muted">Aponte a câmera para o código de barras da etiqueta, ou use um leitor USB no campo de código.</p>
      </header>
      {sacolas.length === 0 && (
        <p className="rounded-2xl bg-soft px-4 py-3 text-sm">
          Você não tem sacola aberta. As vendas ficam registradas, mas não entram no acerto.{" "}
          <Link href="/painel/sacola" className="font-bold text-deep">Abrir sacola</Link>
        </p>
      )}
      <CaixaVenda
        sacolas={sacolas.map((s) => ({ nome: nomeDaSacola(s), devolverAte: s.devolver_ate }))}
        hoje={hojeBrasil()}
      />
    </>
  );
}
