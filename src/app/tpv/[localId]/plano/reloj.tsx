"use client";

import { useEffect, useState } from "react";

// Null hasta que se monta en el cliente: renderizar la hora en el servidor
// desincronizaría del reloj real del navegador y provocaría un parpadeo de
// hidratación — mejor no pintar nada ese primer instante que pintar mal.
export function RelojDigital() {
  const [hora, setHora] = useState<string | null>(null);

  useEffect(() => {
    function actualizar() {
      setHora(new Date().toLocaleTimeString("es-ES", { hour12: false }));
    }
    actualizar();
    const id = setInterval(actualizar, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-2xl text-text tabular-nums" suppressHydrationWarning>
      {hora ?? "--:--:--"}
    </span>
  );
}
