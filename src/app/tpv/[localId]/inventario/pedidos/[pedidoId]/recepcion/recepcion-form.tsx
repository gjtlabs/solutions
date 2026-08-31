"use client";

import { useActionState } from "react";
import { recibirPedido, type RecepcionFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";

export type LineaPedidoData = {
  id: string;
  ingredienteNombre: string;
  unidadMedida: string;
  cantidadPedida: number;
};

export function RecepcionForm({
  localId,
  pedidoId,
  lineas,
}: {
  localId: string;
  pedidoId: string;
  lineas: LineaPedidoData[];
}) {
  const action = recibirPedido.bind(null, localId, pedidoId);
  const [state, formAction, pending] = useActionState<RecepcionFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Input label="Número de albarán" name="numeroAlbaran" placeholder="A-2026-004521" className="w-56" />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <Th>Referencia</Th>
            <Th>Pedido</Th>
            <Th>Recibido</Th>
          </TableRow>
        </TableHead>
        <TableBody>
          {lineas.map((linea) => (
            <TableRow key={linea.id}>
              <Td>{linea.ingredienteNombre}</Td>
              <Td numeric>
                {linea.cantidadPedida.toFixed(2)} {linea.unidadMedida}
              </Td>
              <Td numeric>
                <input
                  type="number"
                  name={`cantidad:${linea.id}`}
                  defaultValue={linea.cantidadPedida}
                  min={0}
                  step="0.01"
                  className="w-28 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
                />
              </Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">Incidencias</span>
        <textarea
          name="incidencias"
          rows={2}
          placeholder="Faltaban 2 cajas de..."
          className="bg-surface border border-border rounded-sm px-3 py-2 text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand"
        />
      </label>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Confirmar recepción"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
