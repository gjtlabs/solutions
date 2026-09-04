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
    <div className="bg-surface border border-border rounded-md px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="w-14 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
        <span className="text-text">× {linea.nombre}</span>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="notas…"
          className="w-32 bg-surface border border-border rounded-sm px-2 h-9 text-sm text-text-muted"
        />
      </div>
      <div className="flex items-center gap-2">
        {error && <p className="text-sm text-danger">{error}</p>}
        <Badge semantic={estado.semantic}>{estado.label}</Badge>
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
