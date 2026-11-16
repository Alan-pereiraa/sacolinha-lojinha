"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMinhaLoja, getSacolaAberta } from "@/lib/loja";
import { hojeBrasil, montarMensagem } from "@/lib/cobranca";
import * as evo from "@/lib/evolution";

export type Estado = { erro?: string; ok?: string } | undefined;

function erroAmigavel(msg: string) {
  if (/variantes_loja_id_codigo_barras_key|duplicate key/i.test(msg))
    return "Esse código de barras já está cadastrado em outra peça.";
  if (/Sem estoque/i.test(msg)) return msg.replace(/^.*Sem estoque/, "Sem estoque");
  if (/sacolas_uma_aberta/i.test(msg)) return "Já existe uma sacola aberta. Feche a atual antes de abrir outra.";
  if (/Caderninho: informe o nome/i.test(msg)) return "No caderninho, informe o nome de quem vai pagar.";
  if (/WhatsApp da cliente inválido/i.test(msg)) return "WhatsApp da cliente inválido: use DDD + número, ex.: (42) 99999-0000.";
  return "Não deu certo agora. Tente de novo.";
}

// ───────────────────────── vendas

const vendaSchema = z.object({
  itens: z.array(z.object({ variante_id: z.uuid(), quantidade: z.number().int().min(1).max(50) })).min(1),
  forma: z.enum(["pix", "cartao", "dinheiro", "caderninho"]),
  parcelas: z.number().int().min(1).max(12),
  clienteNome: z.string().max(80).optional(),
  clienteWhatsapp: z.string().max(30).optional(),
  vencimento: z.enum(["data", "sacola"]).default("data"),
  primeiroVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cobrarAuto: z.boolean().default(true),
});

export async function finalizarVenda(entrada: z.input<typeof vendaSchema>) {
  const parsed = vendaSchema.safeParse(entrada);
  if (!parsed.success) return { erro: "Confira as peças e o pagamento." };
  const { supabase } = await getMinhaLoja();
  const d = parsed.data;
  if (d.forma === "caderninho") {
    if (!d.clienteNome?.trim()) return { erro: "No caderninho, informe o nome de quem vai pagar." };
    if (d.vencimento === "data" && d.primeiroVencimento && d.primeiroVencimento < hojeBrasil())
      return { erro: "A data do primeiro vencimento já passou." };
  }

  const caderninho = d.forma === "caderninho";
  const { data, error } = await supabase.rpc("finalizar_venda", {
    p_itens: d.itens,
    p_forma: d.forma,
    p_parcelas: caderninho ? d.parcelas : 1,
    p_cliente_nome: d.clienteNome?.trim() || null,
    p_cliente_whatsapp: caderninho ? d.clienteWhatsapp?.trim() || null : null,
    p_primeiro_venc: caderninho && d.vencimento === "data" ? d.primeiroVencimento ?? null : null,
    p_venc_pela_sacola: caderninho && d.vencimento === "sacola",
    p_cobrar_auto: d.cobrarAuto,
  });
  if (error) return { erro: erroAmigavel(error.message) };
  revalidatePath("/painel", "layout");
  return { ok: true as const, vendaId: data as string };
}

/** Procura uma variante pelo código de barras da etiqueta. */
export async function buscarPorCodigo(codigo: string) {
  const { supabase, loja } = await getMinhaLoja();
  const limpo = codigo.trim();
  if (!limpo) return null;
  const { data } = await supabase
    .from("variantes")
    .select("id, tamanho, estoque, codigo_barras, produtos!inner(id, nome, preco, categoria, fotos)")
    .eq("loja_id", loja.id)
    .eq("codigo_barras", limpo)
    .maybeSingle();
  if (!data) return null;
  const p = Array.isArray(data.produtos) ? data.produtos[0] : data.produtos;
  return {
    variante_id: data.id as string,
    tamanho: data.tamanho as string,
    estoque: data.estoque as number,
    codigo: data.codigo_barras as string,
    nome: p.nome as string,
    preco: Number(p.preco),
    categoria: p.categoria as string,
    foto: (p.fotos as string[])[0] ?? null,
  };
}

// ───────────────────────── caderninho

