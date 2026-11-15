"use client";

import { useEffect, useRef, useState } from "react";

const FORMATOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"] as const;

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * Leitor de código de barras pela câmera.
 * Usa o BarcodeDetector nativo do navegador quando existe (Chrome/Android)
 * e cai para o polyfill `barcode-detector` (ZXing-C++ em WebAssembly) no iPhone/Safari/Firefox.
 */
export function LeitorCodigo({
  onLeitura,
  className = "",
  pausado = false,
}: {
  onLeitura: (codigo: string) => void;
  className?: string;
  pausado?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const ultimo = useRef<{ codigo: string; em: number }>({ codigo: "", em: 0 });
  const callback = useRef(onLeitura);
  const pausadoRef = useRef(pausado);
  const [estado, setEstado] = useState<"parado" | "iniciando" | "lendo" | "erro">("parado");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    callback.current = onLeitura;
    pausadoRef.current = pausado;
  }, [onLeitura, pausado]);

  const ligado = estado === "iniciando" || estado === "lendo";

  useEffect(() => {
    if (!ligado) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelado = false;

    (async () => {
      try {
        let detector: Detector;
        const Nativo = (globalThis as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
        const suportados = Nativo ? await Nativo.getSupportedFormats().catch(() => []) : [];
        if (Nativo && suportados.includes("ean_13")) {
          detector = new Nativo({ formats: FORMATOS.filter((f) => suportados.includes(f)) });
        } else {
          const { BarcodeDetector } = await import("barcode-detector/ponyfill");
          detector = new BarcodeDetector({ formats: [...FORMATOS] });
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelado || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setEstado("lendo");

        const ler = async () => {
          if (cancelado || !video.current) return;
          if (!pausadoRef.current && video.current.readyState >= 2) {
            try {
              const achados = await detector.detect(video.current);
              const codigo = achados[0]?.rawValue;
              const agora = Date.now();
              if (codigo && (codigo !== ultimo.current.codigo || agora - ultimo.current.em > 2000)) {
                ultimo.current = { codigo, em: agora };
                navigator.vibrate?.(60);
                callback.current(codigo);
              }
            } catch {
              /* quadro ilegível: segue tentando */
            }
          }
          timer = setTimeout(ler, 180);
        };
        ler();
      } catch (e) {
        const nome = (e as Error)?.name;
        setEstado("erro");
        setMensagem(
          nome === "NotAllowedError"
            ? "Permita o uso da câmera nas configurações do navegador."
            : nome === "NotFoundError"
              ? "Nenhuma câmera encontrada neste aparelho."
              : "Não foi possível abrir a câmera. Use o campo de código abaixo.",
        );
      }
    })();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [ligado]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-[20px] bg-[#1E0A14] ${className}`}>
      <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${estado === "lendo" ? "" : "hidden"}`} />

      {/* Mira */}
      <div aria-hidden="true" className="pointer-events-none relative h-[46%] w-[78%] max-w-[340px]">
        <span className="absolute top-0 left-0 size-9 rounded-tl-2xl border-t-4 border-l-4 border-white" />
        <span className="absolute top-0 right-0 size-9 rounded-tr-2xl border-t-4 border-r-4 border-white" />
        <span className="absolute bottom-0 left-0 size-9 rounded-bl-2xl border-b-4 border-l-4 border-white" />
        <span className="absolute right-0 bottom-0 size-9 rounded-br-2xl border-r-4 border-b-4 border-white" />
        {estado === "lendo" && (
          <span className="absolute inset-x-3 top-1/2 h-[3px] animate-pulse rounded-full bg-petal shadow-[0_0_16px_var(--petal)]" />
        )}
      </div>

      {estado !== "lendo" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          {estado === "erro" ? (
            <p className="max-w-xs text-sm">{mensagem}</p>
          ) : (
            <button
              type="button"
              onClick={() => setEstado("iniciando")}
              disabled={estado === "iniciando"}
              className="btn bg-white text-deep"
            >
              {estado === "iniciando" ? "Abrindo câmera…" : "Abrir câmera"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
