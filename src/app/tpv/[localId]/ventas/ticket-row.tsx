"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarTicket } from "./actions";

const NOMBRE_METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export type TicketData = {
  id: string;
  fechaTexto: string;
  mesaTexto: string;
  metodoPago: string;
  total: number;
};

export function TicketRow({ localId, ticket }: { localId: string; ticket: TicketData }) {
  const [, startTransition] = useTransition();
  const [metodoPago, setMetodoPago] = useState(ticket.metodoPago);
  const [total, setTotal] = useState(ticket.total);
  const [error, setError] = useState<string | null>(null);
  const cambiado = metodoPago !== ticket.metodoPago || total !== ticket.total;

  function guardar() {
    startTransition(async () => {
      const result = await actualizarTicket(localId, ticket.id, total, metodoPago);
      setError(result?.error ?? null);
    });
  }

  return (
    <TableRow>
      <Td compact>{ticket.fechaTexto}</Td>
      <Td compact>{ticket.mesaTexto}</Td>
      <Td compact>
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          className="h-9 bg-surface border border-border rounded-sm px-2 text-text"
        >
          {Object.entries(NOMBRE_METODO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
      </Td>
      <Td compact numeric>
        <div className="flex items-center justify-end gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
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
    </TableRow>
  );
}
