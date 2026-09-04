import { useEffect, useState } from "react";

// Recalcula el "hace cuánto" cada 15s — de sobra para una cifra en minutos,
// sin sobrecargar de renders una pantalla que suele quedarse encendida
// toda la jornada en el TPV. Solo tiene sentido llamado desde un Client
// Component (usa useState/useEffect).
export function useAhora(intervaloMs: number) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

export function formatearDuracion(ms: number) {
  const minutosTotales = Math.max(0, Math.floor(ms / 60000));
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;
}
