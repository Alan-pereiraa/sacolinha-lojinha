import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-blush px-6 text-center">
      <span className="font-elegante text-3xl text-deep italic">Sacolinha</span>
      <h1 className="titulo text-4xl">Essa página <span className="italic text-deep">não existe</span></h1>
      <p className="text-muted">Confira o endereço. Se for uma loja, pode ser que o nome tenha mudado.</p>
      <Link href="/" className="btn-primario">Ir para o início</Link>
    </main>
  );
}
