"use client";

import { miniatura } from "@/lib/fotos";
import { useEffect, useState, useTransition } from "react";
import type { Produto } from "@/lib/tipos";
import { legendaDaPeca } from "@/lib/legenda";
import { dataCurta } from "@/lib/formatar";
import { FotoPeca } from "@/components/peca";
import { IconeCheck } from "@/components/icones";
import type { EstadoConexao, Grupo } from "@/lib/evolution";
import { buscarGrupos, conectarWhatsApp, desconectarWhatsApp, enviarNovidades, escolherGrupo, verEstado } from "./actions";

export function PainelDivulgar({
  lojaNome,
  lojaSlug,
  site,
  temInstancia,
  grupo,
  produtos,
}: {
  lojaNome: string;
  lojaSlug: string;
  site: string;
  temInstancia: boolean;
  grupo: { id: string; nome: string } | null;
  produtos: Produto[];
}) {
  const [estado, setEstado] = useState<EstadoConexao | "carregando">(temInstancia ? "carregando" : "close");
  const [qr, setQr] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>(
    produtos.filter((p) => !p.novidade_enviada_em).slice(0, 8).map((p) => p.id),
  );
  const [abertura, setAbertura] = useState(`Oii, meninas! 💕 Chegou sacola nova na ${lojaNome}. Olha só as novidades:`);
  const [pendente, iniciar] = useTransition();

  // Estado inicial e, enquanto houver QR na tela, consulta a cada 3s se já conectou
  useEffect(() => {
    if (!temInstancia && !qr) return;
    let vivo = true;
    const checar = async () => {
      const e = await verEstado();
      if (!vivo) return;
      setEstado(e);
      if (e === "open") setQr(null);
    };
    checar();
    const t = qr ? setInterval(checar, 3000) : undefined;
    return () => {
      vivo = false;
      if (t) clearInterval(t);
    };
  }, [temInstancia, qr]);

  const conectar = () =>
    iniciar(async () => {
      setErro("");
      const r = await conectarWhatsApp();
      if (r.erro) return setErro(r.erro);
      if (r.estado) setEstado(r.estado);
      setQr(r.qr ?? null);
    });

  const carregarGrupos = () =>
    iniciar(async () => {
      const r = await buscarGrupos();
      if ("erro" in r && r.erro) setErro(r.erro);
      else setGrupos(r.grupos ?? []);
    });

  const enviar = () =>
    iniciar(async () => {
      setErro("");
      setAviso("");
      const r = await enviarNovidades(selecionados, abertura);
      if (r.erro) setErro(r.erro);
      if (r.ok) {
        setAviso(r.ok);
        setSelecionados([]);
      }
    });

  const conectado = estado === "open";
  const exemplo = produtos.find((p) => selecionados.includes(p.id));

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-5">
        {erro && <p role="alert" className="rounded-2xl bg-[#FFF1D6] px-4 py-3 text-sm font-semibold text-[#7A4A00]">{erro}</p>}
        {aviso && <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{aviso}</p>}

        {/* 1. Conexão */}
        <section className="cartao flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">1 · Conectar seu WhatsApp</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${conectado ? "bg-deep text-white" : "bg-soft text-deep"}`}>
              {estado === "carregando" ? "Verificando…" : conectado ? "Conectado" : estado === "connecting" ? "Aguardando leitura" : "Desconectado"}
            </span>
          </div>
          {!conectado && !qr && (
            <>
              <p className="text-sm text-muted">
                Funciona como o WhatsApp Web: você lê um QR code com o celular. Recomendo usar o número da loja, não o pessoal.
              </p>
              <button onClick={conectar} disabled={pendente} className="btn-primario self-start">
                {pendente ? "Gerando QR code…" : "Gerar QR code"}
              </button>
            </>
          )}
          {qr && !conectado && (
            <div className="flex flex-wrap items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code para conectar o WhatsApp" className="size-56 rounded-2xl border border-petal bg-white p-2" />
              <ol className="flex max-w-xs list-decimal flex-col gap-1.5 pl-5 text-sm">
                <li>Abra o WhatsApp no celular</li>
                <li>Toque em <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong> e aponte para o código</li>
                <li className="list-none pt-2 text-muted">O código expira rápido. <button onClick={conectar} className="font-bold text-deep underline">Gerar outro</button></li>
              </ol>
            </div>
          )}
          {conectado && (
            <button onClick={() => iniciar(async () => { await desconectarWhatsApp(); setEstado("close"); setGrupos(null); })} className="self-start text-sm font-semibold text-muted underline">
              Desconectar este número
            </button>
          )}
        </section>

        {/* 2. Grupo */}
        <section className={`cartao flex flex-col gap-3 ${conectado ? "" : "opacity-50"}`}>
          <h2 className="font-bold">2 · Grupo das clientes</h2>
          {grupo && !grupos && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3">
              <span className="flex items-center gap-2 font-semibold"><IconeCheck tamanho={18} className="text-deep" /> {grupo.nome}</span>
              <button onClick={carregarGrupos} disabled={!conectado || pendente} className="text-sm font-bold text-deep">Trocar</button>
            </div>
          )}
          {!grupo && !grupos && (
            <button onClick={carregarGrupos} disabled={!conectado || pendente} className="btn-secundario self-start">
              {pendente ? "Buscando…" : "Escolher grupo"}
            </button>
          )}
          {grupos && (
            <ul className="flex max-h-72 flex-col overflow-y-auto">
              {grupos.length === 0 && <li className="text-sm text-muted">Nenhum grupo encontrado neste número.</li>}
              {grupos.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => iniciar(async () => { await escolherGrupo(g.id, g.subject); setGrupos(null); })}
                    className="flex w-full items-center justify-between border-t border-soft py-3 text-left first:border-0 hover:text-deep"
                  >
                    <span className="font-semibold">{g.subject}</span>
                    {g.size ? <span className="text-xs text-muted">{g.size} pessoas</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3. Peças */}
        <section className={`cartao flex flex-col gap-3 ${conectado && grupo ? "" : "opacity-50"}`}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">3 · O que enviar</h2>
            <span className="text-sm text-muted">{selecionados.length} selecionadas</span>
          </div>
          <label htmlFor="abertura" className="rotulo">Mensagem de abertura (opcional)</label>
          <textarea id="abertura" rows={2} value={abertura} onChange={(e) => setAbertura(e.target.value)} className="campo h-auto py-3" />
          {produtos.length === 0 && <p className="text-sm text-muted">Cadastre peças com estoque para divulgar.</p>}
          <ul className="flex flex-col">
            {produtos.map((p) => {
              const on = selecionados.includes(p.id);
              return (
                <li key={p.id} className="border-t border-soft first:border-0">
                  <label className="flex cursor-pointer items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setSelecionados((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                      className="size-5 accent-[var(--deep)]"
                    />
                    <FotoPeca foto={miniatura(p.fotos[0])} categoria={p.categoria} alt="" className="h-14 w-11 shrink-0 rounded-t-full rounded-b-md" tamanhoIlustracao={30} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">{p.nome}</span>
                      <span className="text-xs text-muted">
                        {p.novidade_enviada_em ? `Já enviada em ${dataCurta(p.novidade_enviada_em)}` : "Ainda não divulgada"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-6">
        <section className="flex flex-col gap-3 rounded-[28px] bg-[#E7DDD3] p-5">
          <span className="text-xs font-bold tracking-widest text-[#5C4A3D] uppercase">Prévia no grupo</span>
          {exemplo ? (
            <div className="flex max-w-[300px] flex-col gap-2 self-end rounded-2xl rounded-tr-sm bg-[#D9FDD3] p-1.5 text-[14px] text-[#111B21] shadow-sm">
              <FotoPeca foto={exemplo.fotos[0]} categoria={exemplo.categoria} alt="" className="aspect-square w-full rounded-xl" tamanhoIlustracao={90} />
              <p className="px-1.5 pb-1 whitespace-pre-line">
                {legendaDaPeca(exemplo, lojaNome, `${site || ""}/${lojaSlug}/p/…`).replace(/\*/g, "")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#5C4A3D]">Escolha uma peça para ver como fica.</p>
          )}
        </section>
        <button onClick={enviar} disabled={!conectado || !grupo || selecionados.length === 0 || pendente} className="btn-primario h-14 text-base">
          {pendente ? "Enviando… (leva alguns segundos por peça)" : `Enviar ${selecionados.length} para o grupo`}
        </button>
        <p className="text-xs leading-relaxed text-muted">
          As peças vão uma por vez, com intervalo, para parecer envio normal. Evite mandar muitas vezes por dia: a conexão não é oficial do WhatsApp e excesso pode bloquear o número.
        </p>
      </aside>
    </div>
  );
}
