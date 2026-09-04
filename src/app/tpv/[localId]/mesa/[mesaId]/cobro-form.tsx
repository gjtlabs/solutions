"use client";

import { useActionState } from "react";
import { cobrar, type CobroFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function CobroForm({
  localId,
  mesaId,
  comandaId,
  total,
}: {
  localId: string;
  mesaId: string;
  comandaId: string;
  total: number;
}) {
  const action = cobrar.bind(null, localId, mesaId, comandaId);
  const [state, formAction, pending] = useActionState<CobroFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Select label="Método de pago" name="metodoPago" tactil className="w-full">
        <option value="EFECTIVO">Efectivo</option>
        <option value="TARJETA">Tarjeta</option>
        <option value="OTRO">Otro</option>
      </Select>
      <Button type="submit" size="tactil" disabled={pending} className="w-full">
        {pending ? "Cobrando…" : `Cobrar ${total.toFixed(2)} €`}
      </Button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
