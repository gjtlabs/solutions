"use client";

import { useActionState } from "react";
import { crearProducto, type ProductoFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProductoForm({ localId }: { localId: string }) {
  const action = crearProducto.bind(null, localId);
  const [state, formAction, pending] = useActionState<ProductoFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Input label="Nombre" name="nombre" placeholder="Caña" required />
      <Input
        label="Precio (€)"
        name="precioVenta"
        type="number"
        min={0.01}
        step={0.01}
        placeholder="2.50"
        required
        className="w-32"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Añadiendo…" : "Añadir producto"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
