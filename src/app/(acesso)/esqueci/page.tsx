import type { Metadata } from "next";
import { TelaAcesso } from "../painel-marca";
import { FormEsqueci } from "./form-esqueci";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciPage() {
  return (
    <TelaAcesso>
      <FormEsqueci />
    </TelaAcesso>
  );
}
