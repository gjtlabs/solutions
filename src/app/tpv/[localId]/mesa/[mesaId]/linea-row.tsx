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

// Una línea del ticket — pensada para una columna estrecha y fija, y para
// que quepan muchas sin desplazar demasiado: todo apilado en vertical
// (nunca en fila ancha, como en una tabla) y con controles compactos, no a
// tamaño táctil de comanda.
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
    <div className="bg-surface border border-border rounded-md px-2.5 py-1.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-9 shrink-0 bg-surface border border-border rounded-sm px-1 h-6 text-text text-right font-mono text-xs"
          />
          <span className="text-text text-sm leading-tight truncate">{linea.nombre}</span>
        </div>
        <Badge semantic={estado.semantic} className="shrink-0">
          {estado.label}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="notas…"
          className="flex-1 min-w-0 bg-surface border border-border rounded-sm px-2 h-6 text-xs text-text-muted"
        />
        {cambiado && (
          <Button type="button" variant="ghost" size="compacto" onClick={guardar}>
            Guardar
          </Button>
        )}
        {linea.estado === "COCINA" && (
          <form action={marcarServido.bind(null, localId, mesaId, linea.id)}>
            <Button type="submit" variant="ghost" size="compacto">
              Servido
            </Button>
          </form>
        )}
        <form action={borrarLinea.bind(null, localId, mesaId, linea.id)}>
          <Button type="submit" variant="ghost" size="compacto">
            Borrar
          </Button>
        </form>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
