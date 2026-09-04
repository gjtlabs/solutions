"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeSemantic } from "@/components/ui/badge";
import { actualizarLinea, borrarLinea, marcarServido } from "./actions";

const ESTADO_LINEA_BADGE: Record<string, { label: string; semantic: BadgeSemantic }> = {
  PENDIENTE: { label: "Pendiente", semantic: "warning" },
  COCINA: { label: "En cocina", semantic: "info" },
  SERVIDO: { label: "Servido", semantic: "success" },
};

export type LineaComandaData = {
  id: string;
  nombre: string;
  cantidad: number;
  notas: string | null;
  estado: string;
};

// Una línea del ticket — pensada para una columna estrecha y fija, así que
// todo se apila en vertical (nunca en fila, como en una tabla) en vez de
// exigir ancho de sobra.
export function LineaRow({
  localId,
  mesaId,
  linea,
}: {
  localId: string;
  mesaId: string;
  linea: LineaComandaData;
}) {
  const [, startTransition] = useTransition();
  const [cantidad, setCantidad] = useState(linea.cantidad);
  const [notas, setNotas] = useState(linea.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const estado = ESTADO_LINEA_BADGE[linea.estado];
  const cambiado = cantidad !== linea.cantidad || notas !== (linea.notas ?? "");

  function guardar() {
    startTransition(async () => {
      const result = await actualizarLinea(localId, mesaId, linea.id, cantidad, notas);
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="bg-surface border border-border rounded-md px-3 py-2 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-12 shrink-0 bg-surface border border-border rounded-sm px-1 h-8 text-text text-right font-mono text-sm"
          />
          <span className="text-text text-sm leading-tight">× {linea.nombre}</span>
        </div>
        <Badge semantic={estado.semantic} className="shrink-0">
          {estado.label}
        </Badge>
      </div>
      <input
        type="text"
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="notas…"
        className="w-full bg-surface border border-border rounded-sm px-2 h-8 text-sm text-text-muted"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        {cambiado && (
          <Button type="button" variant="ghost" onClick={guardar}>
            Guardar
          </Button>
        )}
        {linea.estado === "COCINA" && (
          <form action={marcarServido.bind(null, localId, mesaId, linea.id)}>
            <Button type="submit" variant="ghost">
              Servido
            </Button>
          </form>
        )}
        <form action={borrarLinea.bind(null, localId, mesaId, linea.id)}>
          <Button type="submit" variant="ghost">
            Borrar
          </Button>
        </form>
      </div>
    </div>
  );
}
