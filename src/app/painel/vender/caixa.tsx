"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { LeitorCodigo } from "@/components/leitor-codigo";
import { FotoPeca } from "@/components/peca";
import { IconeCheck, IconeCodigo, IconeX } from "@/components/icones";
import { brl } from "@/lib/formatar";
import { buscarPorCodigo, finalizarVenda } from "../actions";

type Item = {
  variante_id: string;
  nome: string;
  tamanho: string;
  codigo: string;
  preco: number;
  estoque: number;
  categoria: string;
  foto: string | null;
  quantidade: number;
};

type Forma = "pix" | "cartao" | "dinheiro" | "caderninho";

const FORMAS: { id: Forma; rotulo: string; sub: string }[] = [
  { id: "pix", rotulo: "Pix", sub: "na hora" },
  { id: "cartao", rotulo: "Cartão", sub: "débito ou crédito" },
  { id: "dinheiro", rotulo: "Dinheiro", sub: "com troco" },
  { id: "caderninho", rotulo: "Caderninho", sub: "paga depois, em parcelas" },
];

/** Datas das parcelas (mesma regra do banco), para mostrar antes de finalizar. */
function previsaoParcelas(n: number, modo: "data" | "sacola", primeira: string, hoje: string, devolverAte: string | null) {
  const dia = (iso: string) => new Date(iso + "T12:00:00");
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return Array.from({ length: n }, (_, k) => {
    const i = k + 1;
    if (modo === "sacola" && devolverAte) {
      const total = Math.max(0, Math.round((dia(devolverAte).getTime() - dia(hoje).getTime()) / 86_400_000));
      const d = dia(hoje);
      d.setDate(d.getDate() + Math.ceil((total * i) / n));
      return iso(d);
    }
    const d = dia(primeira || hoje);
    const diaDoMes = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + k);
    d.setDate(Math.min(diaDoMes, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return iso(d);
  });
}

const curta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function CaixaVenda({
  percentualLucro,
  sacola,
  hoje,
}: {
  percentualLucro: number;
  sacola: { nome: string; devolverAte: string } | null;
  hoje: string;
}) {
  const [itens, setItens] = useState<Item[]>([]);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string; codigo?: string } | null>(null);
  const [codigoDigitado, setCodigoDigitado] = useState("");
  const [forma, setForma] = useState<Forma>("pix");
  const [parcelas, setParcelas] = useState(1);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteWhats, setClienteWhats] = useState("");
  const [modoVenc, setModoVenc] = useState<"data" | "sacola">("data");
  const emTrintaDias = (() => {
    const d = new Date(hoje + "T12:00:00");
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();
  const [primeiroVenc, setPrimeiroVenc] = useState(emTrintaDias);
  const [cobrarAuto, setCobrarAuto] = useState(true);
  const [concluida, setConcluida] = useState<number | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [finalizando, iniciar] = useTransition();
  const avisoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const itensRef = useRef<Item[]>([]);
  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);

  const avisar = useCallback((a: { tipo: "ok" | "erro"; texto: string; codigo?: string }) => {
    setAviso(a);
    clearTimeout(avisoTimer.current);
    if (a.tipo === "ok") avisoTimer.current = setTimeout(() => setAviso(null), 2500);
  }, []);

  const adicionar = useCallback(async (codigo: string) => {
    const c = codigo.trim();
    if (!c) return;
    setBuscando(true);
    const achado = await buscarPorCodigo(c);
    setBuscando(false);
    if (!achado) {
      avisar({ tipo: "erro", texto: `Código ${c} não está cadastrado.`, codigo: c });
      return;
    }
    const ja = itensRef.current.find((i) => i.variante_id === achado.variante_id);
    const qtd = (ja?.quantidade ?? 0) + 1;
    if (qtd > achado.estoque) {
      avisar({ tipo: "erro", texto: `Sem estoque de ${achado.nome} (${achado.tamanho}).` });
      return;
    }
    setItens((atual) =>
      atual.some((i) => i.variante_id === achado.variante_id)
        ? atual.map((i) => (i.variante_id === achado.variante_id ? { ...i, quantidade: i.quantidade + 1 } : i))
        : [...atual, { ...achado, quantidade: 1 }],
    );
    avisar({ tipo: "ok", texto: `${achado.nome} (${achado.tamanho}) adicionada` });
  }, [avisar]);

  const total = itens.reduce((a, i) => a + i.preco * i.quantidade, 0);
  const qtdPecas = itens.reduce((a, i) => a + i.quantidade, 0);

  function concluir() {
    iniciar(async () => {
      const r = await finalizarVenda({
        itens: itens.map((i) => ({ variante_id: i.variante_id, quantidade: i.quantidade })),
        forma,
        parcelas: forma === "caderninho" ? parcelas : 1,
        clienteNome: clienteNome || undefined,
        clienteWhatsapp: clienteWhats || undefined,
        vencimento: modoVenc,
        primeiroVencimento: primeiroVenc,
        cobrarAuto,
      });
      if ("erro" in r && r.erro) {
        avisar({ tipo: "erro", texto: r.erro });
        return;
      }
      setConcluida(total);
      setItens([]);
      setClienteNome("");
      setClienteWhats("");
      setModoVenc("data");
      setPrimeiroVenc(emTrintaDias);
      setCobrarAuto(true);
      setForma("pix");
      setParcelas(1);
    });
  }

  if (concluida !== null) {
    return (
      <div className="cartao mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-deep text-white"><IconeCheck tamanho={30} /></span>
        <h2 className="titulo text-3xl">Venda <span className="italic text-deep">registrada!</span></h2>
        <p className="text-muted">{brl(concluida)} · as peças já saíram da sacola.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setConcluida(null)} className="btn-primario">Nova venda</button>
          <Link href="/painel" className="btn-secundario">Ver painel</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-5">
        <section aria-label="Leitor de código de barras" className="flex flex-col gap-4 rounded-[28px] bg-ink p-4 sm:p-5">
          <div className="relative">
            <LeitorCodigo onLeitura={adicionar} pausado={buscando} className="h-64 sm:h-72" />
            {aviso && (
              <div
                role="status"
                className={`absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${
                  aviso.tipo === "ok" ? "bg-white text-deep" : "bg-[#FFF1D6] text-[#7A4A00]"
                }`}
              >
                {aviso.tipo === "ok" && <IconeCheck tamanho={18} />}
                <span className="truncate">{aviso.texto}</span>
                {aviso.codigo && (
                  <Link href={`/painel/produtos/novo?codigo=${encodeURIComponent(aviso.codigo)}`} className="shrink-0 underline">
                    Cadastrar
                  </Link>
                )}
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adicionar(codigoDigitado);
              setCodigoDigitado("");
            }}
            className="flex gap-2"
          >
            <label htmlFor="codigo" className="sr-only">Código de barras</label>
            <input
              id="codigo"
              inputMode="numeric"
              autoComplete="off"
              value={codigoDigitado}
              onChange={(e) => setCodigoDigitado(e.target.value)}
              placeholder="Digite ou use o leitor USB: 789…"
              className="h-13 min-w-0 flex-1 rounded-full bg-white/10 px-5 text-white outline-none placeholder:text-white/60 focus:ring-2 focus:ring-petal"
            />
            <button className="btn h-13 bg-petal text-ink" disabled={buscando}>
              <IconeCodigo tamanho={18} /> Adicionar
            </button>
          </form>
        </section>

        <section className="cartao flex flex-col gap-1">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[13px] font-bold tracking-widest text-muted uppercase">Peças bipadas</h2>
            <span className="text-[13px] text-muted">{qtdPecas} {qtdPecas === 1 ? "peça" : "peças"}</span>
          </div>
          {itens.length === 0 && (
            <p className="rounded-[20px] border-[1.5px] border-dashed border-petal p-7 text-center text-muted">
              Nenhuma peça ainda. Bipe a etiqueta para começar.
            </p>
          )}
          {itens.map((i) => (
            <div key={i.variante_id} className="flex items-center gap-3.5 border-t border-soft py-2.5 first:border-0">
              <FotoPeca foto={i.foto} categoria={i.categoria} alt="" className="h-16 w-13 shrink-0 rounded-t-full rounded-b-lg" tamanhoIlustracao={36} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{i.nome}</span>
                <span className="text-[13px] text-muted">Tam. {i.tamanho} · Cód. {i.codigo}</span>
              </span>
              <span className="flex items-center gap-1 rounded-full bg-soft p-1">
                <button
                  aria-label="Diminuir"
                  onClick={() =>
                    setItens((a) => a.flatMap((x) => (x.variante_id !== i.variante_id ? [x] : x.quantidade > 1 ? [{ ...x, quantidade: x.quantidade - 1 }] : [])))
                  }
                  className="size-8 rounded-full bg-white font-bold text-deep"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-bold">{i.quantidade}</span>
                <button
                  aria-label="Aumentar"
                  disabled={i.quantidade >= i.estoque}
                  onClick={() => setItens((a) => a.map((x) => (x.variante_id === i.variante_id ? { ...x, quantidade: x.quantidade + 1 } : x)))}
                  className="size-8 rounded-full bg-white font-bold text-deep disabled:opacity-40"
                >
                  +
                </button>
              </span>
              <span className="w-24 text-right font-bold">{brl(i.preco * i.quantidade)}</span>
              <button
                aria-label={`Remover ${i.nome}`}
                onClick={() => setItens((a) => a.filter((x) => x.variante_id !== i.variante_id))}
                className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-soft"
              >
                <IconeX tamanho={16} />
              </button>
            </div>
          ))}
        </section>

        <section className="cartao flex flex-col gap-3.5">
          <h2 className="text-[13px] font-bold tracking-widest text-muted uppercase">Pagamento</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            {FORMAS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={forma === f.id}
                onClick={() => setForma(f.id)}
                className={`flex h-18 flex-col items-start justify-center rounded-[20px] border-[1.5px] px-4.5 text-left ${
                  forma === f.id ? "border-deep bg-deep text-white" : "border-petal bg-white text-ink"
                }`}
              >
                <span className="font-bold">{f.rotulo}</span>
                <span className="text-[13px] opacity-85">{f.sub}</span>
              </button>
            ))}
          </div>
          {forma === "caderninho" && (
            <div className="flex flex-col gap-4 rounded-[20px] bg-soft p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-[1_1_200px] flex-col gap-1.5">
                  <label htmlFor="cliente-nome" className="rotulo">Quem vai pagar</label>
                  <input id="cliente-nome" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="campo" placeholder="Ex.: Juliana, do salão" autoComplete="off" />
                </div>
                <div className="flex flex-[1_1_200px] flex-col gap-1.5">
                  <label htmlFor="cliente-whats" className="rotulo">WhatsApp dela</label>
                  <input id="cliente-whats" value={clienteWhats} onChange={(e) => setClienteWhats(e.target.value)} inputMode="tel" className="campo" placeholder="(42) 99999-0000" autoComplete="off" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold">Em quantas vezes?</span>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={parcelas === n}
                      onClick={() => setParcelas(n)}
                      className={`h-11 w-12 rounded-2xl text-sm font-bold ${parcelas === n ? "bg-deep text-white" : "bg-white text-ink"}`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                {total > 0 && <span className="text-sm text-muted">{parcelas}x de {brl(total / parcelas)}</span>}
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-bold">Vencimento</legend>
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] bg-white px-4 py-3 ${modoVenc === "data" ? "border-deep" : "border-transparent"}`}>
                  <input type="radio" name="venc" checked={modoVenc === "data"} onChange={() => setModoVenc("data")} className="size-5 accent-[var(--deep)]" />
                  <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">Eu escolho a data</span>
                    {modoVenc === "data" && (
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-muted">1ª parcela em</span>
                        <input type="date" aria-label="Data da primeira parcela" min={hoje} value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} className="campo h-10 w-auto px-3" />
                        {parcelas > 1 && <span className="text-muted">e as outras a cada mês</span>}
                      </span>
                    )}
                  </span>
                </label>
                <label className={`flex items-center gap-3 rounded-2xl border-[1.5px] bg-white px-4 py-3 ${sacola ? "cursor-pointer" : "opacity-50"} ${modoVenc === "sacola" ? "border-deep" : "border-transparent"}`}>
                  <input type="radio" name="venc" disabled={!sacola} checked={modoVenc === "sacola"} onChange={() => setModoVenc("sacola")} className="size-5 accent-[var(--deep)]" />
                  <span className="flex flex-col">
                    <span className="font-semibold">Até o fechamento da sacola</span>
                    <span className="text-sm text-muted">
                      {sacola ? `${sacola.nome}: devolver até ${curta(sacola.devolverAte)}${parcelas > 1 ? " (parcelas distribuídas até lá)" : ""}` : "Sem sacola aberta"}
                    </span>
                  </span>
                </label>
                {total > 0 && (
                  <p className="text-sm text-muted">
                    {previsaoParcelas(parcelas, modoVenc, primeiroVenc, hoje, sacola?.devolverAte ?? null)
                      .map((d, i) => `${i + 1}ª ${curta(d)}`)
                      .join(" · ")}
                  </p>
                )}
              </fieldset>

              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={cobrarAuto} onChange={(e) => setCobrarAuto(e.target.checked)} className="mt-0.5 size-5 accent-[var(--deep)]" />
                <span>
                  <strong>Cobrar automaticamente no WhatsApp</strong>
                  <span className="block text-muted">
                    {clienteWhats.replace(/\D/g, "").length >= 10
                      ? "Ela recebe um lembrete nos dias que você configurou no Caderninho."
                      : "Informe o WhatsApp dela para ativar os lembretes."}
                  </span>
                </span>
              </label>
            </div>
          )}
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-[28px] bg-deep p-7 text-white lg:sticky lg:top-6">
        <h2 className="titulo text-2xl">Resumo</h2>
        <div className="flex justify-between"><span>{qtdPecas} {qtdPecas === 1 ? "peça" : "peças"}</span><span>{brl(total)}</span></div>
        <div className="flex justify-between">
          <span>Pagamento</span>
          <span>{forma === "caderninho" ? `Caderninho ${parcelas}x de ${brl(total / parcelas)}` : FORMAS.find((f) => f.id === forma)?.rotulo}</span>
        </div>
        <div className="h-px bg-white/25" />
        <div className="flex items-baseline justify-between"><span>Total</span><span className="text-4xl font-bold">{brl(total)}</span></div>
        <div className="flex justify-between text-sm opacity-90">
          <span>Seu lucro nesta venda</span>
          <span className="font-bold">{brl((total * percentualLucro) / 100)}</span>
        </div>
        <button onClick={concluir} disabled={itens.length === 0 || finalizando} className="btn h-14 bg-white text-base text-deep">
          {finalizando ? "Registrando…" : "Finalizar venda"}
        </button>
      </aside>
    </div>
  );
}
