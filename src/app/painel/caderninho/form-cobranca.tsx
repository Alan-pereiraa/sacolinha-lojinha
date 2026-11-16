"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { MENSAGEM_PADRAO, VARIAVEIS_MENSAGEM, montarMensagem } from "@/lib/cobranca";
import { salvarCobranca } from "../actions";

type Config = {
  nome: string;
  cobranca_ativa: boolean;
  cobranca_dias_antes: number;
  cobranca_repetir_dias: number;
  cobranca_max_atraso: number;
  cobranca_mensagem: string;
  chave_pix: string;
};

export function FormCobranca({ loja, whatsConectado, hoje }: { loja: Config; whatsConectado: boolean; hoje: string }) {
  const [estado, acao, salvando] = useActionState(salvarCobranca, undefined);
  const [mensagem, setMensagem] = useState(loja.cobranca_mensagem || MENSAGEM_PADRAO);
  const [pix, setPix] = useState(loja.chave_pix);
  const [diasAntes, setDiasAntes] = useState(loja.cobranca_dias_antes);

  const exemploVenc = (() => {
    const d = new Date(hoje + "T12:00:00");
    d.setDate(d.getDate() + Math.max(diasAntes, 1));
    return d.toISOString().slice(0, 10);
  })();
  const previa = montarMensagem(mensagem, { nome: "Juliana", loja: loja.nome, numero: 1, total: 3, valor: 33.3, venceEm: exemploVenc, chavePix: pix }, hoje);

  return (
    <form action={acao} className="cartao flex flex-col gap-4">
      <div>
        <h2 className="titulo text-2xl">Lembretes no <span className="italic text-deep">WhatsApp</span></h2>
        <p className="text-sm text-muted">Saem todo dia por volta das 9h, só para vendas com WhatsApp e lembretes ligados.</p>
      </div>

      {!whatsConectado && (
        <p className="rounded-2xl bg-[#FFF1D6] px-3.5 py-3 text-[13px] text-[#5C3A00]">
          O WhatsApp da loja ainda não está conectado, então os lembretes automáticos não saem. Enquanto isso, use “Abrir no WhatsApp” em cada parcela.{" "}
          <Link href="/painel/divulgar" className="font-bold underline">Conectar</Link>
        </p>
      )}
      {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-3.5 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}
      {estado?.ok && <p role="status" className="rounded-2xl bg-soft px-3.5 py-3 text-sm font-semibold text-deep">{estado.ok}</p>}

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-blush px-4 py-3">
        <span className="font-semibold">Cobrança automática</span>
        <input type="checkbox" name="cobranca_ativa" defaultChecked={loja.cobranca_ativa} className="size-6 accent-[var(--deep)]" />
      </label>

      <div className="grid grid-cols-1 gap-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Avisar quantos dias <strong>antes</strong></span>
          <select name="cobranca_dias_antes" value={diasAntes} onChange={(e) => setDiasAntes(Number(e.target.value))} className="campo h-11 w-28 px-3">
            <option value={0}>não avisar</option>
            {[1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n} {n === 1 ? "dia" : "dias"}</option>)}
          </select>
        </label>
        <p className="-mt-1 text-[13px] text-muted">E sempre no próprio dia do vencimento.</p>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Se atrasar, repetir a cada</span>
          <select name="cobranca_repetir_dias" defaultValue={loja.cobranca_repetir_dias} className="campo h-11 w-28 px-3">
            {[1, 2, 3, 5, 7, 15].map((n) => <option key={n} value={n}>{n} {n === 1 ? "dia" : "dias"}</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Máximo de lembretes depois de vencida</span>
          <select name="cobranca_max_atraso" defaultValue={loja.cobranca_max_atraso} className="campo h-11 w-28 px-3">
            {[0, 1, 2, 3, 5].map((n) => <option key={n} value={n}>{n === 0 ? "nenhum" : n}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="chave_pix" className="rotulo">Sua chave Pix (vai na mensagem)</label>
        <input id="chave_pix" name="chave_pix" value={pix} onChange={(e) => setPix(e.target.value)} maxLength={120} className="campo" placeholder="CPF, e-mail, celular ou chave aleatória" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cobranca_mensagem" className="rotulo">Mensagem</label>
        <textarea id="cobranca_mensagem" name="cobranca_mensagem" rows={5} maxLength={700} value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="campo h-auto py-3 text-sm" />
        <p className="text-[12px] text-muted">
          Use: {VARIAVEIS_MENSAGEM.join(" ")}.{" "}
          <button type="button" onClick={() => setMensagem(MENSAGEM_PADRAO)} className="font-semibold text-deep underline">Voltar ao padrão</button>
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-[20px] bg-[#E7DDD3] p-3">
        <span className="text-[11px] font-bold tracking-widest text-[#5C4A3D] uppercase">Prévia</span>
        <p className="self-end rounded-2xl rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[14px] whitespace-pre-line text-[#111B21] shadow-sm">{previa}</p>
      </div>

      <button disabled={salvando} className="btn-primario">{salvando ? "Salvando…" : "Salvar lembretes"}</button>
    </form>
  );
}
