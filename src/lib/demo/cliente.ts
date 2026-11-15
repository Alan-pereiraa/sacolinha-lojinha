/*
 * Cliente falso do Supabase para o modo demonstração.
 * Implementa só o que o app usa: from().select/insert/update/delete com filtros simples,
 * relações (produtos↔variantes, vendas→venda_itens), rpc() e auth.
 * Os dados ficam na memória do servidor: reiniciam quando o servidor reinicia.
 */
import { DEMO_USER, LOJA_ID, dadosIniciais } from "./dados";

type Linha = Record<string, unknown>;
type Banco = Record<string, Linha[]>;

const g = globalThis as unknown as { __sacolinhaDemo?: Banco };
function banco(): Banco {
  if (!g.__sacolinhaDemo) g.__sacolinhaDemo = dadosIniciais();
  return g.__sacolinhaDemo;
}

const clone = <T>(v: T): T => structuredClone(v);

function anexarRelacoes(tabela: string, linhas: Linha[], select: string) {
  const db = banco();
  return linhas.map((l) => {
    const r: Linha = { ...l };
    if (tabela === "produtos" && select.includes("variantes")) r.variantes = db.variantes.filter((v) => v.produto_id === l.id);
    if (tabela === "variantes" && select.includes("produtos")) r.produtos = db.produtos.find((p) => p.id === l.produto_id) ?? null;
    if (tabela === "vendas" && select.includes("venda_itens")) r.venda_itens = db.venda_itens.filter((i) => i.venda_id === l.id);
    return r;
  });
}

function valor(l: Linha, campo: string): unknown {
  if (!campo.includes(".")) return l[campo];
  const [rel, sub] = campo.split(".");
  const v = l[rel] as Linha | Linha[] | null | undefined;
  return Array.isArray(v) ? v[0]?.[sub] : v?.[sub];
}

type Filtro = (l: Linha) => boolean;

class Consulta implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private filtros: Filtro[] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private campos = "*";
  private payload: Linha | Linha[] | null = null;
  private ordem: { campo: string; asc: boolean } | null = null;
  private limite: number | null = null;
  private modo: "lista" | "um" | "talvez" = "lista";

  constructor(private tabela: string) {}

  select(campos = "*") {
    this.campos = campos;
    return this;
  }
  insert(dados: Linha | Linha[]) {
    this.op = "insert";
    this.payload = dados;
    return this;
  }
  update(dados: Linha) {
    this.op = "update";
    this.payload = dados;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(campo: string, v: unknown) {
    this.filtros.push((l) => valor(l, campo) === v);
    return this;
  }
  in(campo: string, vs: unknown[]) {
    this.filtros.push((l) => vs.includes(valor(l, campo)));
    return this;
  }
  gt(campo: string, v: number) {
    this.filtros.push((l) => Number(valor(l, campo)) > v);
    return this;
  }
  ilike(campo: string, padrao: string) {
    const termo = padrao.replace(/%/g, "").toLowerCase();
    this.filtros.push((l) => String(valor(l, campo) ?? "").toLowerCase().includes(termo));
    return this;
  }
  order(campo: string, o?: { ascending?: boolean }) {
    this.ordem = { campo, asc: o?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.limite = n;
    return this;
  }
  single() {
    this.modo = "um";
    return this;
  }
  maybeSingle() {
    this.modo = "talvez";
    return this;
  }

  private executar(): { data: unknown; error: { message: string } | null } {
    const db = banco();
    const tabela = (db[this.tabela] ??= []);

    if (this.op === "insert") {
      const novos: Linha[] = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((p) => ({
        id: crypto.randomUUID(),
        criado_em: new Date().toISOString(),
        ...(this.tabela === "variantes" ? { estoque: 1, vendidos: 0 } : {}),
        ...(this.tabela === "produtos" ? { fotos: [], visivel: true, novidade_enviada_em: null } : {}),
        ...(this.tabela === "sacolas" ? { status: "aberta", fechada_em: null } : {}),
        ...p,
      }));
      for (const n of novos) {
        if (this.tabela === "variantes" && n.codigo_barras && tabela.some((v) => v.loja_id === n.loja_id && v.codigo_barras === n.codigo_barras))
          return { data: null, error: { message: "duplicate key value violates unique constraint variantes_loja_id_codigo_barras_key" } };
        if (this.tabela === "sacolas" && tabela.some((s) => s.loja_id === n.loja_id && s.status === "aberta"))
          return { data: null, error: { message: "duplicate key sacolas_uma_aberta" } };
      }
      tabela.push(...novos);
      return this.resultado(clone(novos));
    }

    const comRelacoes = anexarRelacoes(this.tabela, tabela, this.campos + (this.filtros.length ? " produtos" : ""));
    const alvos = comRelacoes.filter((l) => this.filtros.every((f) => f(l)));
    const ids = new Set(alvos.map((a) => a.id));

    if (this.op === "update") {
      const p = this.payload as Linha;
      if (this.tabela === "variantes" && p.codigo_barras) {
        const conflito = tabela.some((v) => !ids.has(v.id) && v.loja_id === LOJA_ID && v.codigo_barras === p.codigo_barras);
        if (conflito) return { data: null, error: { message: "duplicate key value violates unique constraint variantes_loja_id_codigo_barras_key" } };
      }
      tabela.forEach((l) => ids.has(l.id) && Object.assign(l, p));
      return { data: null, error: null };
    }
    if (this.op === "delete") {
      db[this.tabela] = tabela.filter((l) => !ids.has(l.id));
      if (this.tabela === "produtos") db.variantes = db.variantes.filter((v) => !ids.has(v.produto_id));
      return { data: null, error: null };
    }

    let linhas = anexarRelacoes(this.tabela, tabela, this.campos).filter((l) => ids.has(l.id));
    if (this.ordem) {
      const { campo, asc } = this.ordem;
      linhas = [...linhas].sort((a, b) => {
        const x = a[campo] as string | number, y = b[campo] as string | number;
        return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1);
      });
    }
    if (this.limite !== null) linhas = linhas.slice(0, this.limite);
    return this.resultado(clone(linhas));
  }

  private resultado(linhas: Linha[]) {
    if (this.modo === "lista") return { data: linhas, error: null };
    if (this.modo === "um" && linhas.length !== 1) return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
    return { data: linhas[0] ?? null, error: null };
  }

  then<A = { data: unknown; error: { message: string } | null }, B = never>(
    ok?: ((v: { data: unknown; error: { message: string } | null }) => A | PromiseLike<A>) | null,
    falha?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.executar()).then(ok, falha);
  }
}

