"use client";

import { useActionState } from "react";
import { anadirLineaPedido, type LineaPedidoFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function LineaPedidoForm({
  localId,
  pedidoId,
  ingredientes,
}: {
  localId: string;
  pedidoId: string;
  ingredientes: { id: string; nombre: string; unidadMedida: string }[];
}) {
  const action = anadirLineaPedido.bind(null, localId, pedidoId);
  const [state, formAction, pending] = useActionState<LineaPedidoFormState, FormData>(
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
      <Input label="Cantidad" name="cantidad" type="number" min={0.01} step="0.01" className="w-28" required />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Añadiendo…" : "+ Añadir línea"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
