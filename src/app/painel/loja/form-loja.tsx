"use client";

import { useActionState, useState } from "react";
import { salvarLoja } from "../actions";
import { enviarFoto } from "@/lib/upload";
import { FONTES, FORMATOS, TEMAS, estiloDoTema, type FonteId, type FormatoId, type TemaId } from "@/lib/temas";
import type { Loja } from "@/lib/tipos";
import { IlustracaoPeca } from "@/components/peca";
import { IconeUpload } from "@/components/icones";

export function FormLoja({ loja }: { loja: Loja }) {
  const [estado, acao, salvando] = useActionState(salvarLoja, undefined);
  const [nome, setNome] = useState(loja.nome);
  const [tema, setTema] = useState<TemaId>(loja.tema as TemaId);
  const [fonte, setFonte] = useState<FonteId>(loja.fonte as FonteId);
  const [formato, setFormato] = useState<FormatoId>(loja.formato as FormatoId);
  const [logo, setLogo] = useState(loja.logo_url ?? "");
  const [capa, setCapa] = useState(loja.capa_url ?? "");
  const [enviando, setEnviando] = useState<"" | "logo" | "capa">("");
  const [copiado, setCopiado] = useState(false);
  const link = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/${loja.slug}`;

  async function subir(arq: File | undefined, tipo: "logo" | "capa") {
    if (!arq) return;
    setEnviando(tipo);
    try {
      const url = await enviarFoto(arq, loja.id, "marca");
      if (tipo === "logo") setLogo(url);
      else setCapa(url);
    } finally {
      setEnviando("");
    }
  }

  const classeFonte = FONTES[fonte].classe;

  return (
    <form action={acao} className="flex flex-wrap items-start gap-6">
      <input type="hidden" name="tema" value={tema} />
      <input type="hidden" name="fonte" value={fonte} />
      <input type="hidden" name="formato" value={formato} />
      <input type="hidden" name="logo_url" value={logo} />
      <input type="hidden" name="capa_url" value={capa} />

      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
        {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}
        {estado?.ok && <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.ok}</p>}

        <section className="cartao flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="nome" className="rotulo">Nome da loja</label>
            <input id="nome" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} required className="campo" />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-[1_1_200px] flex-col gap-2">
              <label htmlFor="whatsapp" className="rotulo">WhatsApp da loja</label>
              <input id="whatsapp" name="whatsapp" defaultValue={loja.whatsapp ?? ""} required inputMode="tel" className="campo" />
            </div>
            <div className="flex flex-[1_1_200px] flex-col gap-2">
              <label htmlFor="cidade" className="rotulo">Cidade</label>
              <input id="cidade" name="cidade" defaultValue={loja.cidade ?? ""} className="campo" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-soft px-3.5 py-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{link}</span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/${loja.slug}`);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="h-9 rounded-full bg-white px-3.5 text-[13px] font-bold text-deep"
            >
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {(["logo", "capa"] as const).map((tipo) => (
              <label key={tipo} className="flex h-22 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-deep text-[13px] font-bold text-deep">
                <IconeUpload />
                {enviando === tipo ? "Enviando…" : tipo === "logo" ? (logo ? "Trocar logo" : "Enviar logo") : capa ? "Trocar capa" : "Foto de capa"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => subir(e.target.files?.[0], tipo)} />
              </label>
            ))}
          </div>
        </section>

        <section className="cartao flex flex-col gap-3">
          <span className="rotulo">Cor da loja</span>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(TEMAS) as TemaId[]).map((t) => (
              <button key={t} type="button" aria-pressed={t === tema} onClick={() => setTema(t)} className="flex min-w-15 flex-col items-center gap-1.5 text-[13px] font-semibold">
                <span
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: TEMAS[t].cores.petal, boxShadow: t === tema ? `0 0 0 3px #fff, 0 0 0 5px ${TEMAS[t].cores.deep}` : "none" }}
                >
                  <span className="size-5.5 rounded-full" style={{ background: TEMAS[t].cores.deep }} />
                </span>
                {TEMAS[t].nome}
              </button>
            ))}
          </div>
        </section>

        <section className="cartao flex flex-col gap-3">
          <span className="rotulo">Estilo das letras</span>
          {(Object.keys(FONTES) as FonteId[]).map((f) => (
            <button key={f} type="button" aria-pressed={f === fonte} onClick={() => setFonte(f)} className={`flex h-14 items-center justify-between rounded-[18px] border-[1.5px] px-4.5 ${f === fonte ? "border-deep bg-soft" : "border-petal bg-white"}`}>
              <span className={`text-[22px] ${FONTES[f].classe}`}>Aa {nome.split(" ")[0] || "Loja"}</span>
              <span className="text-[13px] font-semibold text-muted">{FONTES[f].nome}</span>
            </button>
          ))}
        </section>

        <section className="cartao flex flex-col gap-3">
          <span className="rotulo">Formato das fotos</span>
          <div className="grid grid-cols-3 gap-2.5">
            {(Object.keys(FORMATOS) as FormatoId[]).map((f) => (
              <button key={f} type="button" aria-pressed={f === formato} onClick={() => setFormato(f)} className={`flex h-24 flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] text-[13px] font-semibold ${f === formato ? "border-deep bg-soft" : "border-petal bg-white"}`}>
                <span className={`h-11 w-9 bg-petal ${FORMATOS[f].mini}`} />
                {FORMATOS[f].nome}
              </button>
            ))}
          </div>
        </section>

        <button disabled={salvando || !!enviando} className="btn-primario h-14 text-base">{salvando ? "Salvando…" : "Salvar e publicar"}</button>
      </div>

      {/* Prévia ao vivo */}
      <section aria-label="Prévia da vitrine" style={estiloDoTema(tema)} className="min-w-0 flex-[2_1_440px] overflow-hidden rounded-[28px] border border-petal bg-white lg:sticky lg:top-6">
        <div className="flex items-center gap-2 border-b border-soft px-4 py-3">
          <span className="size-2.5 rounded-full bg-petal" /><span className="size-2.5 rounded-full bg-petal" /><span className="size-2.5 rounded-full bg-petal" />
          <span className="ml-2 flex h-7 flex-1 items-center truncate rounded-full bg-blush px-3.5 text-xs text-muted">{link}</span>
        </div>
        <div className="flex flex-col gap-4 bg-blush p-5 text-ink">
          <div className="flex items-center gap-2.5">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <span className={`flex size-10 items-center justify-center rounded-full bg-deep text-lg text-white ${classeFonte}`}>{nome.trim()[0]?.toUpperCase()}</span>
            )}
            <span className={`text-[22px] ${classeFonte}`}>{nome || "Sua loja"}</span>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-soft p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {capa && <img src={capa} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
            <div className="relative flex flex-col gap-2.5">
              <span className="text-[11px] font-bold tracking-[0.14em] text-deep uppercase">Coleção nova</span>
              <span className={`text-3xl leading-tight ${classeFonte} not-italic`}>Renda, cetim e <span className="italic text-deep">você</span></span>
              <span className="self-start rounded-full bg-deep px-4 py-2 text-xs font-bold text-white">Ver a coleção</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {["sutias", "calcinhas", "bodies", "camisolas"].map((c, i) => (
              <div key={c} className={`flex h-32 items-center justify-center ${i % 2 ? "bg-petal" : "bg-soft"} ${FORMATOS[formato].foto}`}>
                <IlustracaoPeca categoria={c} tamanho={52} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </form>
  );
}
