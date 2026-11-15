/* Dados de exemplo do modo demonstração (sem Supabase). */

const id = (n: number) => `0d3a1c2e-5ac0-4000-8000-${String(n).padStart(12, "0")}`;

/** Código EAN-13 válido a partir de 12 dígitos. */
function ean13(base12: string) {
  const soma = base12.split("").reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return base12 + ((10 - (soma % 10)) % 10);
}

export const DEMO_USER = {
  id: id(1),
  email: "demo@sacolinha.app",
  user_metadata: { nome: "Marina" },
};

export const LOJA_ID = id(2);
export const SACOLA_ID = id(3);

type Linha = Record<string, unknown>;

export function dadosIniciais(): Record<string, Linha[]> {
  const agora = new Date();
  const diasAtras = (d: number) => new Date(agora.getTime() - d * 86_400_000).toISOString();

  const produtos: [string, string, number, string, [string, number, number][]][] = [
    ["Conjunto Renda Rosé", "conjuntos", 89.9, "Renda macia, bojo leve sem aro e calcinha com cós em renda.", [["40", 1, 1], ["42", 1, 2], ["44", 0, 1], ["46", 2, 0]]],
    ["Sutiã Push-up Delicate", "sutias", 59.9, "Bojo com efeito push-up e alças reguláveis.", [["40", 2, 0], ["42", 1, 1], ["44", 1, 1]]],
    ["Calcinha Fio Renda", "calcinhas", 24.9, "Renda delicada e elástico que não marca.", [["P", 3, 2], ["M", 2, 4], ["G", 2, 2], ["GG", 0, 1]]],
    ["Body Rendado Noite", "bodies", 99.9, "Body todo em renda com fechamento em colchetes.", [["P", 1, 0], ["M", 0, 1]]],
    ["Camisola Cetim Blush", "camisolas", 79.9, "Cetim leve com alças finas e acabamento em renda.", [["M", 1, 1], ["G", 1, 0]]],
    ["Calcinha Cintura Alta", "calcinhas", 29.9, "Microfibra com cintura alta e toque gelado.", [["M", 2, 1], ["G", 2, 0], ["GG", 1, 1]]],
    ["Conjunto Tule Bordado", "conjuntos", 109.9, "Tule transparente com bordado floral.", [["42", 1, 0], ["44", 1, 1]]],
    ["Body Cavado Liso", "bodies", 84.9, "Liso, cavado e confortável para o dia a dia.", [["P", 1, 0], ["M", 1, 0], ["G", 1, 0]]],
  ];

  const linhasProdutos: Linha[] = [];
  const linhasVariantes: Linha[] = [];
  let n = 100;
  produtos.forEach(([nome, categoria, preco, descricao, tams], i) => {
    const pid = id(10 + i);
    linhasProdutos.push({
      id: pid, loja_id: LOJA_ID, sacola_id: SACOLA_ID, nome, categoria, preco, descricao,
      cor: "Rosé", fotos: [], visivel: true, novidade_enviada_em: i < 3 ? diasAtras(5) : null,
      criado_em: diasAtras(14 - i),
    });
    tams.forEach(([tamanho, estoque, vendidos]) => {
      linhasVariantes.push({
        id: id(n), produto_id: pid, loja_id: LOJA_ID, tamanho, estoque, vendidos,
        codigo_barras: ean13(`789123${String(n).padStart(6, "0")}`),
      });
      n++;
    });
  });

  const venda = (k: number, dias: number, forma: string, total: number, itens: [string, string][], pagador: string | null = null, parcelas = 1, pago = true) => ({
    venda: { id: id(300 + k), loja_id: LOJA_ID, sacola_id: SACOLA_ID, total, lucro: Math.round(total * 30) / 100, forma_pagamento: forma, parcelas, pagador, pago, criado_em: diasAtras(dias) },
    itens: itens.map(([produto_nome, tamanho], j) => ({ id: id(400 + k * 10 + j), venda_id: id(300 + k), variante_id: null, produto_nome, tamanho, preco: total / itens.length, quantidade: 1 })),
  });
  const vendas = [
    venda(1, 0, "pix", 89.9, [["Conjunto Renda Rosé", "42"]]),
    venda(2, 1, "cartao", 74.7, [["Calcinha Fio Renda", "M"], ["Calcinha Fio Renda", "M"], ["Calcinha Fio Renda", "P"]]),
    venda(3, 2, "fiado", 99.9, [["Body Rendado Noite", "M"]], "Juliana", 3, false),
    venda(4, 3, "dinheiro", 79.9, [["Camisola Cetim Blush", "M"]]),
    venda(5, 4, "fiado", 59.9, [["Sutiã Push-up Delicate", "44"]], "Patrícia do salão", 1, false),
    venda(6, 6, "pix", 119.6, [["Calcinha Cintura Alta", "M"], ["Calcinha Fio Renda", "G"], ["Sutiã Push-up Delicate", "42"]]),
  ];

  return {
    lojas: [{
      id: LOJA_ID, dono_id: DEMO_USER.id, nome: "Boutique Rosé", slug: "boutique-rose", cidade: "Guarapuava, PR",
      whatsapp: "5542999990000", tema: "rosa", fonte: "elegante", formato: "arco", logo_url: null, capa_url: null,
      wa_instancia: null, wa_grupo_id: null, wa_grupo_nome: null, criado_em: diasAtras(20),
    }],
    sacolas: [{
      id: SACOLA_ID, loja_id: LOJA_ID, nome: "Sacola de Novembro", recebida_em: diasAtras(14).slice(0, 10),
      devolver_ate: new Date(agora.getTime() + 46 * 86_400_000).toISOString().slice(0, 10),
      percentual_lucro: 30, status: "aberta", fechada_em: null, criado_em: diasAtras(14),
    }],
    produtos: linhasProdutos,
    variantes: linhasVariantes,
    vendas: vendas.map((v) => v.venda),
    venda_itens: vendas.flatMap((v) => v.itens),
  };
}
