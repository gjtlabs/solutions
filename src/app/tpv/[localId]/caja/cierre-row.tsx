"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Badge, type BadgeSemantic } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { actualizarCierre } from "./actions";

export type CierreData = {
  id: string;
  fechaTexto: string;
  tickets: number;
  totalEsperado: number;
  totalContado: number;
};

export function CierreRow({ localId, cierre }: { localId: string; cierre: CierreData }) {
  const [, startTransition] = useTransition();
  const [totalContado, setTotalContado] = useState(cierre.totalContado);
  const [error, setError] = useState<string | null>(null);
  const cambiado = totalContado !== cierre.totalContado;
  const diferencia = totalContado - cierre.totalEsperado;
  const semantic: BadgeSemantic = diferencia === 0 ? "success" : diferencia > 0 ? "info" : "danger";

  function guardar() {
    startTransition(async () => {
      const result = await actualizarCierre(localId, cierre.id, totalContado);
      setError(result?.error ?? null);
    });
  }

  return (
    <TableRow>
      <Td compact>{cierre.fechaTexto}</Td>
      <Td compact numeric>
        {cierre.tickets}
      </Td>
      <Td compact numeric>
        {cierre.totalEsperado.toFixed(2)} €
      </Td>
      <Td compact numeric>
        <div className="flex items-center justify-end gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            value={totalContado}
            onChange={(e) => setTotalContado(Number(e.target.value))}
            className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
          />
          {cambiado && (
            <Button type="button" variant="ghost" onClick={guardar}>
              Guardar
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-danger text-right">{error}</p>}
      </Td>
      <Td compact numeric>
        <Badge semantic={semantic}>
          {diferencia > 0 ? "+" : ""}
          {diferencia.toFixed(2)} €
        </Badge>
      </Td>
    </TableRow>
  );
}
