"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarLineaReceta, quitarLineaReceta } from "./actions";

export type LineaRecetaData = {
  id: string;
  ingredienteNombre: string;
  unidadMedida: string;
  cantidad: number;
  costeUnitario: number;
};

export function LineaRecetaRow({
  localId,
  productoId,
  linea,
}: {
  localId: string;
  productoId: string;
  linea: LineaRecetaData;
}) {
  const [, startTransition] = useTransition();
  const [cantidad, setCantidad] = useState(linea.cantidad);
  const cambiado = cantidad !== linea.cantidad;

  return (
    <TableRow>
      <Td>{linea.ingredienteNombre}</Td>
      <Td numeric>
        <input
          type="number"
          min={0.001}
          step="0.001"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />{" "}
        {linea.unidadMedida}
      </Td>
      <Td numeric>{(cantidad * linea.costeUnitario).toFixed(4)} €</Td>
      <Td>
        <div className="flex justify-end gap-2">
          {cambiado && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                startTransition(() => {
                  actualizarLineaReceta(localId, productoId, linea.id, cantidad);
                })
              }
            >
              Guardar
            </Button>
          )}
          <form action={quitarLineaReceta.bind(null, localId, productoId, linea.id)}>
            <Button type="submit" variant="ghost">
              Quitar
            </Button>
          </form>
        </div>
      </Td>
    </TableRow>
  );
}
