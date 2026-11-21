"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { cadastrar, checarSlug } from "../actions";
import { slugify } from "@/lib/formatar";
import { TEMAS, type TemaId } from "@/lib/temas";
import { IconeCheck } from "@/components/icones";
import { AvisoConfig } from "@/components/aviso-config";

const PASSOS = [
  { titulo: "Seus dados", sub: "Nome, contato e senha" },
  { titulo: "Sua loja", sub: "Nome, endereço e cor" },
  { titulo: "Sua sacola", sub: "Prazo e lucro" },
];

export function WizardCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, undefined);
  const [passo, setPasso] = useState(0);
  const [nomeLoja, setNomeLoja] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ ok: boolean; motivo?: string } | null>(null);
  const [tema, setTema] = useState<TemaId>("rosa");
  const etapas = useRef<(HTMLFieldSetElement | null)[]>([]);

  const hoje = new Date().toISOString().slice(0, 10);

  async function verificarSlug(valor: string) {
    if (!valor) return setSlugStatus(null);
    const r = await checarSlug(valor);
    setSlug(r.slug);
    setSlugStatus({ ok: r.ok, motivo: r.motivo });
  }

  function avancar() {
    const atual = etapas.current[passo];
    const campos = atual ? Array.from(atual.querySelectorAll<HTMLInputElement>("input, select")) : [];
    for (const c of campos) {
      if (!c.checkValidity()) {
        c.reportValidity();
        return;
      }
    }
    if (passo === 1 && slugStatus && !slugStatus.ok) return;
    setPasso((p) => Math.min(2, p + 1));
  }

  if (estado?.ok) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-4 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-deep text-white">
          <IconeCheck tamanho={30} />
        </span>
        <h2 className="titulo text-4xl">Confira seu <span className="italic text-deep">e-mail</span></h2>
        <p className="text-muted">{estado.ok}</p>
        <Link href="/login" className="font-bold text-deep">Ir para o login</Link>
      </div>
    );
  }

  return (
    <form action={acao} className="flex w-full max-w-xl flex-col gap-6" noValidate={false}>
      <ol className="flex gap-2" aria-label="Passos do cadastro">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="flex flex-1 flex-col gap-2">
            <span className={`h-1.5 rounded-full ${i <= passo ? "bg-deep" : "bg-petal"}`} />
            <span className={`text-xs font-bold ${i === passo ? "text-deep" : "text-muted"}`}>
              {i + 1}. {p.titulo}
            </span>
          </li>
        ))}
      </ol>

      <AvisoConfig />
      {estado?.erro && (
        <p role="alert" className="rounded-2xl bg-soft px-4 py-3 text-sm font-semibold text-deep">{estado.erro}</p>
      )}

      {/* Passo 1 */}
      <fieldset ref={(el) => { etapas.current[0] = el; }} className={passo === 0 ? "flex flex-col gap-4" : "hidden"}>
        <legend className="titulo mb-4 text-4xl">Primeiro, <span className="italic text-deep">você</span></legend>
        <div className="flex flex-col gap-2">
          <label htmlFor="nome" className="rotulo">Seu nome</label>
          <input id="nome" name="nome" required minLength={2} className="campo" placeholder="Como suas clientes te chamam" autoComplete="name" />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-[1_1_220px] flex-col gap-2">
            <label htmlFor="email" className="rotulo">E-mail</label>
            <input id="email" name="email" type="email" required className="campo" placeholder="voce@email.com" autoComplete="email" />
          </div>
          <div className="flex flex-[1_1_220px] flex-col gap-2">
            <label htmlFor="whatsapp" className="rotulo">WhatsApp</label>
            <input id="whatsapp" name="whatsapp" type="tel" required minLength={10} className="campo" placeholder="(42) 9 9999-0000" autoComplete="tel" />
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted">O WhatsApp é por onde as clientes vão te chamar a partir da vitrine.</p>
        <div className="flex flex-col gap-2">
          <label htmlFor="senha" className="rotulo">Crie uma senha</label>
          <input id="senha" name="senha" type="password" required minLength={8} className="campo" placeholder="Mínimo de 8 caracteres" autoComplete="new-password" />
        </div>
      </fieldset>

      {/* Passo 2 */}
      <fieldset ref={(el) => { etapas.current[1] = el; }} className={passo === 1 ? "flex flex-col gap-4" : "hidden"}>
        <legend className="titulo mb-4 text-4xl">Agora, a sua <span className="italic text-deep">loja</span></legend>
        <div className="flex flex-col gap-2">
          <label htmlFor="loja_nome" className="rotulo">Nome da loja</label>
          <input
            id="loja_nome"
            name="loja_nome"
            required
            minLength={2}
            className="campo"
            value={nomeLoja}
            onChange={(e) => {
              setNomeLoja(e.target.value);
              if (!slugEditado) setSlug(slugify(e.target.value));
            }}
            onBlur={() => !slugEditado && verificarSlug(slugify(nomeLoja))}
            placeholder="Ex.: Boutique Rosé"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="loja_slug" className="rotulo">Endereço da sua vitrine</label>
          <div className="flex h-13 items-center rounded-2xl border border-petal bg-white px-4 focus-within:border-deep">
            <span className="text-muted">sacolinha.app/</span>
            <input
              id="loja_slug"
              name="loja_slug"
              required
              minLength={3}
              pattern="[a-z0-9-]{3,40}"
              className="min-w-0 flex-1 bg-transparent font-bold text-deep outline-none"
              value={slug}
              onChange={(e) => {
                setSlugEditado(true);
                setSlug(e.target.value.toLowerCase());
                setSlugStatus(null);
              }}
              onBlur={() => verificarSlug(slug)}
            />
            {slugStatus?.ok && <IconeCheck className="text-green-700" aria-label="Disponível" />}
          </div>
          {slugStatus && !slugStatus.ok && <p className="text-sm font-semibold text-deep">{slugStatus.motivo}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="cidade" className="rotulo">Cidade onde você entrega</label>
          <input id="cidade" name="cidade" className="campo" placeholder="Ex.: Guarapuava, PR" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="rotulo">Cor da loja</span>
          <input type="hidden" name="tema" value={tema} />
          <div className="flex gap-3">
            {(Object.keys(TEMAS) as TemaId[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-label={TEMAS[t].nome}
                aria-pressed={t === tema}
                onClick={() => setTema(t)}
                className="size-12 rounded-full transition"
                style={{
                  background: TEMAS[t].cores.deep,
                  boxShadow: t === tema ? `0 0 0 3px #fff, 0 0 0 5px ${TEMAS[t].cores.deep}` : "none",
                }}
              />
            ))}
          </div>
        </div>
      </fieldset>

      {/* Passo 3 */}
      <fieldset ref={(el) => { etapas.current[2] = el; }} className={passo === 2 ? "flex flex-col gap-4" : "hidden"}>
        <legend className="titulo mb-2 text-4xl">E a sua <span className="italic text-deep">sacola</span></legend>
        <p className="text-muted">Com isso a gente calcula seu lucro e te avisa antes do prazo de devolução. Revende para mais de uma empresa? Depois você abre uma sacola para cada uma.</p>
        <div className="flex flex-col gap-2">
          <label htmlFor="empresa_nome" className="rotulo">Empresa que te passou a sacola</label>
          <input id="empresa_nome" name="empresa_nome" required minLength={2} maxLength={60} className="campo" placeholder="Ex.: Bella Modas" />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-[1_1_220px] flex-col gap-2">
            <label htmlFor="sacola_recebida_em" className="rotulo">Recebi a sacola em</label>
            <input id="sacola_recebida_em" name="sacola_recebida_em" type="date" required defaultValue={hoje} className="campo" />
          </div>
          <div className="flex flex-[1_1_220px] flex-col gap-2">
            <label htmlFor="sacola_dias" className="rotulo">Prazo para devolver</label>
            <select id="sacola_dias" name="sacola_dias" defaultValue="60" className="campo">
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="percentual_lucro" className="rotulo">Quanto fica pra você em cada venda (%)</label>
          <input id="percentual_lucro" name="percentual_lucro" type="number" min={0} max={100} step="0.5" required defaultValue={30} className="campo" />
        </div>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="termos" required className="mt-0.5 size-5 accent-[var(--deep)]" />
          <span>Li e aceito os termos de uso e a política de privacidade</span>
        </label>
      </fieldset>

      <div className="flex gap-3">
        {passo > 0 && (
          <button type="button" onClick={() => setPasso((p) => p - 1)} className="btn-secundario h-14 px-7">
            Voltar
          </button>
        )}
        {passo < 2 ? (
          <button type="button" onClick={avancar} className="btn-primario h-14 flex-1 text-base">
            Continuar
          </button>
        ) : (
          <button type="submit" disabled={enviando} className="btn-primario h-14 flex-1 text-base">
            {enviando ? "Criando sua loja…" : "Criar minha loja"}
          </button>
        )}
      </div>

      <p className="text-center text-muted">
        Já tem conta? <Link href="/login" className="font-bold text-deep">Entrar</Link>
      </p>
    </form>
  );
}
