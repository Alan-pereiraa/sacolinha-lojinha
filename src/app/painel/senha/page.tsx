import type { Metadata } from "next";
import { FormSenha } from "./form-senha";

export const metadata: Metadata = { title: "Nova senha" };

export default function SenhaPage() {
  return (
    <>
      <h1 className="titulo text-4xl">Criar <span className="italic text-deep">senha nova</span></h1>
      <FormSenha />
    </>
  );
}
