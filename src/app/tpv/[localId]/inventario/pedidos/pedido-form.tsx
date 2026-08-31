"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { crearPedido } from "./actions";

export function PedidoForm({
  localId,
  proveedores,
}: {
  localId: string;
  proveedores: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const proveedorId = String(formData.get("proveedorId") ?? "");
    if (!proveedorId) return;
    startTransition(() => {
      crearPedido(localId, proveedorId);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-3">
      <Select label="Proveedor" name="proveedorId" className="w-56" required defaultValue="">
        <option value="" disabled>
          Elige un proveedor
        </option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Nuevo pedido"}
      </Button>
    </form>
  );
}
