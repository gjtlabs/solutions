"use client";

import { useActionState, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { crearReserva, borrarReserva, type ReservaFormState } from "./actions";

export type ReservaData = {
  id: string;
  nombre: string;
  telefono: string | null;
  personas: number;
  hora: string; // ISO
  notas: string | null;
  mesaNumero: string | null;
};

export type MesaOpcion = { id: string; numero: string; zonaNombre: string };

function formatearHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function ReservasPanel({
  localId,
  reservas,
  mesas,
}: {
  localId: string;
  reservas: ReservaData[];
  mesas: MesaOpcion[];
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const action = crearReserva.bind(null, localId);
  const [state, formAction, pending] = useActionState<ReservaFormState, FormData>(
    action,
    undefined,
  );

  return (
    <Card>
      <CardTitle>Reservas de hoy</CardTitle>
      <div className="flex flex-col gap-4">
        {reservas.length === 0 ? (
          <p className="text-text-muted">No hay ninguna reserva para hoy.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reservas.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-sm bg-surface-2 px-3 py-2"
              >
                <div>
                  <p className="text-text">
                    <span className="font-mono font-medium">{formatearHora(r.hora)}</span>{" "}
                    <span className="font-medium">{r.nombre}</span>{" "}
                    <span className="text-text-muted">· {r.personas}p</span>
                  </p>
                  <p className="text-xs text-text-faint">
                    {r.mesaNumero ? `Mesa ${r.mesaNumero}` : "Sin mesa asignada"}
                    {r.telefono ? ` · ${r.telefono}` : ""}
                    {r.notas ? ` · ${r.notas}` : ""}
                  </p>
                </div>
                <form action={borrarReserva.bind(null, localId, r.id)}>
                  <Button type="submit" variant="ghost" size="normal">
                    Borrar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {mostrarFormulario ? (
          <form action={formAction} className="flex flex-wrap items-end gap-3">
            <Input label="Nombre" name="nombre" placeholder="María" required className="w-40" />
            <Input
              label="Comensales"
              name="personas"
              type="number"
              min={1}
              defaultValue={2}
              required
              className="w-24"
            />
            <Input label="Fecha y hora" name="hora" type="datetime-local" required className="w-52" />
            <Input label="Teléfono" name="telefono" placeholder="Opcional" className="w-36" />
            <Select label="Mesa" name="mesaId" defaultValue="" className="w-36">
              <option value="">Sin asignar</option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.zonaNombre} · {m.numero}
                </option>
              ))}
            </Select>
            <Input label="Notas" name="notas" placeholder="Opcional" className="w-40" />
            <Button type="submit" disabled={pending}>
              {pending ? "Añadiendo…" : "Añadir reserva"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMostrarFormulario(false)}>
              Cancelar
            </Button>
            {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
          </form>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setMostrarFormulario(true)}>
            + Añadir reserva
          </Button>
        )}
      </div>
    </Card>
  );
}
