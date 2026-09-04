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

export type LineaEstadoResumen = {
  estado: "PENDIENTE" | "COCINA" | "SERVIDO";
  horaEnviada: string | null; // ISO
};

// Desde cuándo lleva pendiente un grupo de líneas (p. ej. las bebidas o las
// comidas de una comanda): la más antigua de las que no están servidas,
// contando desde que se envió a cocina/barra o, si todavía no se envió,
// desde que se abrió la mesa. null si no hay nada pendiente en el grupo.
export function inicioPendiente(lineas: LineaEstadoResumen[], horaApertura: string): number | null {
  const pendientes = lineas.filter((l) => l.estado !== "SERVIDO");
  if (pendientes.length === 0) return null;
  return Math.min(
    ...pendientes.map((l) => (l.horaEnviada ? new Date(l.horaEnviada).getTime() : new Date(horaApertura).getTime())),
  );
}
