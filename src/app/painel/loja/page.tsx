import type { Metadata } from "next";
import { getMinhaLoja } from "@/lib/loja";
import { getVitrine } from "@/lib/vitrine";
import Link from "next/link";
import { FormLoja } from "./form-loja";

export const metadata: Metadata = { title: "Minha loja" };

export default async function LojaPage() {
  const { loja } = await getMinhaLoja();
  const produtos = (await getVitrine(loja.id)).slice(0, 8);
  return (
    <>
      <header>
        <h1 className="titulo text-4xl">Sua loja, <span className="italic text-deep">seu jeito</span></h1>
        <p className="text-muted">Cores, textos, seções e redes sociais. Tudo que você muda aparece na prévia ao lado.</p>
      </header>
      <Link href="/painel/divulgar" className="cartao flex items-center justify-between gap-3 lg:hidden">
        <span className="flex flex-col"><strong>Divulgar no WhatsApp</strong><span className="text-sm text-muted">Novidades para o grupo das clientes</span></span>
        <span className="font-bold text-deep">Abrir →</span>
      </Link>
      <FormLoja loja={loja} produtos={produtos} />
    </>
  );
}
