"use client";

import { useActionState } from "react";
import { abrirSacola } from "../actions";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function FormNovaSacola() {
  const [estado, acao, enviando] = useActionState(abrirSacola, undefined);
  const hoje = new Date();
  return (
    <form action={acao} className="cartao flex max-w-2xl flex-col gap-4">
      {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}
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
          <select id="dias" name="dias" defaultValue="60" className="campo">
            <option value="30">30 dias</option>
            <option value="60">60 dias</option>
            <option value="90">90 dias</option>
          </select>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-2">
          <label htmlFor="percentual_lucro" className="rotulo">Seu lucro (%)</label>
          <input id="percentual_lucro" name="percentual_lucro" type="number" min={0} max={100} step="0.5" defaultValue={30} className="campo" />
        </div>
      </div>
      <button disabled={enviando} className="btn-primario self-start">{enviando ? "Abrindo…" : "Abrir sacola"}</button>
    </form>
  );
}
