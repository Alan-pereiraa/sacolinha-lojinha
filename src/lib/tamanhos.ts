/** Ordena tamanhos: PP, P, M, G, GG, XG… e números. */
export function ordenarTamanhos<T extends { tamanho: string }>(lista: T[]) {
  const ordem = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "U", "ÚNICO"];
  return [...lista].sort((a, b) => {
    const ia = ordem.indexOf(a.tamanho.toUpperCase());
    const ib = ordem.indexOf(b.tamanho.toUpperCase());
    if (ia >= 0 && ib >= 0) return ia - ib;
    return a.tamanho.localeCompare(b.tamanho, "pt-BR", { numeric: true });
  });
}
