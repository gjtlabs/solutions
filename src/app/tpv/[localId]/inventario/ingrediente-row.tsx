"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarIngrediente, borrarIngrediente } from "./actions";

export type IngredienteData = {
  id: string;
  nombre: string;
  tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE";
  unidadMedida: string;
  stockAlmacen: number;
  stockBarra: number;
  stockMinimoBarra: number;
  stockMaximoBarra: number;
  costeUnitario: number;
  enUso: boolean;
};

const NOMBRE_TIPO: Record<IngredienteData["tipo"], string> = {
  COMIDA: "Comida",
  BEBIDA: "Bebida",
  CONSUMIBLE: "Consumible",
};

export function IngredienteRow({
  localId,
  ingrediente,
}: {
  localId: string;
  ingrediente: IngredienteData;
}) {
  const [, startTransition] = useTransition();
  const [nombre, setNombre] = useState(ingrediente.nombre);
  const [tipo, setTipo] = useState<IngredienteData["tipo"]>(ingrediente.tipo);
  const [unidadMedida, setUnidadMedida] = useState(ingrediente.unidadMedida);
  const [costeUnitario, setCosteUnitario] = useState(ingrediente.costeUnitario);
  const [minimo, setMinimo] = useState(ingrediente.stockMinimoBarra);
  const [maximo, setMaximo] = useState(ingrediente.stockMaximoBarra);
  const cambiado =
    nombre !== ingrediente.nombre ||
    tipo !== ingrediente.tipo ||
    unidadMedida !== ingrediente.unidadMedida ||
    costeUnitario !== ingrediente.costeUnitario ||
    minimo !== ingrediente.stockMinimoBarra ||
    maximo !== ingrediente.stockMaximoBarra;
  const bajoMinimo = ingrediente.stockBarra < ingrediente.stockMinimoBarra;

  function guardar() {
    startTransition(() => {
      actualizarIngrediente(localId, ingrediente.id, {
        nombre,
        tipo,
        unidadMedida,
        costeUnitario,
        stockMinimoBarra: minimo,
        stockMaximoBarra: maximo,
      });
    });
  }

  return (
    <TableRow>
      <Td compact>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full min-w-[14rem] bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td compact>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as IngredienteData["tipo"])}
          className="h-9 w-28 bg-surface border border-border rounded-sm px-2 text-text"
        >
          {(Object.keys(NOMBRE_TIPO) as IngredienteData["tipo"][]).map((t) => (
            <option key={t} value={t}>
              {NOMBRE_TIPO[t]}
            </option>
          ))}
        </select>
      </Td>
      <Td compact>
        <input
          type="text"
          value={unidadMedida}
          onChange={(e) => setUnidadMedida(e.target.value)}
          className="w-16 bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td numeric compact>{ingrediente.stockAlmacen.toFixed(2)}</Td>
      <Td numeric compact className={bajoMinimo ? "text-warning" : undefined}>
        {ingrediente.stockBarra.toFixed(2)}
      </Td>
      <Td numeric compact>
        <input
          type="number"
          min={0}
          step="0.01"
          value={minimo}
          onChange={(e) => setMinimo(Number(e.target.value))}
          className="w-20 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
      </Td>
      <Td numeric compact>
        <input
          type="number"
          min={0}
          step="0.01"
          value={maximo}
          onChange={(e) => setMaximo(Number(e.target.value))}
          className="w-20 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
      </Td>
      <Td numeric compact>
        <input
          type="number"
          min={0}
          step="0.0001"
          value={costeUnitario}
          onChange={(e) => setCosteUnitario(Number(e.target.value))}
          className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
      </Td>
      <Td compact>
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
