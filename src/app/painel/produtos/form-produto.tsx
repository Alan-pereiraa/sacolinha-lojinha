"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarProduto } from "../actions";
import { CATEGORIAS, nomeDaSacola, type Produto, type SacolaComEmpresa } from "@/lib/tipos";
import { enviarFoto } from "@/lib/upload";
import { LeitorCodigo } from "@/components/leitor-codigo";
import { IconeCodigo, IconeMais, IconeUpload, IconeX } from "@/components/icones";

type LinhaVariante = { chave: string; id?: string; tamanho: string; codigo_barras: string; estoque: number; vendidos: number };

export function FormProduto({
  lojaId,
  produto,
  codigoInicial,
  sacolas = [],
  sacolaInicial,
}: {
  lojaId: string;
  produto?: Produto;
  codigoInicial?: string;
  sacolas?: SacolaComEmpresa[];
  sacolaInicial?: string;
}) {
  // Sacola só se escolhe entre as abertas; peça de sacola fechada fica onde está
  const sacolaAtual = produto ? produto.sacola_id : sacolaInicial;
  const podeEscolherSacola = sacolas.length > 1 && (!produto || sacolas.some((s) => s.id === produto.sacola_id));
  const [estado, acao, salvando] = useActionState(salvarProduto, undefined);
  const [fotos, setFotos] = useState<string[]>(produto?.fotos ?? []);
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState("");
  const [lendoLinha, setLendoLinha] = useState<string | null>(null);
  const [variantes, setVariantes] = useState<LinhaVariante[]>(
    produto?.variantes?.length
      ? produto.variantes.map((v) => ({ chave: v.id, id: v.id, tamanho: v.tamanho, codigo_barras: v.codigo_barras ?? "", estoque: v.estoque, vendidos: v.vendidos }))
      : [{ chave: "nova-0", tamanho: "", codigo_barras: codigoInicial ?? "", estoque: 1, vendidos: 0 }],
  );

  async function aoEscolherFotos(lista: FileList | null) {
    if (!lista?.length) return;
    setErroFoto("");
    setEnviando(true);
    try {
      for (const arq of Array.from(lista).slice(0, 6 - fotos.length)) {
        const url = await enviarFoto(arq, lojaId, "produto");
        setFotos((f) => [...f, url]);
      }
    } catch (e) {
      setErroFoto((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const mudar = (chave: string, campo: Partial<LinhaVariante>) =>
    setVariantes((vs) => vs.map((v) => (v.chave === chave ? { ...v, ...campo } : v)));

  return (
    <form action={acao} className="flex flex-wrap items-start gap-6">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      {fotos.map((f) => <input key={f} type="hidden" name="fotos" value={f} />)}
      <input type="hidden" name="variantes" value={JSON.stringify(variantes.map(({ id, tamanho, codigo_barras, estoque }) => ({ id, tamanho, codigo_barras, estoque })))} />

      <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-5">
        {estado?.erro && <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>}

        <section className="cartao flex flex-col gap-4">
          {podeEscolherSacola && (
            <div className="flex flex-col gap-2">
              <label htmlFor="sacola_id" className="rotulo">Sacola (empresa)</label>
              <select
                id="sacola_id"
                name="sacola_id"
                required
                defaultValue={sacolas.some((s) => s.id === sacolaAtual) ? (sacolaAtual ?? "") : ""}
                className="campo"
              >
                <option value="" disabled>Escolha a sacola</option>
                {sacolas.map((s) => (
                  <option key={s.id} value={s.id}>{nomeDaSacola(s)} · {Number(s.percentual_lucro)}% de lucro</option>
                ))}
              </select>
            </div>
          )}
          {!podeEscolherSacola && sacolas.length === 1 && !produto && <input type="hidden" name="sacola_id" value={sacolas[0].id} />}
          <div className="flex flex-col gap-2">
            <label htmlFor="nome" className="rotulo">Nome da peça</label>
            <input id="nome" name="nome" required minLength={2} defaultValue={produto?.nome} className="campo" placeholder="Ex.: Vestido Midi Floral" />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-[1_1_200px] flex-col gap-2">
              <label htmlFor="categoria" className="rotulo">Categoria</label>
              <select id="categoria" name="categoria" defaultValue={produto?.categoria ?? "conjuntos"} className="campo">
                {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-[1_1_160px] flex-col gap-2">
              <label htmlFor="preco" className="rotulo">Preço (R$)</label>
              <input id="preco" name="preco" required inputMode="decimal" defaultValue={produto ? String(produto.preco).replace(".", ",") : ""} className="campo" placeholder="89,90" />
            </div>
            <div className="flex flex-[1_1_160px] flex-col gap-2">
              <label htmlFor="cor" className="rotulo">Cor</label>
              <input id="cor" name="cor" defaultValue={produto?.cor ?? ""} className="campo" placeholder="Rosé" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="descricao" className="rotulo">Descrição</label>
            <textarea id="descricao" name="descricao" rows={3} defaultValue={produto?.descricao ?? ""} className="campo h-auto py-3" placeholder="Tecido, caimento, como usar…" />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="visivel" defaultChecked={produto?.visivel ?? true} className="size-5 accent-[var(--deep)]" />
            Mostrar na vitrine
          </label>
        </section>

        <section className="cartao flex flex-col gap-3">
          <div>
            <h2 className="font-bold">Tamanhos e etiquetas</h2>
            <p className="text-sm text-muted">Cada tamanho tem o código de barras da etiqueta. É ele que você bipa na hora de vender.</p>
          </div>
          {variantes.map((v) => (
            <div key={v.chave} className="flex flex-col gap-2 rounded-[20px] bg-blush p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex w-24 flex-col gap-1">
                  <label htmlFor={`tam-${v.chave}`} className="text-xs font-semibold">Tamanho</label>
                  <input id={`tam-${v.chave}`} value={v.tamanho} onChange={(e) => mudar(v.chave, { tamanho: e.target.value.toUpperCase() })} required className="campo h-11" placeholder="M / 42" />
                </div>
                <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1">
                  <label htmlFor={`cod-${v.chave}`} className="text-xs font-semibold">Código de barras</label>
                  <div className="flex gap-1.5">
                    <input id={`cod-${v.chave}`} value={v.codigo_barras} onChange={(e) => mudar(v.chave, { codigo_barras: e.target.value.trim() })} inputMode="numeric" className="campo h-11 min-w-0" placeholder="789…" />
                    <button type="button" aria-label="Ler código com a câmera" onClick={() => setLendoLinha(lendoLinha === v.chave ? null : v.chave)} className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-deep text-white">
                      <IconeCodigo tamanho={18} />
                    </button>
                  </div>
                </div>
                <div className="flex w-20 flex-col gap-1">
                  <label htmlFor={`est-${v.chave}`} className="text-xs font-semibold">Estoque</label>
                  <input id={`est-${v.chave}`} type="number" min={0} value={v.estoque} onChange={(e) => mudar(v.chave, { estoque: Math.max(0, Number(e.target.value)) })} className="campo h-11" />
                </div>
                {variantes.length > 1 && (
                  <button type="button" aria-label={`Remover tamanho ${v.tamanho}`} onClick={() => setVariantes((vs) => vs.filter((x) => x.chave !== v.chave))} className="flex size-11 items-center justify-center rounded-2xl text-muted hover:bg-soft">
                    <IconeX tamanho={16} />
                  </button>
                )}
              </div>
              {v.vendidos > 0 && <span className="text-xs text-muted">{v.vendidos} já vendidas neste tamanho</span>}
              {lendoLinha === v.chave && (
                <LeitorCodigo
                  className="h-52"
                  onLeitura={(c) => {
                    mudar(v.chave, { codigo_barras: c });
                    setLendoLinha(null);
                  }}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVariantes((vs) => [...vs, { chave: `nova-${Date.now()}`, tamanho: "", codigo_barras: "", estoque: 1, vendidos: 0 }])}
            className="flex h-12 items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-deep font-bold text-deep"
          >
            <IconeMais tamanho={18} /> Adicionar tamanho
          </button>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
        <section className="cartao flex flex-col gap-3">
          <h2 className="font-bold">Fotos</h2>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((f, i) => (
              <div key={f} className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-xl bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label={`Remover foto ${i + 1}`} onClick={() => setFotos((fs) => fs.filter((x) => x !== f))} className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full bg-white text-deep">
                  <IconeX tamanho={14} />
                </button>
              </div>
            ))}
            {fotos.length < 6 && (
              <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-t-full rounded-b-xl border-[1.5px] border-dashed border-deep text-center text-xs font-bold text-deep">
                <IconeUpload />
                {enviando ? "Enviando…" : "Adicionar"}
                <input type="file" accept="image/*" multiple className="sr-only" disabled={enviando} onChange={(e) => aoEscolherFotos(e.target.files)} />
              </label>
            )}
          </div>
          {erroFoto && <p className="text-sm font-semibold text-deep">{erroFoto}</p>}
          <p className="text-xs text-muted">A primeira foto aparece na vitrine e no WhatsApp.</p>
        </section>
        <button disabled={salvando || enviando} className="btn-primario h-14 text-base">{salvando ? "Salvando…" : "Salvar peça"}</button>
        <Link href="/painel/sacola" className="btn-secundario">Cancelar</Link>
      </aside>
    </form>
  );
}
