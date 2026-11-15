import type { Metadata } from "next";
import { getMinhaLoja } from "@/lib/loja";
import { FormLoja } from "./form-loja";

export const metadata: Metadata = { title: "Minha loja" };

export default async function LojaPage() {
  const { loja } = await getMinhaLoja();
  return (
    <>
      <header>
        <h1 className="titulo text-4xl">Sua loja, <span className="italic text-deep">seu jeito</span></h1>
        <p className="text-muted">Tudo que você muda aparece na prévia.</p>
      </header>
      <FormLoja loja={loja} />
    </>
  );
}
