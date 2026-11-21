"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { entrar } from "../actions";
import { AvisoConfig } from "@/components/aviso-config";

export function FormLogin({ voltar, erroLink, demo }: { voltar: string; erroLink: boolean; demo?: boolean }) {
  const [estado, acao, enviando] = useActionState(entrar, undefined);
  const [mostrar, setMostrar] = useState(false);

  return (
    <form action={acao} className="flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo text-[28px] leading-tight text-balance sm:text-[30px]">
          Que bom te ver <span className="italic text-deep">de novo</span>
        </h1>
        <p className="text-muted">Entre para cuidar da sua loja.</p>
      </div>

      <AvisoConfig />
      {demo && (
        <p className="rounded-2xl bg-soft px-4 py-3 text-sm text-ink">
          <strong>Demonstração:</strong> digite qualquer e-mail e senha para entrar no painel de exemplo.
        </p>
      )}
      {erroLink && !estado?.erro && (
        <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm text-ink">
          O link expirou ou já foi usado. Entre com sua senha ou peça um link novo.
        </p>
      )}
      {estado?.erro && (
        <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">
          {estado.erro}
        </p>
      )}

      <input type="hidden" name="voltar" value={voltar} />
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" placeholder="voce@email.com" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="senha" className="rotulo">Senha</label>
          <Link href="/esqueci" className="text-sm font-semibold text-deep">Esqueci minha senha</Link>
        </div>
        <div className="flex h-13 items-center rounded-2xl border border-petal bg-white pr-1.5 pl-4 focus-within:border-deep">
          <input
            id="senha"
            name="senha"
            type={mostrar ? "text" : "password"}
            autoComplete="current-password"
            required
            className="flex-1 bg-transparent text-[15px] outline-none"
            placeholder="Sua senha"
          />
          <button
            type="button"
            onClick={() => setMostrar((m) => !m)}
            className="h-10 rounded-xl px-3 text-sm font-semibold text-muted"
          >
            {mostrar ? "Esconder" : "Mostrar"}
          </button>
        </div>
      </div>

      <button type="submit" disabled={enviando} className="btn-primario h-14 text-base">
        {enviando ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-muted">
        Ainda não tem sua loja?{" "}
        <Link href="/cadastro" className="font-bold text-deep">Criar conta grátis</Link>
      </p>
    </form>
  );
}
