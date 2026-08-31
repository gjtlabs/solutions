"use client";

import { useState, useTransition } from "react";
import { TableRow, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { actualizarProveedor, borrarProveedor } from "./actions";
import { crearPedido } from "../inventario/pedidos/actions";

export type ProveedorData = {
  id: string;
  nombre: string;
  contacto: string;
  productosHabituales: string;
  tienePedidos: boolean;
};

export function ProveedorRow({ localId, proveedor }: { localId: string; proveedor: ProveedorData }) {
  const [, startTransition] = useTransition();
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [contacto, setContacto] = useState(proveedor.contacto);
  const [productosHabituales, setProductosHabituales] = useState(proveedor.productosHabituales);
  const cambiado =
    nombre !== proveedor.nombre ||
    contacto !== proveedor.contacto ||
    productosHabituales !== proveedor.productosHabituales;

  function guardar() {
    startTransition(() => {
      actualizarProveedor(localId, proveedor.id, nombre, contacto, productosHabituales);
    });
  }

  return (
    <TableRow>
      <Td>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full min-w-[14rem] bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td>
        <input
          type="text"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          className="w-full min-w-[8rem] bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td>
        <input
          type="text"
          value={productosHabituales}
          onChange={(e) => setProductosHabituales(e.target.value)}
          className="w-full min-w-[14rem] bg-surface border border-border rounded-sm px-2 h-9 text-text"
        />
      </Td>
      <Td>
        <div className="flex justify-end gap-2">
          {cambiado && (
            <Button type="button" variant="ghost" onClick={guardar}>
              Guardar
            </Button>
          )}
          <form action={crearPedido.bind(null, localId, proveedor.id)}>
            <Button type="submit" variant="ghost">
              Nuevo pedido
            </Button>
          </form>
          {!proveedor.tienePedidos && (
            <form action={borrarProveedor.bind(null, localId, proveedor.id)}>
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
