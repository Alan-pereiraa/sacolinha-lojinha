"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { salvarLoja } from "../actions";
import { enviarFoto } from "@/lib/upload";
import {
  COR_VALIDA,
  FONTES,
  FORMATOS,
  TEMAS,
  contrasteComBranco,
  estiloDoTema,
  type FonteId,
  type FormatoId,
  type TemaId,
} from "@/lib/temas";
import { SECOES_INFO, TEXTOS_PADRAO, VANTAGENS_PADRAO, conteudoDaLoja } from "@/lib/conteudo";
import type { Loja, Produto, Secao, Vantagem } from "@/lib/tipos";
import { linkWhatsApp } from "@/lib/formatar";
import { AvisoTopo, RedesSociais, SecoesDaVitrine } from "@/components/vitrine/secoes";
import { IconeUpload } from "@/components/icones";

const LARGURA_PREVIA = 1240;

type Textos = {
  aviso_topo: string;
  destaque_etiqueta: string;
  destaque_titulo: string;
  destaque_texto: string;
  destaque_botao: string;
  novidades_titulo: string;
  sobre_titulo: string;
  sobre_texto: string;
  contato_texto: string;
};

const CAMPOS_TEXTO: { chave: keyof Textos; rotulo: string; max: number; multilinha?: boolean; dica?: string }[] = [
  { chave: "aviso_topo", rotulo: "Faixa do topo", max: 140, dica: "Deixe vazio para tirar a faixa." },
  { chave: "destaque_etiqueta", rotulo: "Destaque · etiqueta", max: 40 },
  { chave: "destaque_titulo", rotulo: "Destaque · título", max: 90 },
  { chave: "destaque_texto", rotulo: "Destaque · texto", max: 240, multilinha: true },
  { chave: "destaque_botao", rotulo: "Destaque · botão", max: 30 },
  { chave: "novidades_titulo", rotulo: "Título das peças", max: 60 },
  { chave: "sobre_titulo", rotulo: "Sobre mim · título", max: 60 },
  { chave: "sobre_texto", rotulo: "Sobre mim · texto", max: 1200, multilinha: true, dica: "A seção só aparece com texto." },
  { chave: "contato_texto", rotulo: "Faixa do WhatsApp · texto", max: 160 },
];

