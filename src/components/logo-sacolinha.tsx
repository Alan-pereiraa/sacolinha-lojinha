/**
 * Marca da Sacolinha: sacola com alça em coração + nome em DM Sans Extra Bold.
 * "cor" para fundos claros; "branca" para fundos na cor principal.
 */
type Props = { variante?: "cor" | "branca"; tamanho?: number; soSimbolo?: boolean; className?: string };

export function SimboloSacolinha({ tamanho = 32, sacola, faixa }: { tamanho?: number; sacola: string; faixa: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 120 120" aria-hidden="true" className="shrink-0">
      <path
        d="M60 47 C45 37 39 29 39 22 a10.5 10.5 0 0 1 21 -4 a10.5 10.5 0 0 1 21 4 C81 29 75 37 60 47"
        fill="none"
        stroke={sacola}
        strokeWidth={tamanho < 24 ? 11 : 6.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 47 H96 L92 97 Q91 108 80 108 H40 Q29 108 28 97 Z" fill={sacola} />
      <path d="M24 47 H96 L95 59 H25 Z" fill={faixa} />
    </svg>
  );
}

export function LogoSacolinha({ variante = "cor", tamanho = 30, soSimbolo = false, className = "" }: Props) {
  const branca = variante === "branca";
  return (
    <span className={`inline-flex items-center gap-[0.22em] font-sans leading-none ${className}`} style={{ fontSize: tamanho }}>
      <SimboloSacolinha tamanho={Math.round(tamanho * 1.15)} sacola={branca ? "#fff" : "var(--deep)"} faixa="var(--petal)" />
      {soSimbolo ? (
        <span className="sr-only">Sacolinha</span>
      ) : (
        <span className={`font-extrabold tracking-[-0.05em] ${branca ? "text-white" : "text-ink"}`}>
          sacol<span className={branca ? "text-petal" : "text-deep"}>inha</span>
        </span>
      )}
    </span>
  );
}
