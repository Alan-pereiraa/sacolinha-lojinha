import type { Metadata } from "next";
import { PainelMarca } from "../painel-marca";
import { FormEsqueci } from "./form-esqueci";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciPage() {
  return (
    <div className="flex min-h-screen flex-wrap">
      <PainelMarca
        titulo={<>Acontece com <span className="italic">todo mundo.</span></>}
        texto="Informe o e-mail da sua conta e enviamos um link para você criar uma senha nova."
      />
      <section className="flex flex-[1_1_480px] items-center justify-center px-6 py-12">
        <FormEsqueci />
      </section>
    </div>
  );
}
