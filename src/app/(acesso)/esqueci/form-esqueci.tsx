"use client";

import Link from "next/link";
import { useActionState } from "react";
import { esqueciSenha } from "../actions";

export function FormEsqueci() {
  const [estado, acao, enviando] = useActionState(esqueciSenha, undefined);
  return (
    <form action={acao} className="flex w-full max-w-md flex-col gap-5">
      <h1 className="titulo text-[28px] leading-tight text-balance sm:text-[30px]">Nova <span className="italic text-deep">senha</span></h1>
      {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}
      {estado?.ok ? (
        <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-ink">{estado.ok}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="rotulo">E-mail</label>
            <input id="email" name="email" type="email" required className="campo" autoComplete="email" />
          </div>
          <button disabled={enviando} className="btn-primario h-14 text-base">
            {enviando ? "Enviando…" : "Enviar link"}
          </button>
        </>
      )}
      <Link href="/login" className="text-center font-bold text-deep">Voltar para entrar</Link>
    </form>
  );
}
