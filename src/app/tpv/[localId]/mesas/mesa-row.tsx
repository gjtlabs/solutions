"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarDatosMesa, borrarMesa } from "./actions";

export type MesaData = {
  id: string;
  zonaNombre: string;
  numero: string;
  capacidad: number;
};

export function MesaRow({ localId, mesa }: { localId: string; mesa: MesaData }) {
  const [, startTransition] = useTransition();
  const [numero, setNumero] = useState(mesa.numero);
  const [capacidad, setCapacidad] = useState(mesa.capacidad);
  const [error, setError] = useState<string | null>(null);
  const cambiado = numero !== mesa.numero || capacidad !== mesa.capacidad;

  function guardar() {
    startTransition(async () => {
      const result = await actualizarDatosMesa(localId, mesa.id, numero, capacidad);
      setError(result?.error ?? null);
    });
  }

  return (
    <TableRow>
      <Td>{mesa.zonaNombre}</Td>
      <Td>
        <input
          type="text"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="w-20 bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td numeric>
        <input
          type="number"
          min={1}
          value={capacidad}
          onChange={(e) => setCapacidad(Number(e.target.value))}
          className="w-20 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
      </Td>
      <Td>
        <div className="flex justify-end items-center gap-2">
          {error && <p className="text-sm text-danger">{error}</p>}
          {cambiado && (
            <Button type="button" variant="ghost" onClick={guardar}>
              Guardar
            </Button>
          )}
          <form action={borrarMesa.bind(null, localId, mesa.id)}>
            <Button type="submit" variant="ghost" size="normal">
              Borrar
            </Button>
          </form>
        </div>
      </Td>
    </TableRow>
  );
}
