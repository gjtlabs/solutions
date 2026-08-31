"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { confirmarLinea } from "./actions";

export type LineaReposicionData = {
  id: string;
  ingredienteNombre: string;
  unidadMedida: string;
  cantidadSugerida: number;
  completada: boolean;
};

function FilaReposicion({
  localId,
  linea,
}: {
  localId: string;
  linea: LineaReposicionData;
}) {
  const [cantidad, setCantidad] = useState(linea.cantidadSugerida);
  const [pending, startTransition] = useTransition();

  return (
    <TableRow>
      <Td>{linea.ingredienteNombre}</Td>
      <Td numeric>
        {linea.cantidadSugerida.toFixed(2)} {linea.unidadMedida}
      </Td>
      <Td numeric>
        {linea.completada ? (
          "—"
        ) : (
          <input
            type="number"
            min={0}
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
          />
        )}
      </Td>
      <Td>
        <div className="flex justify-end">
          {linea.completada ? (
            <span className="text-success text-sm font-medium">Llevado ✓</span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  confirmarLinea(localId, linea.id, cantidad);
                })
              }
            >
              {pending ? "Confirmando…" : "Llevado"}
            </Button>
          )}
        </div>
      </Td>
    </TableRow>
  );
}

export function ReposicionPanel({
  localId,
  lineas,
}: {
  localId: string;
  lineas: LineaReposicionData[];
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <Th>Referencia</Th>
          <Th>Sugerido</Th>
          <Th>Llevado</Th>
          <Th />
        </TableRow>
      </TableHead>
      <TableBody>
        {lineas.map((linea) => (
          <FilaReposicion key={linea.id} localId={localId} linea={linea} />
        ))}
      </TableBody>
    </Table>
  );
}
