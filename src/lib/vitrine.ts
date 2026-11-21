import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { clientePublico } from "@/lib/supabase/publico";
import { COLUNAS_LOJA_PUBLICA, type Loja, type Produto } from "@/lib/tipos";
import { CONFIG_OK, MODO_DEMO } from "@/lib/config";
import { POR_PAGINA, tagLoja, tagProdutos } from "@/lib/cache";

/*
 * Dados da vitrine pública, com cache no servidor.
 * Ficam guardados até a dona mudar algo (as ações do painel limpam a etiqueta) e,
 * por segurança, no máximo 10 minutos.
 */
const DEZ_MINUTOS = 600;
const COLUNAS_PRODUTO = "id, nome, categoria, preco, fotos, cor, descricao, criado_em";

export const getLojaPublica = cache((slug: string) => {
  if (!MODO_DEMO && !CONFIG_OK) return Promise.resolve(null);
  const s = slug.toLowerCase();
  return unstable_cache(
    async () => {
      const { data } = await clientePublico().from("lojas").select(COLUNAS_LOJA_PUBLICA).eq("slug", s).maybeSingle();
      return (data as Loja | null) ?? null;
    },
    ["loja-publica", s],
    { tags: [tagLoja(s)], revalidate: DEZ_MINUTOS },
  )();
});

/** Resumo leve de todas as peças à venda (sem fotos): categorias, total e datas. */
export const getResumoVitrine = cache((lojaId: string) =>
  unstable_cache(
    async () => {
      const { data } = await clientePublico()
        .from("produtos")
        .select("id, categoria, criado_em, variantes!inner(estoque)")
        .eq("loja_id", lojaId)
        .eq("visivel", true)
        .gt("variantes.estoque", 0)
        .order("criado_em", { ascending: false });
      return ((data ?? []) as { id: string; categoria: string; criado_em: string; variantes: { estoque: number }[] }[])
        .filter((p) => p.variantes.some((v) => v.estoque > 0))
        .map(({ id, categoria, criado_em }) => ({ id, categoria, criado_em }));
    },
    ["vitrine-resumo", lojaId],
    { tags: [tagProdutos(lojaId)], revalidate: DEZ_MINUTOS },
  )(),
);

export type ResumoVitrine = Awaited<ReturnType<typeof getResumoVitrine>>;

/** Busca sem acento e sem diferença de maiúsculas. */
export const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Uma página de peças à venda, filtrada por categoria e busca. */
export const getVitrinePagina = cache(
  (lojaId: string, categoria: string | null, busca: string, pagina: number) =>
    unstable_cache(
      async () => {
        const inicio = (pagina - 1) * POR_PAGINA;

        if (MODO_DEMO) {
          // Demonstração: filtra na memória
          const { data } = await clientePublico()
            .from("produtos")
            .select(`${COLUNAS_PRODUTO}, variantes(id, tamanho, estoque)`)
            .eq("loja_id", lojaId)
            .eq("visivel", true)
            .order("criado_em", { ascending: false });
          const termo = normalizar(busca);
          const todos = ((data ?? []) as unknown as Produto[])
            .map((p) => ({ ...p, variantes: (p.variantes ?? []).filter((v) => v.estoque > 0) }))
            .filter((p) => p.variantes.length > 0)
            .filter((p) => !categoria || p.categoria === categoria)
            .filter((p) => !termo || normalizar(`${p.nome} ${p.cor ?? ""} ${p.descricao ?? ""}`).includes(termo));
          return { produtos: todos.slice(inicio, inicio + POR_PAGINA), total: todos.length };
        }

        // Só os tamanhos com estoque vêm junto (e só peças que têm algum)
        let q = clientePublico()
          .from("produtos")
          .select(`${COLUNAS_PRODUTO}, variantes!inner(id, tamanho, estoque)`, { count: "exact" })
          .eq("loja_id", lojaId)
          .eq("visivel", true)
          .gt("variantes.estoque", 0);
        if (categoria) q = q.eq("categoria", categoria);
        const termo = busca.replace(/[,()*%"\\:]/g, " ").trim();
        if (termo) q = q.or(`nome.ilike.*${termo}*,cor.ilike.*${termo}*,descricao.ilike.*${termo}*`);
        const { data, count } = await q.order("criado_em", { ascending: false }).range(inicio, inicio + POR_PAGINA - 1);
        return { produtos: (data ?? []) as unknown as Produto[], total: count ?? 0 };
      },
      ["vitrine-pagina", lojaId, categoria ?? "", busca, String(pagina)],
      { tags: [tagProdutos(lojaId)], revalidate: DEZ_MINUTOS },
    )(),
);

export const getProdutoPublico = cache((lojaId: string, id: string) =>
  unstable_cache(
    async () => {
      const { data } = await clientePublico()
        .from("produtos")
        .select(`${COLUNAS_PRODUTO}, variantes(id, tamanho, estoque)`)
        .eq("loja_id", lojaId)
        .eq("id", id)
        .eq("visivel", true)
        .maybeSingle();
      return (data as unknown as Produto | null) ?? null;
    },
    ["produto-publico", lojaId, id],
    { tags: [tagProdutos(lojaId)], revalidate: DEZ_MINUTOS },
  )(),
);

export { ordenarTamanhos } from "@/lib/tamanhos";