function finalizarVenda(args: { p_itens: { variante_id: string; quantidade: number }[]; p_forma: string; p_parcelas: number; p_pagador: string | null }) {
  const db = banco();
  const sacola = db.sacolas.find((s) => s.loja_id === LOJA_ID && s.status === "aberta");
  const itens: Linha[] = [];
  let total = 0;
  for (const it of args.p_itens) {
    const v = db.variantes.find((x) => x.id === it.variante_id && x.loja_id === LOJA_ID);
    if (!v) return { data: null, error: { message: "Peça não encontrada" } };
    const p = db.produtos.find((x) => x.id === v.produto_id)!;
    if ((v.estoque as number) < it.quantidade) return { data: null, error: { message: `Sem estoque: ${p.nome} (${v.tamanho})` } };
    itens.push({ v, p, q: it.quantidade });
    total += Number(p.preco) * it.quantidade;
  }
  const vendaId = crypto.randomUUID();
  for (const { v, p, q } of itens as { v: Linha; p: Linha; q: number }[]) {
    v.estoque = (v.estoque as number) - q;
    v.vendidos = (v.vendidos as number) + q;
    db.venda_itens.push({ id: crypto.randomUUID(), venda_id: vendaId, variante_id: v.id, produto_nome: p.nome, tamanho: v.tamanho, preco: p.preco, quantidade: q });
  }
  db.vendas.push({
    id: vendaId, loja_id: LOJA_ID, sacola_id: sacola?.id ?? null, total: Math.round(total * 100) / 100,
    lucro: Math.round(total * Number(sacola?.percentual_lucro ?? 0)) / 100, forma_pagamento: args.p_forma,
    parcelas: args.p_forma === "fiado" ? args.p_parcelas : 1, pagador: args.p_pagador, pago: args.p_forma !== "fiado",
    criado_em: new Date().toISOString(),
  });
  return { data: vendaId, error: null };
}

const ok = { data: {}, error: null };

export function criarClienteDemo() {
  return {
    from: (tabela: string) => new Consulta(tabela),
    rpc: async (nome: string, args: Record<string, unknown>) => {
      if (nome === "slug_disponivel") return { data: !banco().lojas.some((l) => l.slug === args.p_slug), error: null };
      if (nome === "finalizar_venda") return finalizarVenda(args as Parameters<typeof finalizarVenda>[0]);
      return { data: null, error: { message: `rpc ${nome} indisponível na demonstração` } };
    },
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      signInWithPassword: async () => ok,
      signOut: async () => ok,
      signUp: async () => ({ data: { session: {}, user: DEMO_USER }, error: null }),
      resetPasswordForEmail: async () => ok,
      exchangeCodeForSession: async () => ok,
      verifyOtp: async () => ok,
      updateUser: async () => ok,
    },
  };
}
