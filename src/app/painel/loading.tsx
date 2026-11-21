/** Aparece na hora em que você toca num menu, enquanto os dados chegam. */
export default function CarregandoPainel() {
  return (
    <div role="status" aria-label="Carregando" className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 rounded-full bg-petal/70" />
        <div className="h-10 w-72 max-w-full rounded-2xl bg-petal/70" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <div className="h-40 rounded-[28px] bg-petal/60" />
        <div className="h-40 rounded-[28px] bg-white" />
        <div className="h-40 rounded-[28px] bg-white" />
      </div>
      <div className="flex flex-col gap-3 rounded-[28px] bg-white p-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-2xl bg-soft" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3.5 w-1/2 rounded-full bg-soft" />
              <div className="h-3 w-1/4 rounded-full bg-soft" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
