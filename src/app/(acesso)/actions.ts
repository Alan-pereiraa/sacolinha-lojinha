"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/formatar";

export type EstadoForm = { erro?: string; ok?: string } | undefined;

async function origem() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function traduzErro(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.";
  if (/already registered|already been registered/i.test(msg)) return "Este e-mail já tem conta. Tente entrar.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (/lojas_slug_key|duplicate key/i.test(msg)) return "Esse endereço de vitrine já está em uso. Escolha outro.";
  return "Não deu certo agora. Tente de novo em instantes.";
}

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const voltar = String(form.get("voltar") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: traduzErro(error.message) };

  redirect(voltar.startsWith("/painel") ? voltar : "/painel");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const SLUGS_RESERVADOS = ["painel", "login", "cadastro", "auth", "api", "sair", "p", "admin", "www", "esqueci"];

export async function checarSlug(slug: string) {
  const s = slugify(slug);
  if (s.length < 3) return { ok: false, slug: s, motivo: "Use pelo menos 3 letras." };
  if (SLUGS_RESERVADOS.includes(s)) return { ok: false, slug: s, motivo: "Esse endereço é reservado. Escolha outro." };
  const supabase = await createClient();
  const { data } = await supabase.rpc("slug_disponivel", { p_slug: s });
  return data ? { ok: true, slug: s } : { ok: false, slug: s, motivo: "Esse endereço já está em uso." };
}

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Conte seu nome."),
  email: z.email("E-mail inválido."),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "WhatsApp com DDD, ex.: (42) 99999-0000."),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  loja_nome: z.string().trim().min(2, "Dê um nome para a loja."),
  loja_slug: z
    .string()
    .transform(slugify)
    .refine((v) => v.length >= 3, "O endereço precisa ter pelo menos 3 letras.")
    .refine((v) => !SLUGS_RESERVADOS.includes(v), "Esse endereço é reservado. Escolha outro."),
  cidade: z.string().trim().optional(),
  tema: z.enum(["rosa", "lilas", "pessego", "salvia"]).default("rosa"),
  empresa_nome: z.string().trim().min(2, "Diga o nome da empresa que te passa a sacola.").max(60),
  sacola_recebida_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe quando recebeu a sacola."),
  sacola_dias: z.coerce.number().int().min(7).max(180),
  percentual_lucro: z.coerce.number().min(0).max(100),
  termos: z.literal("on", { error: "Aceite os termos para continuar." }),
});

export async function cadastrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const parsed = cadastroSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: livre } = await supabase.rpc("slug_disponivel", { p_slug: d.loja_slug });
  if (!livre) return { erro: "Esse endereço de vitrine já está em uso. Escolha outro." };

  // Número salvo com DDI do Brasil
  const whatsapp = d.whatsapp.startsWith("55") && d.whatsapp.length >= 12 ? d.whatsapp : `55${d.whatsapp}`;

  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.senha,
    options: {
      emailRedirectTo: `${await origem()}/auth/confirm?next=/painel`,
      data: {
        nome: d.nome,
        whatsapp,
        loja_nome: d.loja_nome,
        loja_slug: d.loja_slug,
        cidade: d.cidade ?? "",
        tema: d.tema,
        empresa_nome: d.empresa_nome,
        sacola_recebida_em: d.sacola_recebida_em,
        sacola_dias: String(d.sacola_dias),
        percentual_lucro: String(d.percentual_lucro),
      },
    },
  });
  if (error) return { erro: traduzErro(error.message) };

  if (data.session) redirect("/painel");
  return { ok: "Quase lá! Enviamos um link para o seu e-mail. Clique nele para ativar a sua loja." };
}

export async function esqueciSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { erro: "Informe seu e-mail." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origem()}/auth/confirm?next=/painel/senha`,
  });
  // Mesma resposta exista ou não a conta
  return { ok: "Se existir uma conta com esse e-mail, você vai receber um link para criar uma senha nova." };
}