export async function receberParcela(parcelaId: string) {
  const { supabase, loja } = await getMinhaLoja();
  await supabase.from("parcelas").update({ pago_em: new Date().toISOString() }).eq("id", parcelaId).eq("loja_id", loja.id);
  revalidatePath("/painel", "layout");
}

export async function desfazerRecebimento(parcelaId: string) {
  const { supabase, loja } = await getMinhaLoja();
  await supabase.from("parcelas").update({ pago_em: null }).eq("id", parcelaId).eq("loja_id", loja.id);
  revalidatePath("/painel", "layout");
}

export async function mudarVencimento(parcelaId: string, novaData: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return { erro: "Data inválida." };
  const { supabase, loja } = await getMinhaLoja();
  const { error } = await supabase
    .from("parcelas")
    .update({ vence_em: novaData, lembretes_atraso: 0, ultimo_lembrete_em: null })
    .eq("id", parcelaId)
    .eq("loja_id", loja.id);
  if (error) return { erro: "Não deu para mudar a data." };
  revalidatePath("/painel", "layout");
  return { ok: true as const };
}

export async function ligarCobrancaDaVenda(vendaId: string, ligar: boolean) {
  const { supabase, loja } = await getMinhaLoja();
  await supabase.from("vendas").update({ cobranca_automatica: ligar }).eq("id", vendaId).eq("loja_id", loja.id);
  revalidatePath("/painel/caderninho");
}

/** Envia a cobrança agora pelo WhatsApp conectado (Evolution API). */
export async function cobrarAgora(parcelaId: string) {
  const { supabase, loja } = await getMinhaLoja();
  if (!evo.evolutionConfigurada || !loja.wa_instancia) {
    return { erro: "Conecte o WhatsApp em Divulgar para enviar daqui. Enquanto isso, use o botão “Abrir no WhatsApp”." };
  }
  const { data } = await supabase
    .from("parcelas")
    .select("id, numero, total_parcelas, valor, vence_em, pago_em, lembretes, vendas(cliente_nome, cliente_whatsapp)")
    .eq("id", parcelaId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!data || data.pago_em) return { erro: "Parcela não encontrada ou já paga." };
  const venda = (Array.isArray(data.vendas) ? data.vendas[0] : data.vendas) as { cliente_nome: string | null; cliente_whatsapp: string | null } | null;
  if (!venda?.cliente_whatsapp) return { erro: "Essa venda não tem WhatsApp da cliente." };

  const texto = montarMensagem(loja.cobranca_mensagem, {
    nome: venda.cliente_nome,
    loja: loja.nome,
    numero: data.numero,
    total: data.total_parcelas,
    valor: Number(data.valor),
    venceEm: data.vence_em,
    chavePix: loja.chave_pix,
  });
  try {
    await evo.enviarTexto(loja.wa_instancia, venda.cliente_whatsapp, texto);
  } catch {
    return { erro: "O WhatsApp não respondeu. Confira a conexão em Divulgar." };
  }
  await supabase
    .from("parcelas")
    .update({ ultimo_lembrete_em: hojeBrasil(), lembretes: (data.lembretes ?? 0) + 1 })
    .eq("id", parcelaId);
  revalidatePath("/painel/caderninho");
  return { ok: "Cobrança enviada no WhatsApp." };
}

const cobrancaSchema = z.object({
  cobranca_ativa: z.boolean(),
  cobranca_dias_antes: z.coerce.number().int().min(0).max(15),
  cobranca_repetir_dias: z.coerce.number().int().min(1).max(30),
  cobranca_max_atraso: z.coerce.number().int().min(0).max(10),
  cobranca_mensagem: z.string().trim().max(700),
  chave_pix: z.string().trim().max(120),
});

export async function salvarCobranca(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, loja } = await getMinhaLoja();
  const parsed = cobrancaSchema.safeParse({ ...Object.fromEntries(form), cobranca_ativa: form.get("cobranca_ativa") === "on" });
  if (!parsed.success) return { erro: "Confira os campos da cobrança." };
  const d = parsed.data;
  const { error } = await supabase
    .from("lojas")
    .update({ ...d, cobranca_mensagem: d.cobranca_mensagem || null, chave_pix: d.chave_pix || null })
    .eq("id", loja.id);
  if (error) return { erro: "Não deu para salvar." };
  revalidatePath("/painel/caderninho");
  return { ok: "Cobrança salva!" };
}

