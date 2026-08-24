"use client";

import { useActionState } from "react";
import { crearMesa, type MesaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MesaForm({ localId }: { localId: string }) {
  const action = crearMesa.bind(null, localId);
  const [state, formAction, pending] = useActionState<MesaFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Input label="Zona" name="zona" placeholder="Terraza" required />
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
