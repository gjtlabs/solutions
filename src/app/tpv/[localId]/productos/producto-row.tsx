"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarProducto, borrarProducto } from "./actions";

export type ProductoData = {
  id: string;
  nombre: string;
  precioVenta: number;
  tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE";
};

const NOMBRE_TIPO: Record<ProductoData["tipo"], string> = {
  COMIDA: "Comida",
  BEBIDA: "Bebida",
  CONSUMIBLE: "Consumible",
};

export function ProductoRow({ localId, producto }: { localId: string; producto: ProductoData }) {
  const [, startTransition] = useTransition();
  const [nombre, setNombre] = useState(producto.nombre);
  const [precioVenta, setPrecioVenta] = useState(producto.precioVenta);
  const [tipo, setTipo] = useState<ProductoData["tipo"]>(producto.tipo);
  const cambiado = nombre !== producto.nombre || precioVenta !== producto.precioVenta || tipo !== producto.tipo;

  function guardar() {
    startTransition(() => {
      actualizarProducto(localId, producto.id, nombre, precioVenta, tipo);
    });
  }

  return (
    <TableRow>
      <Td>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full min-w-[16rem] bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as ProductoData["tipo"])}
          className="h-9 w-36 bg-surface border border-border rounded-sm px-2 text-text"
        >
          {(Object.keys(NOMBRE_TIPO) as ProductoData["tipo"][]).map((t) => (
            <option key={t} value={t}>
              {NOMBRE_TIPO[t]}
            </option>
          ))}
        </select>
      </Td>
      <Td numeric>
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={precioVenta}
          onChange={(e) => setPrecioVenta(Number(e.target.value))}
          className="w-24 bg-surface border border-border rounded-sm px-2 h-9 text-text text-right font-mono"
        />
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          {cambiado && (
            <Button type="button" variant="ghost" onClick={guardar}>
              Guardar
            </Button>
          )}
          <Link href={`/tpv/${localId}/productos/${producto.id}`}>
            <Button type="button" variant="ghost">
              Escandallo
            </Button>
          </Link>
          <form action={borrarProducto.bind(null, localId, producto.id)}>
            <Button type="submit" variant="ghost">
              Borrar
            </Button>
          </form>
        </div>
      </Td>
    </TableRow>
  );
}
