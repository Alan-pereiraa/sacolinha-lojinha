/* Ilustrações de traço usadas quando a peça ainda não tem foto. */

const traco = { fill: "none", stroke: "var(--deep)", strokeLinejoin: "round", strokeLinecap: "round" } as const;
const corpo = { fill: "#FFFFFF", fillOpacity: 0.75 };

export function IlustracaoPeca({ categoria, tamanho = 120 }: { categoria: string; tamanho?: number }) {
  const sw = tamanho > 80 ? 1.2 : 2;
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true" {...traco} strokeWidth={sw}>
      {categoria === "calcinhas" ? (
        <path d="M10 20 L54 20 L52 26 C44 30 38 38 36 48 L28 48 C26 38 20 30 12 26 Z" {...corpo} />
      ) : categoria === "bodies" ? (
        <path d="M22 8 L25 8 C26 16 38 16 39 8 L42 8 L44 30 L48 42 C40 43 36 47 34 54 L30 54 C28 47 24 43 16 42 L20 30 Z" {...corpo} />
      ) : categoria === "camisolas" ? (
        <>
          <path d="M24 6 L26 6 L28 18 L36 18 L38 6 L40 6 L42 22 L50 56 L14 56 L22 22 Z" {...corpo} />
          <path d="M22 22 C28 27 36 27 42 22" />
        </>
      ) : (
        <>
          <path d="M16 32 L20 12 M48 32 L44 12" />
          <path d="M12 38 C12 28 20 24 31 32 L33 32 C44 24 52 28 52 38 Z" {...corpo} />
          <path d="M10 38 L54 38 L54 44 L10 44 Z" {...corpo} />
        </>
      )}
    </svg>
  );
}

/** Foto da peça (primeira foto) ou a ilustração da categoria. */
export function FotoPeca({
  foto,
  categoria,
  alt,
  className = "",
  tamanhoIlustracao = 120,
  fundo = "bg-soft",
}: {
  foto?: string | null;
  categoria: string;
  alt: string;
  className?: string;
  tamanhoIlustracao?: number;
  fundo?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${fundo} ${className}`}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <IlustracaoPeca categoria={categoria} tamanho={tamanhoIlustracao} />
      )}
    </div>
  );
}