// ───────────────────────── produtos

const varianteSchema = z.object({
  id: z.string().optional(),
  tamanho: z.string().trim().min(1, "Informe o tamanho de cada variação."),
  codigo_barras: z.string().trim().max(64).optional(),
  estoque: z.coerce.number().int().min(0).max(999),
});

const produtoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(2, "Dê um nome para a peça."),
  categoria: z.enum(["conjuntos", "sutias", "calcinhas", "bodies", "camisolas", "outros"]),
  preco: z
    .string()
    .transform((v) => Number(v.replace(/\./g, "").replace(",", ".")))
    .refine((v) => Number.isFinite(v) && v >= 0, "Preço inválido."),
  cor: z.string().trim().max(40).optional(),
  descricao: z.string().trim().max(600).optional(),
  visivel: z.boolean(),
  fotos: z.array(z.url()).max(6),
  variantes: z.array(varianteSchema).min(1, "Adicione pelo menos um tamanho."),
});

export async function salvarProduto(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, loja } = await getMinhaLoja();
  let variantesBrutas: unknown;
  try {
    variantesBrutas = JSON.parse(String(form.get("variantes") ?? "[]"));
  } catch {
    return { erro: "Confira os tamanhos." };
  }

  const parsed = produtoSchema.safeParse({
    id: form.get("id") || undefined,
    nome: form.get("nome"),
    categoria: form.get("categoria"),
    preco: String(form.get("preco") ?? ""),
    cor: form.get("cor") || undefined,
    descricao: form.get("descricao") || undefined,
    visivel: form.get("visivel") === "on",
    fotos: form.getAll("fotos").map(String).filter(Boolean),
    variantes: variantesBrutas,
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const d = parsed.data;

  const codigos = d.variantes.map((v) => v.codigo_barras).filter(Boolean);
  if (new Set(codigos).size !== codigos.length) return { erro: "Há códigos de barras repetidos entre os tamanhos." };

  const dadosProduto = {
    nome: d.nome,
    categoria: d.categoria,
    preco: d.preco,
    cor: d.cor ?? null,
    descricao: d.descricao ?? null,
    visivel: d.visivel,
    fotos: d.fotos,
  };

  let produtoId = d.id;
  if (produtoId) {
    const { error } = await supabase.from("produtos").update(dadosProduto).eq("id", produtoId).eq("loja_id", loja.id);
    if (error) return { erro: erroAmigavel(error.message) };
  } else {
    const sacola = await getSacolaAberta(loja.id);
    const { data, error } = await supabase
      .from("produtos")
      .insert({ ...dadosProduto, loja_id: loja.id, sacola_id: sacola?.id ?? null })
      .select("id")
      .single();
    if (error) return { erro: erroAmigavel(error.message) };
    produtoId = data.id as string;
  }

  // Variantes: atualiza as existentes, cria as novas, remove (ou zera) as retiradas
  const { data: atuais } = await supabase.from("variantes").select("id, vendidos").eq("produto_id", produtoId);
  const manter = new Set(d.variantes.map((v) => v.id).filter(Boolean));
  for (const a of atuais ?? []) {
    if (manter.has(a.id)) continue;
    if (a.vendidos > 0) await supabase.from("variantes").update({ estoque: 0 }).eq("id", a.id);
    else await supabase.from("variantes").delete().eq("id", a.id);
  }
  for (const v of d.variantes) {
    const linha = {
      tamanho: v.tamanho,
      codigo_barras: v.codigo_barras || null,
      estoque: v.estoque,
    };
    const { error } = v.id
      ? await supabase.from("variantes").update(linha).eq("id", v.id).eq("loja_id", loja.id)
      : await supabase.from("variantes").insert({ ...linha, produto_id: produtoId, loja_id: loja.id });
    if (error) return { erro: erroAmigavel(error.message) };
  }

  revalidatePath("/painel", "layout");
  revalidatePath(`/${loja.slug}`, "layout");
  redirect("/painel/sacola?salvo=1");
}

export async function excluirProduto(produtoId: string) {
  const { supabase, loja } = await getMinhaLoja();
  const { data: vendidas } = await supabase
    .from("variantes")
    .select("vendidos")
    .eq("produto_id", produtoId)
    .gt("vendidos", 0)
    .limit(1);
  if (vendidas && vendidas.length) {
    // Já teve venda: só esconde, para manter o histórico
    await supabase.from("produtos").update({ visivel: false }).eq("id", produtoId).eq("loja_id", loja.id);
    await supabase.from("variantes").update({ estoque: 0 }).eq("produto_id", produtoId);
  } else {
    await supabase.from("produtos").delete().eq("id", produtoId).eq("loja_id", loja.id);
  }
  revalidatePath("/painel", "layout");
  redirect("/painel/sacola");
}

// ───────────────────────── sacolas

export async function fecharSacola(sacolaId: string) {
  const { supabase, loja } = await getMinhaLoja();
  await supabase
    .from("sacolas")
    .update({ status: "fechada", fechada_em: new Date().toISOString() })
    .eq("id", sacolaId)
    .eq("loja_id", loja.id);
  // Peças que voltam para a revendedora saem da vitrine
  const { data: prods } = await supabase.from("produtos").select("id").eq("sacola_id", sacolaId);
  const ids = ((prods ?? []) as { id: string }[]).map((p) => p.id);
  if (ids.length) await supabase.from("produtos").update({ visivel: false }).in("id", ids);
  revalidatePath("/painel", "layout");
  redirect(`/painel/sacola/acerto/${sacolaId}`);
}

const novaSacolaSchema = z.object({
  nome: z.string().trim().min(2),
  recebida_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dias: z.coerce.number().int().min(7).max(180),
  percentual_lucro: z.coerce.number().min(0).max(100),
});

export async function abrirSacola(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, loja } = await getMinhaLoja();
  const parsed = novaSacolaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { erro: "Confira os dados da sacola." };
  const d = parsed.data;
  const devolver = new Date(d.recebida_em + "T12:00:00");
  devolver.setDate(devolver.getDate() + d.dias);
  const { error } = await supabase.from("sacolas").insert({
    loja_id: loja.id,
    nome: d.nome,
    recebida_em: d.recebida_em,
    devolver_ate: devolver.toISOString().slice(0, 10),
    percentual_lucro: d.percentual_lucro,
  });
  if (error) return { erro: erroAmigavel(error.message) };
  revalidatePath("/painel", "layout");
  redirect("/painel/sacola");
}

