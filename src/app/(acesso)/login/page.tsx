import type { Metadata } from "next";
import { TelaAcesso } from "../painel-marca";
import { FormLogin } from "./form-login";
import { MODO_DEMO } from "@/lib/demo";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const voltar = typeof sp.voltar === "string" ? sp.voltar : "";
  const erroLink = sp.erro === "link";

  return (
    <TelaAcesso>
      <FormLogin voltar={voltar} erroLink={erroLink} demo={MODO_DEMO} />
    </TelaAcesso>
  );
}