function Grupo({ titulo, children, aberto = false }: { titulo: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details open={aberto} className="cartao group">
      <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
        {titulo}
        <span className="text-deep transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}

export function FormLoja({ loja, produtos }: { loja: Loja; produtos: Produto[] }) {
  const [estado, acao, salvando] = useActionState(salvarLoja, undefined);
  const [nome, setNome] = useState(loja.nome);
  const [tema, setTema] = useState<TemaId>(loja.tema as TemaId);
  const [cor, setCor] = useState(loja.cor_personalizada ?? "");
  const [fonte, setFonte] = useState<FonteId>(loja.fonte as FonteId);
  const [formato, setFormato] = useState<FormatoId>(loja.formato as FormatoId);
  const [logo, setLogo] = useState(loja.logo_url ?? "");
  const [capa, setCapa] = useState(loja.capa_url ?? "");
  const [instagram, setInstagram] = useState(loja.instagram ?? "");
  const [tiktok, setTiktok] = useState(loja.tiktok ?? "");
  const [textos, setTextos] = useState<Textos>({
    aviso_topo: loja.aviso_topo ?? TEXTOS_PADRAO.aviso_topo,
    destaque_etiqueta: loja.destaque_etiqueta ?? "",
    destaque_titulo: loja.destaque_titulo ?? "",
    destaque_texto: loja.destaque_texto ?? "",
    destaque_botao: loja.destaque_botao ?? "",
    novidades_titulo: loja.novidades_titulo ?? "",
    sobre_titulo: loja.sobre_titulo ?? "",
    sobre_texto: loja.sobre_texto ?? "",
    contato_texto: loja.contato_texto ?? "",
  });
  const inicial = conteudoDaLoja(loja);
  const [secoes, setSecoes] = useState<Secao[]>(inicial.secoes);
  const [vantagens, setVantagens] = useState<Vantagem[]>(() => {
    const v = Array.isArray(loja.vantagens) ? loja.vantagens : VANTAGENS_PADRAO;
    return [...v, ...Array(4).fill({ titulo: "", texto: "" })].slice(0, 4);
  });
  const [enviando, setEnviando] = useState<"" | "logo" | "capa">("");
  const [erroFoto, setErroFoto] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Prévia: a vitrine desenhada na largura real e reduzida para caber na coluna
  const caixaPrevia = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  useEffect(() => {
    const el = caixaPrevia.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setZoom(Math.min(1, e.contentRect.width / LARGURA_PREVIA)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const link = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/${loja.slug}`;
  const corValida = COR_VALIDA.test(cor);
  const contrasteBaixo = corValida && contrasteComBranco(cor) < 4.5;

  async function subir(arq: File | undefined, tipo: "logo" | "capa") {
    if (!arq) return;
    setErroFoto("");
    setEnviando(tipo);
    try {
      const url = await enviarFoto(arq, loja.id, "marca");
      if (tipo === "logo") setLogo(url);
      else setCapa(url);
    } catch (e) {
      setErroFoto((e as Error).message);
    } finally {
      setEnviando("");
    }
  }

  const mover = (i: number, d: -1 | 1) =>
    setSecoes((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const lojaPrevia: Loja = {
    ...loja,
    nome: nome || "Sua loja",
    tema,
    cor_personalizada: corValida ? cor : null,
    fonte,
    formato,
    logo_url: logo || null,
    capa_url: capa || null,
    instagram: instagram.replace(/^@/, "") || null,
    tiktok: tiktok.replace(/^@/, "") || null,
    ...textos,
    secoes,
    vantagens: vantagens.filter((v) => v.titulo.trim()),
  };
  const conteudo = conteudoDaLoja(lojaPrevia);
  const classeFonte = FONTES[fonte].classe;

  return (
    <form action={acao} className="flex flex-wrap items-start gap-6">
      <input type="hidden" name="tema" value={tema} />
      <input type="hidden" name="cor_personalizada" value={corValida ? cor : ""} />
      <input type="hidden" name="fonte" value={fonte} />
      <input type="hidden" name="formato" value={formato} />
      <input type="hidden" name="logo_url" value={logo} />
      <input type="hidden" name="capa_url" value={capa} />
      <input type="hidden" name="secoes" value={JSON.stringify(secoes)} />
      <input type="hidden" name="vantagens" value={JSON.stringify(vantagens)} />

      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}
        {estado?.ok && <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.ok}</p>}

        <Grupo titulo="Identidade" aberto>
          <div className="flex flex-col gap-2">
            <label htmlFor="nome" className="rotulo">Nome da loja</label>
            <input id="nome" name="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} required className="campo" />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-[1_1_180px] flex-col gap-2">
              <label htmlFor="whatsapp" className="rotulo">WhatsApp da loja</label>
              <input id="whatsapp" name="whatsapp" defaultValue={loja.whatsapp ?? ""} required inputMode="tel" className="campo" />
            </div>
            <div className="flex flex-[1_1_180px] flex-col gap-2">
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
          {(logo || capa) && (
            <div className="flex gap-4 text-[13px]">
              {logo && <button type="button" onClick={() => setLogo("")} className="font-semibold text-muted underline">Tirar logo</button>}
              {capa && <button type="button" onClick={() => setCapa("")} className="font-semibold text-muted underline">Tirar capa</button>}
            </div>
          )}
          {erroFoto && <p className="text-sm font-semibold text-deep">{erroFoto}</p>}
        </Grupo>

        <Grupo titulo="Cores e estilo" aberto>
          <span className="rotulo">Cor da loja</span>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(TEMAS) as TemaId[]).map((t) => {
              const on = !corValida && t === tema;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setTema(t);
                    setCor("");
                  }}
                  className="flex min-w-15 flex-col items-center gap-1.5 text-[13px] font-semibold"
                >
                  <span
                    className="flex size-13 items-center justify-center rounded-full"
                    style={{ background: TEMAS[t].cores.petal, boxShadow: on ? `0 0 0 3px #fff, 0 0 0 5px ${TEMAS[t].cores.deep}` : "none" }}
                  >
                    <span className="size-5 rounded-full" style={{ background: TEMAS[t].cores.deep }} />
                  </span>
                  {TEMAS[t].nome}
                </button>
              );
            })}
            <label className="flex min-w-15 cursor-pointer flex-col items-center gap-1.5 text-[13px] font-semibold">
              <span
                className="relative flex size-13 items-center justify-center overflow-hidden rounded-full"
                style={{
                  background: corValida ? cor : "conic-gradient(#e11d48, #f59e0b, #10b981, #3b82f6, #8b5cf6, #e11d48)",
                  boxShadow: corValida ? `0 0 0 3px #fff, 0 0 0 5px ${cor}` : "none",
                }}
              >
                <input
                  type="color"
                  aria-label="Escolher qualquer cor"
                  value={corValida ? cor : "#a3195b"}
                  onChange={(e) => setCor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </span>
              Qualquer cor
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="cor-hex" className="text-sm">Código da cor</label>
            <input
              id="cor-hex"
              value={cor}
              onChange={(e) => setCor(e.target.value.startsWith("#") || !e.target.value ? e.target.value : `#${e.target.value}`)}
              placeholder="#A3195B"
              maxLength={7}
              className="campo h-10 w-32 px-3 font-mono"
            />
          </div>
          {contrasteBaixo && (
            <p className="text-[13px] text-muted">
              Essa cor é clara para texto branco. A vitrine usa um tom mais escuro dela nos botões, para continuar legível.
            </p>
          )}

          <span className="rotulo">Estilo das letras</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FONTES) as FonteId[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={f === fonte}
                onClick={() => setFonte(f)}
                className={`flex h-18 flex-col items-center justify-center rounded-[18px] border-[1.5px] ${f === fonte ? "border-deep bg-soft" : "border-petal bg-white"}`}
              >
                <span className={`text-xl ${FONTES[f].classe}`}>Aa</span>
                <span className="text-[12px] font-semibold text-muted">{FONTES[f].nome}</span>
              </button>
            ))}
          </div>

          <span className="rotulo">Formato das fotos</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FORMATOS) as FormatoId[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={f === formato}
                onClick={() => setFormato(f)}
                className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-[18px] border-[1.5px] text-[12px] font-semibold ${f === formato ? "border-deep bg-soft" : "border-petal bg-white"}`}
              >
                <span className={`h-9 w-7 bg-petal ${FORMATOS[f].mini}`} />
                {FORMATOS[f].nome}
              </button>
            ))}
          </div>
        </Grupo>

        <Grupo titulo="Seções da vitrine">
          <p className="-mt-2 text-[13px] text-muted">Ligue, desligue e mude a ordem do que aparece.</p>
          <ul className="flex flex-col gap-2">
            {secoes.map((s, i) => (
              <li key={s.id} className={`flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2.5 ${s.visivel ? "border-petal bg-white" : "border-dashed border-petal bg-blush"}`}>
                <input
                  type="checkbox"
                  aria-label={`Mostrar ${SECOES_INFO[s.id].nome}`}
                  checked={s.visivel}
                  onChange={() => setSecoes((l) => l.map((x) => (x.id === s.id ? { ...x, visivel: !x.visivel } : x)))}
                  className="size-5 shrink-0 accent-[var(--deep)]"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`font-semibold ${s.visivel ? "" : "text-muted"}`}>{SECOES_INFO[s.id].nome}</span>
                  <span className="truncate text-[12px] text-muted">{SECOES_INFO[s.id].descricao}</span>
                </span>
                <span className="flex gap-1">
                  <button type="button" aria-label={`Subir ${SECOES_INFO[s.id].nome}`} disabled={i === 0} onClick={() => mover(i, -1)} className="flex size-9 items-center justify-center rounded-xl bg-soft font-bold text-deep disabled:opacity-30">↑</button>
                  <button type="button" aria-label={`Descer ${SECOES_INFO[s.id].nome}`} disabled={i === secoes.length - 1} onClick={() => mover(i, 1)} className="flex size-9 items-center justify-center rounded-xl bg-soft font-bold text-deep disabled:opacity-30">↓</button>
                </span>
              </li>
            ))}
          </ul>
        </Grupo>

        <Grupo titulo="Textos">
          <p className="-mt-2 text-[13px] text-muted">
            Vazio usa o texto padrão. Coloque uma palavra entre <strong>*asteriscos*</strong> para ela ficar em itálico na cor da loja.
          </p>
          {CAMPOS_TEXTO.map((c) => (
            <div key={c.chave} className="flex flex-col gap-1.5">
              <label htmlFor={c.chave} className="rotulo">{c.rotulo}</label>
              {c.multilinha ? (
                <textarea
                  id={c.chave}
                  name={c.chave}
                  rows={c.chave === "sobre_texto" ? 5 : 3}
                  maxLength={c.max}
                  value={textos[c.chave]}
                  onChange={(e) => setTextos((t) => ({ ...t, [c.chave]: e.target.value }))}
                  placeholder={TEXTOS_PADRAO[c.chave] || "Conte um pouco sobre você e a sua loja"}
                  className="campo h-auto py-3 text-sm"
                />
              ) : (
                <input
                  id={c.chave}
                  name={c.chave}
                  maxLength={c.max}
                  value={textos[c.chave]}
                  onChange={(e) => setTextos((t) => ({ ...t, [c.chave]: e.target.value }))}
                  placeholder={TEXTOS_PADRAO[c.chave]}
                  className="campo"
                />
              )}
              {c.dica && <span className="text-[12px] text-muted">{c.dica}</span>}
            </div>
          ))}
        </Grupo>

        <Grupo titulo="Vantagens">
          <p className="-mt-2 text-[13px] text-muted">Até 4. Deixe o título vazio para tirar uma.</p>
          {vantagens.map((v, i) => (
            <div key={i} className="flex flex-wrap gap-2 rounded-2xl bg-blush p-3">
              <label className="sr-only" htmlFor={`vant-t-${i}`}>Vantagem {i + 1}: título</label>
              <input
                id={`vant-t-${i}`}
                value={v.titulo}
                maxLength={40}
                onChange={(e) => setVantagens((l) => l.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                placeholder="Título"
                className="campo h-11 flex-[1_1_140px]"
              />
              <label className="sr-only" htmlFor={`vant-x-${i}`}>Vantagem {i + 1}: texto</label>
              <input
                id={`vant-x-${i}`}
                value={v.texto}
                maxLength={80}
                onChange={(e) => setVantagens((l) => l.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))}
                placeholder="Texto curto"
                className="campo h-11 flex-[2_1_180px]"
              />
            </div>
          ))}
        </Grupo>

        <Grupo titulo="Redes sociais">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="instagram" className="rotulo">Instagram</label>
            <input id="instagram" name="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@sualoja" className="campo" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tiktok" className="rotulo">TikTok</label>
            <input id="tiktok" name="tiktok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@sualoja" className="campo" />
          </div>
        </Grupo>

        <button disabled={salvando || !!enviando} className="btn-primario h-14 text-base">
          {salvando ? "Salvando…" : "Salvar e publicar"}
        </button>
      </div>

      {/* Prévia ao vivo: as mesmas seções da vitrine, reduzidas */}
      <section aria-label="Prévia da vitrine" className="min-w-0 flex-[2_1_460px] overflow-hidden rounded-[28px] border border-petal bg-white lg:sticky lg:top-6">
        <div className="flex items-center gap-2 border-b border-soft px-4 py-3">
          <span className="size-2.5 rounded-full bg-petal" />
          <span className="size-2.5 rounded-full bg-petal" />
          <span className="size-2.5 rounded-full bg-petal" />
          <span className="ml-2 flex h-7 flex-1 items-center truncate rounded-full bg-blush px-3.5 text-xs text-muted">{link}</span>
        </div>
        <div ref={caixaPrevia} className="max-h-[78vh] overflow-y-auto">
          <div
            inert
            style={{ ...estiloDoTema(tema, corValida ? cor : null), width: LARGURA_PREVIA, zoom }}
            className="bg-blush pb-10 text-ink"
          >
            <AvisoTopo texto={conteudo.aviso_topo} />
            <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-5">
              <span className="flex items-center gap-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="size-12 rounded-full object-cover" />
                ) : (
                  <span className={`flex size-12 items-center justify-center rounded-full bg-deep text-[22px] text-white ${classeFonte}`}>{nome.trim()[0]?.toUpperCase()}</span>
                )}
                <span className={`text-[26px] ${classeFonte}`}>{nome || "Sua loja"}</span>
              </span>
              <span className="btn-primario">WhatsApp</span>
            </header>
            <SecoesDaVitrine
              loja={lojaPrevia}
              conteudo={conteudo}
              fonte={classeFonte}
              formatoFoto={FORMATOS[formato].foto}
              whats={linkWhatsApp(loja.whatsapp, "") ?? "#"}
              produtos={produtos}
              todos={produtos}
              categoria={null}
              linkProduto={false}
            />
            <div className="mx-auto mt-10 max-w-[1240px] px-6 text-sm"><RedesSociais loja={lojaPrevia} /></div>
          </div>
        </div>
      </section>
    </form>
  );
}
