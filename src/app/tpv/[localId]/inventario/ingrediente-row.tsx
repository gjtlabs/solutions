"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarParesBarra, borrarIngrediente } from "./actions";

export type IngredienteData = {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockAlmacen: number;
  stockBarra: number;
  stockMinimoBarra: number;
  stockMaximoBarra: number;
  costeUnitario: number;
  enUso: boolean;
};

export function IngredienteRow({
  localId,
  ingrediente,
}: {
  localId: string;
  ingrediente: IngredienteData;
}) {
  const [, startTransition] = useTransition();
  const [minimo, setMinimo] = useState(ingrediente.stockMinimoBarra);
  const [maximo, setMaximo] = useState(ingrediente.stockMaximoBarra);
  const cambiado = minimo !== ingrediente.stockMinimoBarra || maximo !== ingrediente.stockMaximoBarra;
  const bajoMinimo = ingrediente.stockBarra < ingrediente.stockMinimoBarra;

  function guardar() {
    startTransition(() => {
      actualizarParesBarra(localId, ingrediente.id, minimo, maximo);
    });
  }

  return (
    <TableRow>
      <Td>
        {ingrediente.nombre}{" "}
        <span className="text-text-faint text-sm">({ingrediente.unidadMedida})</span>
      </Td>
      <Td numeric>{ingrediente.stockAlmacen.toFixed(2)}</Td>
      <Td numeric className={bajoMinimo ? "text-warning" : undefined}>
        {ingrediente.stockBarra.toFixed(2)}
      </Td>
      <Td numeric>
        <input
          type="number"
          min={0}
          step="0.01"
          value={minimo}
          onChange={(e) => setMinimo(Number(e.target.value))}
          className="w-20 bg-surface border border-border rounded-sm px-2 h-8 text-text text-right font-mono"
        />
      </Td>
      <Td numeric>
        <input
          type="number"
          min={0}
          step="0.01"
          value={maximo}
          onChange={(e) => setMaximo(Number(e.target.value))}
          className="w-20 bg-surface border border-border rounded-sm px-2 h-8 text-text text-right font-mono"
        />
      </Td>
      <Td numeric>{ingrediente.costeUnitario.toFixed(4)} €</Td>
      <Td>
        <div className="flex justify-end gap-2">
          {cambiado && (
            <Button type="button" variant="ghost" onClick={guardar}>
              Guardar
            </Button>
          )}
          {!ingrediente.enUso && (
            <form action={borrarIngrediente.bind(null, localId, ingrediente.id)}>
              <Button type="submit" variant="ghost">
                Borrar
              </Button>
            </form>
          )}
        </div>
      </Td>
    </TableRow>
  );
}
