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
  precioUnitario: number;
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
  const [precioUnitario, setPrecioUnitario] = useState(linea.precioUnitario);
  const cambiado = cantidad !== linea.cantidad || precioUnitario !== linea.precioUnitario;
  const importe = cantidad * precioUnitario;

  if (!editable) {
    return (
      <TableRow>
        <Td>{linea.ingredienteNombre}</Td>
        <Td numeric>
          {linea.cantidad.toFixed(2)} {linea.unidadMedida}
        </Td>
        <Td numeric>{linea.precioUnitario.toFixed(4)} €</Td>
        <Td numeric>{importe.toFixed(2)} €</Td>
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
      <Td numeric>
        <input
          type="number"
          min={0}
          step="0.0001"
          value={precioUnitario}
          onChange={(e) => setPrecioUnitario(Number(e.target.value))}
          className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />{" "}
        €
      </Td>
      <Td numeric>{importe.toFixed(2)} €</Td>
      <Td>
        <div className="flex justify-end gap-2">
          {cambiado && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                startTransition(() => {
                  actualizarLineaPedido(localId, pedidoId, linea.id, cantidad, precioUnitario);
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
