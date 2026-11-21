/** Esqueleto da vitrine (perfil + grade) enquanto a loja carrega. */
export default function CarregandoVitrine() {
  return (
    <div role="status" aria-label="Carregando a loja" className="min-h-screen animate-pulse bg-neutral-50">
      <div className="mx-auto max-w-[1240px] sm:px-6">
        <div className="h-44 bg-neutral-200 sm:h-72 sm:rounded-b-[28px] lg:h-80" />
        <div className="flex flex-col items-center gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:px-8">
          <div className="-mt-16 size-31 shrink-0 rounded-full border-[6px] border-neutral-50 bg-neutral-200 sm:-mt-20 sm:size-43" />
          <div className="flex flex-col items-center gap-2 sm:items-start sm:pb-3">
            <div className="h-8 w-56 rounded-xl bg-neutral-200" />
            <div className="h-4 w-36 rounded-full bg-neutral-200" />
          </div>
        </div>
      </div>
      <div className="mx-auto mt-4 grid max-w-[1240px] grid-cols-2 gap-2 px-3 sm:grid-cols-3 sm:gap-3 sm:px-6 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white">
            <div className="aspect-square bg-neutral-200" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-3.5 w-4/5 rounded-full bg-neutral-200" />
              <div className="h-5 w-1/2 rounded-full bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
