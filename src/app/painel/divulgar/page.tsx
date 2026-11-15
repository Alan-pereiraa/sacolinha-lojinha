import type { Metadata } from "next";
import { getMinhaLoja } from "@/lib/loja";
import { evolutionConfigurada } from "@/lib/evolution";
import type { Produto } from "@/lib/tipos";
import { PainelDivulgar } from "./painel-divulgar";

export const metadata: Metadata = { title: "Divulgar no WhatsApp" };

export default async function DivulgarPage() {
  const { supabase, loja } = await getMinhaLoja();

  const { data } = await supabase
    .from("produtos")
    .select("id, nome, preco, fotos, categoria, novidade_enviada_em, variantes(tamanho, estoque)")
    .eq("loja_id", loja.id)
    .eq("visivel", true)
    .order("criado_em", { ascending: false })
    .limit(60);
  const produtos = ((data ?? []) as unknown as Produto[]).filter((p) => (p.variantes ?? []).some((v) => v.estoque > 0));

  return (
    <>
      <header>
        <h1 className="titulo text-4xl">Divulgar no <span className="italic text-deep">WhatsApp</span></h1>
        <p className="text-muted">Mande as novidades para o grupo das suas clientes, com foto, tamanhos, preço e o link da peça.</p>
      </header>
      {!evolutionConfigurada ? (
        <section className="cartao flex flex-col gap-2">
          <h2 className="font-bold">Falta configurar o servidor do WhatsApp</h2>
          <p className="text-sm text-muted">
            Suba a Evolution API (veja o README, seção “WhatsApp”) e preencha <code>EVOLUTION_API_URL</code> e{" "}
            <code>EVOLUTION_API_KEY</code> no <code>.env.local</code>.
          </p>
        </section>
      ) : (
        <PainelDivulgar
          lojaNome={loja.nome}
          lojaSlug={loja.slug}
          site={(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}
          temInstancia={Boolean(loja.wa_instancia)}
          grupo={loja.wa_grupo_id ? { id: loja.wa_grupo_id, nome: loja.wa_grupo_nome ?? "Grupo" } : null}
          produtos={produtos}
        />
      )}
    </>
  );
}
