"use client";

import { useActionState } from "react";
import { cobrar, type CobroFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function CobroForm({
  localId,
  mesaId,
  total,
}: {
  localId: string;
  mesaId: string;
  total: number;
}) {
  const action = cobrar.bind(null, localId, mesaId);
  const [state, formAction, pending] = useActionState<CobroFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Select label="Método de pago" name="metodoPago" tactil className="w-40">
        <option value="EFECTIVO">Efectivo</option>
        <option value="TARJETA">Tarjeta</option>
        <option value="OTRO">Otro</option>
      </Select>
      <Button type="submit" size="tactil" disabled={pending}>
        {pending ? "Cobrando…" : `Cobrar ${total.toFixed(2)} €`}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
