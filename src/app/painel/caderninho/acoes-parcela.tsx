"use client";

import { useState, useTransition } from "react";
import { brl } from "@/lib/formatar";
import type { StatusParcela } from "@/lib/cobranca";
import { IconeChat, IconeCheck } from "@/components/icones";
import { cobrarAgora, desfazerRecebimento, mudarVencimento, receberParcela } from "../actions";

const ROTULO: Record<StatusParcela, { texto: string; classe: string }> = {
  paga: { texto: "Recebida", classe: "bg-soft text-deep" },
  atrasada: { texto: "Atrasada", classe: "bg-[#FFF1D6] text-[#9A3412]" },
  hoje: { texto: "Vence hoje", classe: "bg-deep text-white" },
  proxima: { texto: "Vence logo", classe: "bg-petal text-ink" },
  futura: { texto: "A vencer", classe: "bg-blush text-muted" },
};

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

export function AcoesParcela({
  parcela,
  status,
  linkWhats,
  podeEnviarDireto,
  hoje,
}: {
  parcela: { id: string; numero: number; total: number; valor: number; venceEm: string; pagoEm: string | null; lembretes: number; ultimoLembrete: string | null };
  status: StatusParcela;
  linkWhats: string | null;
  podeEnviarDireto: boolean;
  hoje: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [editando, setEditando] = useState(false);
  const [novaData, setNovaData] = useState(parcela.venceEm);
  const r = ROTULO[status];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="font-semibold">{parcela.total > 1 ? `Parcela ${parcela.numero}/${parcela.total}` : "Parcela única"}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${r.classe}`}>{r.texto}</span>
        <span className="ml-auto font-bold">{brl(parcela.valor)}</span>
      </div>
      <p className="text-[13px] text-muted">
        {parcela.pagoEm
          ? `Recebida em ${br(parcela.pagoEm.slice(0, 10))}`
          : `${status === "atrasada" ? "Venceu" : "Vence"} em ${br(parcela.venceEm)}`}
        {parcela.lembretes > 0 && !parcela.pagoEm && ` · ${parcela.lembretes} ${parcela.lembretes === 1 ? "lembrete enviado" : "lembretes enviados"}${parcela.ultimoLembrete ? `, último em ${br(parcela.ultimoLembrete)}` : ""}`}
      </p>

      {parcela.pagoEm ? (
        <button
          disabled={pendente}
          onClick={() => iniciar(async () => { await desfazerRecebimento(parcela.id); })}
          className="self-start text-[13px] font-semibold text-muted underline"
        >
          Desfazer recebimento
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={pendente}
            onClick={() => iniciar(async () => { await receberParcela(parcela.id); })}
            className="btn h-10 bg-deep px-4 text-sm text-white"
          >
            <IconeCheck tamanho={16} /> Recebi
          </button>
          {podeEnviarDireto && (
            <button
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r2 = await cobrarAgora(parcela.id);
                  setAviso(r2.erro ? { ok: false, texto: r2.erro } : { ok: true, texto: r2.ok ?? "Enviado!" });
                })
              }
              className="btn h-10 bg-soft px-4 text-sm text-deep"
            >
              <IconeChat tamanho={16} /> {pendente ? "Enviando…" : "Cobrar agora"}
            </button>
          )}
          {linkWhats && (
            <a href={linkWhats} target="_blank" rel="noopener" className="btn h-10 border border-petal bg-white px-4 text-sm text-ink">
              Abrir no WhatsApp
            </a>
          )}
          <button onClick={() => setEditando((e) => !e)} className="btn h-10 px-3 text-sm text-muted">
            Mudar data
          </button>
        </div>
      )}

      {editando && !parcela.pagoEm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r2 = await mudarVencimento(parcela.id, novaData);
              if (r2.erro) setAviso({ ok: false, texto: r2.erro });
              else setEditando(false);
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <label htmlFor={`venc-${parcela.id}`} className="text-sm">Novo vencimento</label>
          <input id={`venc-${parcela.id}`} type="date" min={hoje} value={novaData} onChange={(e) => setNovaData(e.target.value)} className="campo h-10 w-auto px-3" />
          <button disabled={pendente} className="btn h-10 bg-deep px-4 text-sm text-white">Salvar</button>
        </form>
      )}

      {aviso && (
        <p role="status" className={`rounded-xl px-3 py-2 text-[13px] font-semibold ${aviso.ok ? "bg-soft text-deep" : "bg-[#FFF1D6] text-[#7A4A00]"}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
