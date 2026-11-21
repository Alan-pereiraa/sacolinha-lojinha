"use client";

import { useActionState, useState } from "react";
import { abrirSacola } from "../actions";
import type { Fornecedora } from "@/lib/tipos";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function FormNovaSacola({ empresas }: { empresas: Fornecedora[] }) {
  const [estado, acao, enviando] = useActionState(abrirSacola, undefined);
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "nova");
  const empresa = empresas.find((e) => e.id === empresaId);
  const [dias, setDias] = useState(String(empresa?.prazo_dias ?? 60));
  const [percentual, setPercentual] = useState(String(empresa?.percentual_lucro ?? 30));
  const hoje = new Date();

  function escolher(id: string) {
    setEmpresaId(id);
    const e = empresas.find((x) => x.id === id);
    if (e) {
      setDias(String(e.prazo_dias));
      setPercentual(String(e.percentual_lucro));
    }
  }

  const prazos = ["30", "45", "60", "90"];
  if (!prazos.includes(dias)) prazos.push(dias);

  return (
    <form action={acao} className="cartao flex max-w-2xl flex-col gap-4">
      {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}

      <fieldset className="flex flex-col gap-2">
        <legend className="rotulo mb-2">De qual empresa é a sacola?</legend>
        <input type="hidden" name="fornecedora_id" value={empresaId} />
        <div className="flex flex-wrap gap-2">
          {empresas.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={e.id === empresaId}
              onClick={() => escolher(e.id)}
              className={`rounded-full border-[1.5px] px-4 py-2.5 text-sm font-bold ${e.id === empresaId ? "border-deep bg-deep text-white" : "border-petal bg-white"}`}
            >
              {e.nome}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={empresaId === "nova"}
            onClick={() => escolher("nova")}
            className={`rounded-full border-[1.5px] border-dashed px-4 py-2.5 text-sm font-bold ${empresaId === "nova" ? "border-deep bg-soft text-deep" : "border-petal text-deep"}`}
          >
            + Outra empresa
          </button>
        </div>
        {empresaId === "nova" && (
          <div className="mt-2 flex flex-col gap-2">
            <label htmlFor="nova_empresa" className="rotulo">Nome da empresa</label>
            <input id="nova_empresa" name="nova_empresa" required maxLength={60} placeholder="Ex.: Bella Modas" className="campo" />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="nome" className="rotulo">Nome da sacola</label>
        <input id="nome" name="nome" required className="campo" defaultValue={`Sacola de ${MESES[hoje.getMonth()]}`} />
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_200px] flex-col gap-2">
          <label htmlFor="recebida_em" className="rotulo">Recebi em</label>
          <input id="recebida_em" name="recebida_em" type="date" required className="campo" defaultValue={hoje.toISOString().slice(0, 10)} />
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-2">
          <label htmlFor="dias" className="rotulo">Prazo para devolver</label>
          <select id="dias" name="dias" value={dias} onChange={(e) => setDias(e.target.value)} className="campo">
            {prazos.map((p) => (
              <option key={p} value={p}>{p} dias</option>
            ))}
          </select>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-2">
          <label htmlFor="percentual_lucro" className="rotulo">Seu lucro (%)</label>
          <input
            id="percentual_lucro"
            name="percentual_lucro"
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className="campo"
          />
        </div>
      </div>
      <button disabled={enviando} className="btn-primario self-start">{enviando ? "Abrindo…" : "Abrir sacola"}</button>
    </form>
  );
}
