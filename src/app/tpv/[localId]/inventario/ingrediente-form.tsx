"use client";

import { useActionState } from "react";
import { crearIngrediente, type IngredienteFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function IngredienteForm({ localId }: { localId: string }) {
  const action = crearIngrediente.bind(null, localId);
  const [state, formAction, pending] = useActionState<IngredienteFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Input label="Referencia" name="nombre" placeholder="Cerveza barril 30L" required />
      <Input label="Unidad" name="unidadMedida" placeholder="l, kg, unidad..." className="w-32" required />
      <Input
        label="Mínimo en barra"
        name="stockMinimoBarra"
        type="number"
        min={0}
        step="0.01"
        defaultValue={0}
        className="w-32"
      />
      <Input
        label="Máximo en barra"
        name="stockMaximoBarra"
        type="number"
        min={0}
        step="0.01"
        defaultValue={0}
        className="w-32"
      />
      <Input
        label="Coste unitario (€)"
        name="costeUnitario"
        type="number"
        min={0}
        step="0.0001"
        defaultValue={0}
        className="w-32"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Añadiendo…" : "Añadir referencia"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
