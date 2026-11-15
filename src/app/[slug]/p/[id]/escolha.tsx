"use client";

import { useState } from "react";
import { FotoPeca } from "@/components/peca";
import { IconeChat } from "@/components/icones";
import { linkWhatsApp } from "@/lib/formatar";

export function Galeria({ fotos, categoria, nome, formato }: { fotos: string[]; categoria: string; nome: string; formato: string }) {
  const [atual, setAtual] = useState(0);
  return (
    <section aria-label="Fotos" className="flex min-w-0 flex-[1_1_460px] gap-4">
      {fotos.length > 1 && (
        <div className="flex flex-col gap-3">
          {fotos.map((f, i) => (
            <button
              key={f}
              aria-label={`Foto ${i + 1}`}
              aria-pressed={i === atual}
              onClick={() => setAtual(i)}
              className={`h-26 w-21 overflow-hidden rounded-t-full rounded-b-xl border-2 ${i === atual ? "border-deep" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <FotoPeca foto={fotos[atual]} categoria={categoria} alt={nome} className={`aspect-[3/4] max-h-[640px] min-w-0 flex-1 ${formato}`} tamanhoIlustracao={260} />
    </section>
  );
}

export function EscolhaPeca({
  tamanhos,
  whatsapp,
  nome,
  preco,
  caminho,
}: {
  tamanhos: { tamanho: string; disponivel: boolean }[];
  whatsapp: string | null;
  nome: string;
  preco: string;
  caminho: string;
}) {
  const primeiro = tamanhos.find((t) => t.disponivel)?.tamanho ?? null;
  const [tamanho, setTamanho] = useState<string | null>(primeiro);
  const url = typeof window !== "undefined" ? window.location.origin + caminho : caminho;

  const msgQuero = `Oi! Quero ${nome}${tamanho ? `, tamanho ${tamanho}` : ""} (${preco}). ${url}`;
  const msgReserva = `Oi! Pode reservar ${nome}${tamanho ? ` no tamanho ${tamanho}` : ""} para mim? ${url}`;
  const linkQuero = linkWhatsApp(whatsapp, msgQuero);
  const linkReserva = linkWhatsApp(whatsapp, msgReserva);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <span className="font-bold">Tamanho</span>
        <div className="flex flex-wrap gap-2.5">
          {tamanhos.map((t) => (
            <button
              key={t.tamanho}
              disabled={!t.disponivel}
              aria-pressed={t.tamanho === tamanho}
              onClick={() => setTamanho(t.tamanho)}
              className={`h-13 min-w-16 rounded-2xl border-[1.5px] px-3 font-bold ${
                !t.disponivel
                  ? "border-petal text-muted line-through"
                  : t.tamanho === tamanho
                    ? "border-deep bg-deep text-white"
                    : "border-petal bg-white"
              }`}
            >
              {t.tamanho}
            </button>
          ))}
        </div>
        {tamanhos.some((t) => !t.disponivel) && <span className="text-[13px] text-muted">Riscado = esgotado</span>}
      </div>
      {linkQuero && linkReserva && (
        <div className="flex flex-col gap-2.5">
          <a href={linkQuero} target="_blank" rel="noopener" className="btn-primario h-15 text-[17px]" suppressHydrationWarning>
            <IconeChat /> Quero essa! Chamar no WhatsApp
          </a>
          <a href={linkReserva} target="_blank" rel="noopener" className="btn-suave h-13" suppressHydrationWarning>
            Reservar por 24h
          </a>
        </div>
      )}
    </div>
  );
}
