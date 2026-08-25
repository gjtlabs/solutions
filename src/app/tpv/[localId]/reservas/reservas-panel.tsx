"use client";

import { useActionState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
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
  const fecha = new Date(iso);
  const dia = fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  const hora = fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${dia} ${hora}`;
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
  const action = crearReserva.bind(null, localId);
  const [state, formAction, pending] = useActionState<ReservaFormState, FormData>(
    action,
    undefined,
  );

  return (
    <Card>
      <CardTitle>Reservas</CardTitle>
      <div className="flex flex-col gap-4">
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
        {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
      </form>

      {reservas.length === 0 ? (
        <p className="text-text-muted">No hay reservas próximas.</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <Th>Hora</Th>
              <Th>Nombre</Th>
              <Th>Comensales</Th>
              <Th>Mesa</Th>
              <Th>Teléfono</Th>
              <Th>Notas</Th>
              <Th />
            </TableRow>
          </TableHead>
          <TableBody>
            {reservas.map((r) => (
              <TableRow key={r.id}>
                <Td numeric>{formatearHora(r.hora)}</Td>
                <Td>{r.nombre}</Td>
                <Td numeric>{r.personas}</Td>
                <Td>{r.mesaNumero ?? "—"}</Td>
                <Td>{r.telefono ?? "—"}</Td>
                <Td>{r.notas ?? "—"}</Td>
                <Td>
                  <form action={borrarReserva.bind(null, localId, r.id)}>
                    <Button type="submit" variant="ghost" size="normal">
                      Borrar
                    </Button>
                  </form>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      </div>
    </Card>
  );
}
