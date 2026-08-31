"use client";

import { useActionState } from "react";
import { crearProveedor, type ProveedorFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProveedorForm({ localId }: { localId: string }) {
  const action = crearProveedor.bind(null, localId);
  const [state, formAction, pending] = useActionState<ProveedorFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Input label="Nombre" name="nombre" placeholder="Distribuciones Ebro" required />
      <Input label="Contacto" name="contacto" placeholder="Teléfono o email" className="w-56" />
      <Input
        label="Productos habituales"
        name="productosHabituales"
        placeholder="Cervezas, refrescos..."
        className="w-56"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Añadiendo…" : "Añadir proveedor"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
