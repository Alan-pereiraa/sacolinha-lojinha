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
    if (tabela === "parcelas" && select.includes("vendas")) {
      const v = db.vendas.find((x) => x.id === l.venda_id);
      r.vendas = v ? { ...v, venda_itens: db.venda_itens.filter((i) => i.venda_id === v.id) } : null;
    }
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
  is(campo: string, v: null) {
    this.filtros.push((l) => (valor(l, campo) ?? null) === v);
    return this;
  }
  gte(campo: string, v: string | number) {
    this.filtros.push((l) => {
      const x = valor(l, campo);
      return x !== null && x !== undefined && (x as string | number) >= v;
    });
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
      if (this.tabela === "parcelas") sincronizarVendas();
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

type ArgsVenda = {
  p_itens: { variante_id: string; quantidade: number }[];
  p_forma: string;
  p_parcelas: number;
  p_cliente_nome: string | null;
  p_cliente_whatsapp: string | null;
  p_primeiro_venc: string | null;
  p_venc_pela_sacola: boolean;
  p_cobrar_auto: boolean;
};

function finalizarVenda(args: ArgsVenda) {
  const db = banco();
  const sacola = db.sacolas.find((s) => s.loja_id === LOJA_ID && s.status === "aberta");
  if (args.p_forma === "caderninho" && !args.p_cliente_nome?.trim()) return { data: null, error: { message: "Caderninho: informe o nome de quem vai pagar" } };
  let whats = (args.p_cliente_whatsapp ?? "").replace(/\D/g, "") || null;
  if (whats && whats.length >= 10 && whats.length <= 11) whats = "55" + whats;
  if (whats && (whats.length < 12 || whats.length > 13)) return { data: null, error: { message: "WhatsApp da cliente inválido" } };
  const itens: { v: Linha; p: Linha; q: number }[] = [];
  let total = 0;
  for (const it of args.p_itens) {
    const v = db.variantes.find((x) => x.id === it.variante_id && x.loja_id === LOJA_ID);
    if (!v) return { data: null, error: { message: "Peça não encontrada" } };
    const p = db.produtos.find((x) => x.id === v.produto_id)!;
    if ((v.estoque as number) < it.quantidade) return { data: null, error: { message: `Sem estoque: ${p.nome} (${v.tamanho})` } };
    itens.push({ v, p, q: it.quantidade });
    total += Number(p.preco) * it.quantidade;
  }
  total = Math.round(total * 100) / 100;
  const vendaId = crypto.randomUUID();
  for (const { v, p, q } of itens) {
    v.estoque = (v.estoque as number) - q;
    v.vendidos = (v.vendidos as number) + q;
    db.venda_itens.push({ id: crypto.randomUUID(), venda_id: vendaId, variante_id: v.id, produto_nome: p.nome, tamanho: v.tamanho, preco: p.preco, quantidade: q });
  }
  const cad = args.p_forma === "caderninho";
  const n = cad ? Math.max(1, Math.min(12, args.p_parcelas)) : 1;
  db.vendas.push({
    id: vendaId, loja_id: LOJA_ID, sacola_id: sacola?.id ?? null, total,
    lucro: Math.round(total * Number(sacola?.percentual_lucro ?? 0)) / 100, forma_pagamento: cad ? "fiado" : args.p_forma,
    parcelas: n, cliente_nome: args.p_cliente_nome?.trim() || null, cliente_whatsapp: cad ? whats : null,
    cobranca_automatica: cad && Boolean(whats) && args.p_cobrar_auto, pago: !cad, criado_em: new Date().toISOString(),
  });
  if (cad) {
    const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const dia = (iso: string) => new Date(iso + "T12:00:00");
    const base = Math.trunc((total / n) * 100) / 100;
    for (let i = 1; i <= n; i++) {
      let venc: Date;
      if (args.p_venc_pela_sacola && sacola) {
        const dias = Math.max(0, Math.round((dia(String(sacola.devolver_ate)).getTime() - dia(hoje).getTime()) / 86_400_000));
        venc = dia(hoje);
        venc.setDate(venc.getDate() + Math.ceil((dias * i) / n));
      } else {
        venc = dia(args.p_primeiro_venc ?? hoje);
        if (!args.p_primeiro_venc) venc.setDate(venc.getDate() + 30);
        const d = venc.getDate();
        venc.setDate(1);
        venc.setMonth(venc.getMonth() + i - 1);
        venc.setDate(Math.min(d, new Date(venc.getFullYear(), venc.getMonth() + 1, 0).getDate()));
      }
      db.parcelas.push({
        id: crypto.randomUUID(), loja_id: LOJA_ID, venda_id: vendaId, numero: i, total_parcelas: n,
        valor: i === n ? Math.round((total - base * (n - 1)) * 100) / 100 : base, vence_em: venc.toISOString().slice(0, 10),
        pago_em: null, lembretes: 0, lembretes_atraso: 0, ultimo_lembrete_em: null, criado_em: new Date().toISOString(),
      });
    }
  }
  return { data: vendaId, error: null };
}

/** No demo, receber/desfazer parcela atualiza venda.pago como o gatilho do banco. */
function sincronizarVendas() {
  const db = banco();
  for (const v of db.vendas) {
    if (v.forma_pagamento !== "fiado") continue;
    v.pago = !db.parcelas.some((p) => p.venda_id === v.id && !p.pago_em);
  }
}

const ok = { data: {}, error: null };

export function criarClienteDemo() {
  return {
    from: (tabela: string) => new Consulta(tabela),
    rpc: async (nome: string, args: Record<string, unknown>) => {
      if (nome === "slug_disponivel") return { data: !banco().lojas.some((l) => l.slug === args.p_slug), error: null };
      if (nome === "finalizar_venda") return finalizarVenda(args as unknown as ArgsVenda);
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
