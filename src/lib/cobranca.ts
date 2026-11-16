/* Mensagens de cobrança do Caderninho — usadas na tela, no envio manual e no agendador. */
import { brl } from "@/lib/formatar";

export const MENSAGEM_PADRAO =
  "Oi, {nome}! Tudo bem? 💕 Passando para lembrar do seu caderninho na {loja}: parcela {parcela} de {valor}, que {situacao}.{pix} Qualquer dúvida é só me chamar!";

export const VARIAVEIS_MENSAGEM = ["{nome}", "{loja}", "{parcela}", "{valor}", "{situacao}", "{vencimento}", "{pix}"];

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília. */
export function hojeBrasil(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function diasEntre(deISO: string, ateISO: string) {
  const a = Date.UTC(+deISO.slice(0, 4), +deISO.slice(5, 7) - 1, +deISO.slice(8, 10));
  const b = Date.UTC(+ateISO.slice(0, 4), +ateISO.slice(5, 7) - 1, +ateISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** "vence amanhã", "vence hoje", "venceu em 10/11"… */
export function situacaoDaParcela(venceEm: string, hoje = hojeBrasil()) {
  const d = diasEntre(hoje, venceEm);
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d > 1) return `vence em ${dataBR(venceEm)}`;
  return `venceu em ${dataBR(venceEm)}`;
}

export type StatusParcela = "paga" | "atrasada" | "hoje" | "proxima" | "futura";

export function statusDaParcela(p: { vence_em: string; pago_em: string | null }, hoje = hojeBrasil()): StatusParcela {
  if (p.pago_em) return "paga";
  const d = diasEntre(hoje, p.vence_em);
  if (d < 0) return "atrasada";
  if (d === 0) return "hoje";
  if (d <= 7) return "proxima";
  return "futura";
}

export function montarMensagem(
  modelo: string | null | undefined,
  dados: {
    nome: string | null;
    loja: string;
    numero: number;
    total: number;
    valor: number;
    venceEm: string;
    chavePix?: string | null;
  },
  hoje = hojeBrasil(),
) {
  const primeiroNome = (dados.nome ?? "").trim().split(/\s+/)[0] || "tudo bem";
  const pix = dados.chavePix?.trim() ? ` Se preferir, o Pix é: ${dados.chavePix.trim()}.` : "";
  const trocas: Record<string, string> = {
    "{nome}": primeiroNome,
    "{loja}": dados.loja,
    "{parcela}": dados.total > 1 ? `${dados.numero}/${dados.total}` : "única",
    "{valor}": brl(dados.valor),
    "{situacao}": situacaoDaParcela(dados.venceEm, hoje),
    "{vencimento}": `${dados.venceEm.slice(8, 10)}/${dados.venceEm.slice(5, 7)}/${dados.venceEm.slice(0, 4)}`,
    "{pix}": pix,
  };
  let texto = (modelo?.trim() || MENSAGEM_PADRAO);
  for (const [chave, valor] of Object.entries(trocas)) texto = texto.split(chave).join(valor);
  return texto.replace(/\s+\./g, ".").trim();
}

/** Link wa.me com a mensagem pronta (funciona sem a Evolution API). */
export function linkCobranca(whatsapp: string | null | undefined, mensagem: string) {
  const n = (whatsapp ?? "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : null;
}
