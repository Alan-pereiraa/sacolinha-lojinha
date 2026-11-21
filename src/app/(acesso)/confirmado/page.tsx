import type { Metadata } from "next";
import Link from "next/link";
import { TelaAcesso } from "../painel-marca";
import { IconeCheck } from "@/components/icones";
import { FormReenviar } from "./form-reenviar";

export const metadata: Metadata = { title: "Confirmação de e-mail" };

const SITUACOES = {
  ok: {
    titulo: (
      <>
        E-mail <span className="italic text-deep">confirmado!</span>
      </>
    ),
    texto: "Tudo certo, sua conta está ativa e sua loja já está criada. Agora é só cadastrar os produtos e compartilhar o link da vitrine.",
    botao: { href: "/painel", rotulo: "Ir para o meu painel" },
    sucesso: true,
  },
  entrar: {
    titulo: (
      <>
        E-mail <span className="italic text-deep">confirmado!</span>
      </>
    ),
    texto: "Sua conta está ativa. Como o link foi aberto em outro aparelho ou navegador, entre com seu e-mail e senha para continuar.",
    botao: { href: "/login", rotulo: "Entrar na minha conta" },
    sucesso: true,
  },
  expirado: {
    titulo: (
      <>
        Esse link <span className="italic text-deep">expirou</span>
      </>
    ),
    texto: "O link de confirmação vale por pouco tempo e só pode ser usado uma vez. Se você já confirmou, é só entrar. Se não, peça um link novo.",
    botao: { href: "/login", rotulo: "Entrar na minha conta" },
    sucesso: false,
  },
  "senha-expirada": {
    titulo: (
      <>
        Esse link <span className="italic text-deep">expirou</span>
      </>
    ),
    texto: "O link para criar uma senha nova vale por pouco tempo e só pode ser usado uma vez. Peça outro e use o mais recente.",
    botao: { href: "/esqueci", rotulo: "Pedir um link novo" },
    sucesso: false,
  },
  "senha-outro-aparelho": {
    titulo: (
      <>
        Abra no <span className="italic text-deep">mesmo aparelho</span>
      </>
    ),
    texto: "Por segurança, o link para criar uma senha nova precisa ser aberto no mesmo aparelho e navegador em que você pediu. Peça outro por lá.",
    botao: { href: "/esqueci", rotulo: "Pedir um link novo" },
    sucesso: false,
  },
} as const;

export default async function ConfirmadoPage({ searchParams }: PageProps<"/confirmado">) {
  const { situacao } = await searchParams;
  const chave = (typeof situacao === "string" && situacao in SITUACOES ? situacao : "ok") as keyof typeof SITUACOES;
  const s = SITUACOES[chave];

  return (
    <TelaAcesso>
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <span
          aria-hidden="true"
          className={`flex size-18 items-center justify-center rounded-full ${s.sucesso ? "bg-deep text-white" : "bg-soft text-deep"}`}
        >
          {s.sucesso ? <IconeCheck tamanho={34} /> : <span className="text-3xl font-bold">!</span>}
        </span>
        <h1 className="titulo text-[28px] leading-tight text-balance sm:text-[30px]">{s.titulo}</h1>
        <p className="text-muted">{s.texto}</p>
        <Link href={s.botao.href} className="btn-primario h-13 w-full text-base">
          {s.botao.rotulo}
        </Link>
        {chave === "expirado" && <FormReenviar />}
      </div>
    </TelaAcesso>
  );
}
