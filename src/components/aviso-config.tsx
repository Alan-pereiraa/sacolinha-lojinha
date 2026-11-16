import Link from "next/link";
import { PROBLEMAS_CONFIG } from "@/lib/config";

/** Aviso exibido no login/cadastro quando as variáveis do Supabase estão com problema. */
export function AvisoConfig() {
  if (PROBLEMAS_CONFIG.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-[#FFF1D6] px-4 py-3 text-sm text-[#5C3A00]">
      <strong>O site ainda não está ligado ao banco de dados.</strong>
      <ul className="list-disc pl-5">
        {PROBLEMAS_CONFIG.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <span>
        Corrija na Vercel (Settings → Environment Variables) e faça o Redeploy.{" "}
        <Link href="/status" className="font-bold underline">Ver diagnóstico</Link>
      </span>
    </div>
  );
}
