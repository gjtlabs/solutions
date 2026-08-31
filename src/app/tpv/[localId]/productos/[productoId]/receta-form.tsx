"use client";

import { useActionState } from "react";
import { anadirLineaReceta, type RecetaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function RecetaForm({
  localId,
  productoId,
  ingredientes,
}: {
  localId: string;
  productoId: string;
  ingredientes: { id: string; nombre: string; unidadMedida: string }[];
}) {
  const action = anadirLineaReceta.bind(null, localId, productoId);
  const [state, formAction, pending] = useActionState<RecetaFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Select label="Referencia" name="ingredienteId" className="w-56" required defaultValue="">
        <option value="" disabled>
          Elige una referencia
        </option>
        {ingredientes.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre} ({i.unidadMedida})
          </option>
        ))}
      </Select>
      <Input
        label="Cantidad por unidad vendida"
        name="cantidad"
        type="number"
        min={0.001}
        step="0.001"
        placeholder="0.33"
        className="w-40"
        required
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Guardando…" : "+ Añadir al escandallo"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