// ───────────────────────── loja (white label)

const lojaSchema = z.object({
  nome: z.string().trim().min(2).max(60),
  cidade: z.string().trim().max(60).optional(),
  whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10 && v.length <= 13, "WhatsApp inválido."),
  tema: z.enum(["rosa", "lilas", "pessego", "salvia"]),
  fonte: z.enum(["elegante", "romantica", "moderna"]),
  formato: z.enum(["arco", "suave", "reto"]),
  logo_url: z.union([z.url(), z.literal("")]).optional(),
  capa_url: z.union([z.url(), z.literal("")]).optional(),
});

export async function salvarLoja(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, loja } = await getMinhaLoja();
  const parsed = lojaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const d = parsed.data;
  const whatsapp = d.whatsapp.startsWith("55") && d.whatsapp.length >= 12 ? d.whatsapp : `55${d.whatsapp}`;
  const { error } = await supabase
    .from("lojas")
    .update({
      nome: d.nome,
      cidade: d.cidade || null,
      whatsapp,
      tema: d.tema,
      fonte: d.fonte,
      formato: d.formato,
      logo_url: d.logo_url || null,
      capa_url: d.capa_url || null,
    })
    .eq("id", loja.id);
  if (error) return { erro: erroAmigavel(error.message) };
  revalidatePath("/painel", "layout");
  revalidatePath(`/${loja.slug}`, "layout");
  return { ok: "Loja salva! A vitrine já está atualizada." };
}

// ───────────────────────── senha

export async function trocarSenha(_: Estado, form: FormData): Promise<Estado> {
  const { supabase } = await getMinhaLoja();
  const senha = String(form.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não deu para trocar a senha. Peça um link novo." };
  return { ok: "Senha trocada!" };
}
