"use client";

import { useActionState } from "react";
import { reenviarConfirmacao } from "../actions";

export function FormReenviar() {
  const [estado, acao, enviando] = useActionState(reenviarConfirmacao, undefined);
  return (
    <form action={acao} className="flex w-full flex-col gap-2 border-t border-soft pt-5 text-left">
      <label htmlFor="email-reenviar" className="rotulo">Receber um link novo</label>
      <div className="flex gap-2">
        <input id="email-reenviar" name="email" type="email" required placeholder="voce@email.com" autoComplete="email" className="campo min-w-0 flex-1" />
        <button disabled={enviando} className="btn-secundario shrink-0">{enviando ? "Enviando…" : "Enviar"}</button>
      </div>
      {(estado?.ok || estado?.erro) && (
        <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.ok ?? estado.erro}</p>
      )}
    </form>
  );
}
