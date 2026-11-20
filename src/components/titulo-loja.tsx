import { partesDoTitulo } from "@/lib/conteudo";

/** Título com as partes entre *asteriscos* em itálico na cor da loja. */
export function TituloLoja({ texto, classeDestaque = "text-deep italic" }: { texto: string; classeDestaque?: string }) {
  return (
    <>
      {partesDoTitulo(texto).map((p, i) =>
        p.destaque ? (
          <span key={i} className={classeDestaque}>{p.texto}</span>
        ) : (
          <span key={i}>{p.texto}</span>
        ),
      )}
    </>
  );
}
