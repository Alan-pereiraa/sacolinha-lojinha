import "server-only";

/**
 * Cliente mínimo da Evolution API v2 (https://github.com/EvolutionAPI/evolution-api).
 * Roda no seu servidor (Docker). Usa a conexão "WHATSAPP-BAILEYS": WhatsApp Web, gratuito, não oficial.
 */

const URL_BASE = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
const CHAVE = process.env.EVOLUTION_API_KEY;

export const evolutionConfigurada = Boolean(URL_BASE && CHAVE);

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  if (!URL_BASE || !CHAVE) throw new Error("Evolution API não configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY).");
  const r = await fetch(`${URL_BASE}${caminho}`, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: CHAVE, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const texto = await r.text();
  const corpo = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const msg = corpo?.response?.message ?? corpo?.message ?? r.statusText;
    throw new Error(`Evolution API ${r.status}: ${Array.isArray(msg) ? msg.join(", ") : msg}`);
  }
  return corpo as T;
}

export type EstadoConexao = "open" | "connecting" | "close" | "inexistente";

export async function criarInstancia(nome: string) {
  return chamar<{ qrcode?: { base64?: string } }>("/instance/create", {
    method: "POST",
    body: JSON.stringify({ instanceName: nome, integration: "WHATSAPP-BAILEYS", qrcode: true }),
  });
}

/** Devolve o QR code (data URL) para escanear no celular. */
export async function pedirQrCode(nome: string) {
  const r = await chamar<{ base64?: string; pairingCode?: string }>(`/instance/connect/${encodeURIComponent(nome)}`);
  return r.base64 ?? null;
}

export async function estadoConexao(nome: string): Promise<EstadoConexao> {
  try {
    const r = await chamar<{ instance?: { state?: EstadoConexao } }>(`/instance/connectionState/${encodeURIComponent(nome)}`);
    return r.instance?.state ?? "close";
  } catch (e) {
    if (/ 404:/.test((e as Error).message)) return "inexistente";
    throw e;
  }
}

export async function desconectar(nome: string) {
  await chamar(`/instance/logout/${encodeURIComponent(nome)}`, { method: "DELETE" });
}

export type Grupo = { id: string; subject: string; size?: number };

export async function listarGrupos(nome: string) {
  const r = await chamar<Grupo[]>(`/group/fetchAllGroups/${encodeURIComponent(nome)}?getParticipants=false`);
  return (r ?? []).map((g) => ({ id: g.id, subject: g.subject, size: g.size })).sort((a, b) => a.subject.localeCompare(b.subject));
}

export async function enviarImagem(nome: string, para: string, urlImagem: string, legenda: string) {
  return chamar(`/message/sendMedia/${encodeURIComponent(nome)}`, {
    method: "POST",
    body: JSON.stringify({ number: para, mediatype: "image", mimetype: "image/jpeg", media: urlImagem, caption: legenda, fileName: "novidade.jpg" }),
  });
}

export async function enviarTexto(nome: string, para: string, texto: string) {
  return chamar(`/message/sendText/${encodeURIComponent(nome)}`, {
    method: "POST",
    body: JSON.stringify({ number: para, text: texto, linkPreview: true }),
  });
}
