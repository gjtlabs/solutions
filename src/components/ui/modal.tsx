"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

// Ventana flotante sobre la página actual — pensada para usarse desde una
// ruta interceptada (ver .../@mesaModal), así que cerrarla siempre es
// "volver atrás" en el historial: no hay una URL de cierre propia que
// construir aquí.
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-2"
      onClick={() => router.back()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-md shadow-modal w-[98vw] max-w-[1600px] h-[96vh] flex flex-col"
      >
        <div className="flex justify-end p-2 shrink-0">
          <Button type="button" variant="ghost" onClick={() => router.back()} aria-label="Cerrar">
            ✕
          </Button>
        </div>
        <div className="px-6 pb-6 -mt-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
