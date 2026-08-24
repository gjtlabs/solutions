"use client";

import { useActionState } from "react";
import { addLinea, type LineaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function LineaForm({
  localId,
  mesaId,
  productos,
}: {
  localId: string;
  mesaId: string;
  productos: { id: string; nombre: string; precioVenta: number }[];
}) {
  const action = addLinea.bind(null, localId, mesaId);
  const [state, formAction, pending] = useActionState<LineaFormState, FormData>(
    action,
    undefined,
  );

  if (productos.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Todavía no hay productos en la carta —{" "}
        <a href={`/tpv/${localId}/productos`} className="text-brand underline">
          añade alguno
        </a>{" "}
        para poder tomar comanda.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Select label="Producto" name="productoId" tactil required className="min-w-[12rem]">
        {productos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} — {p.precioVenta.toFixed(2)} €
          </option>
        ))}
      </Select>
      <Input
        label="Cantidad"
        name="cantidad"
        type="number"
        min={1}
        defaultValue={1}
        required
        tactil
        className="w-24"
      />
      <Input label="Notas" name="notas" placeholder="sin hielo…" tactil />
      <Button type="submit" size="tactil" disabled={pending}>
        {pending ? "Añadiendo…" : "Añadir"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
