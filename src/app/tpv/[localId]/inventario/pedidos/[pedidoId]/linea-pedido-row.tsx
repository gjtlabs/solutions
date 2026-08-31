"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarLineaPedido, quitarLineaPedido } from "../actions";

export type LineaPedidoRowData = {
  id: string;
  ingredienteNombre: string;
  unidadMedida: string;
  cantidad: number;
};

export function LineaPedidoRow({
  localId,
  pedidoId,
  linea,
  editable,
}: {
  localId: string;
  pedidoId: string;
  linea: LineaPedidoRowData;
  editable: boolean;
}) {
  const [, startTransition] = useTransition();
  const [cantidad, setCantidad] = useState(linea.cantidad);
  const cambiado = cantidad !== linea.cantidad;

  if (!editable) {
    return (
      <TableRow>
        <Td>{linea.ingredienteNombre}</Td>
        <Td numeric>
          {linea.cantidad.toFixed(2)} {linea.unidadMedida}
        </Td>
        <Td />
      </TableRow>
    );
  }

  return (
    <TableRow>
      <Td>{linea.ingredienteNombre}</Td>
      <Td numeric>
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />{" "}
        {linea.unidadMedida}
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          {cambiado && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                startTransition(() => {
                  actualizarLineaPedido(localId, pedidoId, linea.id, cantidad);
                })
              }
            >
              Guardar
            </Button>
          )}
          <form action={quitarLineaPedido.bind(null, localId, pedidoId, linea.id)}>
            <Button type="submit" variant="ghost">
              Quitar
            </Button>
          </form>
        </div>
      </Td>
    </TableRow>
  );
}
