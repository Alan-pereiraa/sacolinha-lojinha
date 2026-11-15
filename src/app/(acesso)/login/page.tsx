import type { Metadata } from "next";
import { PainelMarca } from "../painel-marca";
import { FormLogin } from "./form-login";
import { MODO_DEMO } from "@/lib/demo";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const voltar = typeof sp.voltar === "string" ? sp.voltar : "";
  const erroLink = sp.erro === "link";

  return (
    <div className="flex min-h-screen flex-wrap">
      <PainelMarca
        titulo={<>Sua sacola, suas clientes, <span className="italic">suas vendas.</span></>}
        texto="Monte sua vitrine de lingerie, registre cada venda e saiba quanto acertar com a revendedora no fim do ciclo."
      />
      <section className="flex flex-[1_1_480px] items-center justify-center px-6 py-12">
        <FormLogin voltar={voltar} erroLink={erroLink} demo={MODO_DEMO} />
      </section>
    </div>
  );
}
