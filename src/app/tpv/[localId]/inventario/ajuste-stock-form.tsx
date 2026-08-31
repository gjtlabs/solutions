"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ajustarStock } from "./actions";

export function AjusteStockForm({
  localId,
  ingredientes,
}: {
  localId: string;
  ingredientes: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const ingredienteId = String(formData.get("ingredienteId") ?? "");
    const ubicacion = String(formData.get("ubicacion") ?? "ALMACEN") as "ALMACEN" | "BARRA";
    const cantidad = Number(formData.get("cantidad"));
    if (!ingredienteId || !Number.isFinite(cantidad) || cantidad === 0) return;
    startTransition(() => {
      ajustarStock(localId, ingredienteId, ubicacion, cantidad);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-3">
      <Select label="Referencia" name="ingredienteId" className="w-56" required defaultValue="">
        <option value="" disabled>
          Elige una referencia
        </option>
        {ingredientes.map((i) => (
          <option key={i.id} value={i.id}>
            {i.nombre}
          </option>
        ))}
      </Select>
      <Select label="Ubicación" name="ubicacion" className="w-32" defaultValue="ALMACEN">
        <option value="ALMACEN">Almacén</option>
        <option value="BARRA">Barra</option>
      </Select>
      <Input
        label="Cantidad (+/-)"
        name="cantidad"
        type="number"
        step="0.01"
        placeholder="-2.5"
        className="w-32"
        required
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Aplicando…" : "Registrar merma/ajuste"}
      </Button>
    </form>
  );
}
