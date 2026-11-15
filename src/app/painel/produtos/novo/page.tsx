import type { Metadata } from "next";
import { getMinhaLoja } from "@/lib/loja";
import { FormProduto } from "../form-produto";

export const metadata: Metadata = { title: "Cadastrar peça" };

export default async function NovoProdutoPage({ searchParams }: PageProps<"/painel/produtos/novo">) {
  const { codigo } = await searchParams;
  const { loja } = await getMinhaLoja();
  return (
    <>
      <h1 className="titulo text-4xl">Cadastrar <span className="italic text-deep">peça</span></h1>
      <FormProduto lojaId={loja.id} codigoInicial={typeof codigo === "string" ? codigo : undefined} />
    </>
  );
}
