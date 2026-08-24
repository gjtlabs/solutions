"use client";

import { useActionState } from "react";
import { crearMesa, type MesaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function MesaForm({
  localId,
  zonas,
}: {
  localId: string;
  zonas: { id: string; nombre: string }[];
}) {
  const action = crearMesa.bind(null, localId);
  const [state, formAction, pending] = useActionState<MesaFormState, FormData>(
    action,
    undefined,
  );

  if (zonas.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Crea primero una zona (arriba) para poder añadir mesas.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Select label="Zona" name="zonaId" required className="min-w-[10rem]">
        {zonas.map((z) => (
          <option key={z.id} value={z.id}>
            {z.nombre}
          </option>
        ))}
      </Select>
      <Input label="Número" name="numero" placeholder="12" required />
      <Input
        label="Capacidad"
        name="capacidad"
        type="number"
        min={1}
        defaultValue={2}
        required
        className="w-28"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Añadiendo…" : "Añadir mesa"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
