import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { tamanho?: number };

function Base({ tamanho = 20, children, ...rest }: P) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconeCasa = (p: P) => <Base {...p}><path d="M4 11l8-7 8 7v9H4z" /></Base>;
export const IconeSacola = (p: P) => <Base {...p}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></Base>;
export const IconeCodigo = (p: P) => <Base {...p}><path d="M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12" /></Base>;
export const IconeLoja = (p: P) => <Base {...p}><path d="M4 9l2-5h12l2 5M4 9h16M5 9v11h14V9M10 20v-5h4v5" /></Base>;
export const IconeMais = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const IconeX = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>;
export const IconeVoltar = (p: P) => <Base {...p}><path d="M15 5l-7 7 7 7" /></Base>;
export const IconeChat = (p: P) => <Base {...p}><path d="M4 5h16v11H9l-5 4V5z" /></Base>;
export const IconeBusca = (p: P) => <Base {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Base>;
export const IconeCheck = (p: P) => <Base {...p}><path d="M5 12l5 5 9-10" /></Base>;
export const IconeMegafone = (p: P) => <Base {...p}><path d="M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2z" /><path d="M17 8a5 5 0 0 1 0 8" /></Base>;
export const IconeSair = (p: P) => <Base {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></Base>;
export const IconeUpload = (p: P) => <Base {...p}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></Base>;
export const IconeCaixa = (p: P) => <Base {...p}><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8" /></Base>;
export const IconeEditar = (p: P) => <Base {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></Base>;
