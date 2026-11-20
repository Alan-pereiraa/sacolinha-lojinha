"use client";

import { useActionState } from "react";
import { salvarEmpresa } from "../actions";
import type { Fornecedora } from "@/lib/tipos";

function LinhaEmpresa({ empresa }: { empresa: Fornecedora }) {
  const [estado, acao, salvando] = useActionState(salvarEmpresa, undefined);
  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 border-t border-soft pt-3 first:border-0 first:pt-0">
      <input type="hidden" name="id" value={empresa.id} />
      <div className="flex flex-[2_1_180px] flex-col gap-1.5">
        <label htmlFor={`emp-n-${empresa.id}`} className="text-[13px] font-semibold">Nome</label>
        <input id={`emp-n-${empresa.id}`} name="nome" defaultValue={empresa.nome} maxLength={60} required className="campo h-11" />
      </div>
      <div className="flex w-28 flex-col gap-1.5">
        <label htmlFor={`emp-p-${empresa.id}`} className="text-[13px] font-semibold">Lucro (%)</label>
        <input id={`emp-p-${empresa.id}`} name="percentual_lucro" type="number" min={0} max={100} step="0.5" defaultValue={Number(empresa.percentual_lucro)} className="campo h-11" />
      </div>
      <div className="flex w-28 flex-col gap-1.5">
        <label htmlFor={`emp-d-${empresa.id}`} className="text-[13px] font-semibold">Prazo (dias)</label>
        <input id={`emp-d-${empresa.id}`} name="prazo_dias" type="number" min={7} max={180} defaultValue={empresa.prazo_dias} className="campo h-11" />
      </div>
      <button disabled={salvando} className="btn-secundario h-11">{salvando ? "Salvando…" : "Salvar"}</button>
      {(estado?.erro || estado?.ok) && (
        <p role="status" className="w-full text-[13px] font-semibold text-deep">{estado.erro ?? estado.ok}</p>
      )}
    </form>
  );
}

export function Empresas({ empresas }: { empresas: Fornecedora[] }) {
  if (empresas.length === 0) return null;
  return (
    <details className="cartao">
      <summary className="cursor-pointer font-bold">Empresas que te passam sacola ({empresas.length})</summary>
      <p className="mt-2 text-[13px] text-muted">O lucro e o prazo daqui viram o padrão quando você abre uma sacola nova da empresa.</p>
      <div className="mt-4 flex flex-col gap-3">
        {empresas.map((e) => <LinhaEmpresa key={e.id} empresa={e} />)}
      </div>
    </details>
  );
}
