"use client";

import { useActionState } from "react";
import { cerrarCaja, type CierreFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CierreForm({ localId, totalEsperado }: { localId: string; totalEsperado: number }) {
  const action = cerrarCaja.bind(null, localId);
  const [state, formAction, pending] = useActionState<CierreFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <Input
        label="Efectivo contado (€)"
        name="totalContado"
        type="number"
        min={0}
        step={0.01}
        defaultValue={totalEsperado.toFixed(2)}
        required
        className="w-40"
      />
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Cerrando…" : "Cerrar caja"}
      </Button>
      {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
    </form>
  );
}
