"use client";

import { useAhora, formatearDuracion } from "@/lib/tiempo-transcurrido";

export function TiempoAbierta({ horaApertura }: { horaApertura: string }) {
  const ahora = useAhora(15000);
  const transcurrido = ahora - new Date(horaApertura).getTime();
  return <span className="text-text-muted">Abierta hace {formatearDuracion(transcurrido)}</span>;
}
