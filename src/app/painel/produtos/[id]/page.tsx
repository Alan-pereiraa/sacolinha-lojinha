import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMinhaLoja } from "@/lib/loja";
import type { Produto } from "@/lib/tipos";
import { excluirProduto } from "../../actions";
import { FormProduto } from "../form-produto";

export const metadata: Metadata = { title: "Editar peça" };

export default async function EditarProdutoPage({ params }: PageProps<"/painel/produtos/[id]">) {
  const { id } = await params;
  const { supabase, loja } = await getMinhaLoja();
  const { data } = await supabase.from("produtos").select("*, variantes(*)").eq("id", id).eq("loja_id", loja.id).maybeSingle();
  if (!data) notFound();
  const produto = data as Produto;
  produto.variantes?.sort((a, b) => a.tamanho.localeCompare(b.tamanho, "pt-BR", { numeric: true }));

  return (
    <>
      <h1 className="titulo text-4xl">Editar <span className="italic text-deep">{produto.nome}</span></h1>
      <FormProduto lojaId={loja.id} produto={produto} />
      <details className="cartao">
        <summary className="cursor-pointer font-bold text-deep">Excluir peça</summary>
        <form action={excluirProduto.bind(null, produto.id)} className="mt-3 flex flex-col items-start gap-3">
          <p className="text-sm text-muted">Se a peça já teve vendas, ela só é escondida para manter o histórico.</p>
          <button className="btn-primario">Sim, excluir</button>
        </form>
      </details>
    </>
  );
}
