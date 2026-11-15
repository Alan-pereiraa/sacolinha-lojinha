"use client";

import { useActionState } from "react";
import { trocarSenha } from "../actions";

export function FormSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, undefined);
  return (
    <form action={acao} className="cartao flex max-w-md flex-col gap-4">
      {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}
      {estado?.ok && <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.ok}</p>}
      <div className="flex flex-col gap-2">
        <label htmlFor="senha" className="rotulo">Senha nova</label>
        <input id="senha" name="senha" type="password" minLength={8} required autoComplete="new-password" className="campo" />
      </div>
      <button disabled={enviando} className="btn-primario">{enviando ? "Salvando…" : "Salvar senha"}</button>
    </form>
  );
}
