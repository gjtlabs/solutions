"use client";

import { useActionState, useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { crearReserva, borrarReserva, actualizarReserva, type ReservaFormState } from "./actions";

export type ReservaData = {
  id: string;
  nombre: string;
  telefono: string | null;
  personas: number;
  hora: string; // ISO
  notas: string | null;
  mesaId: string | null;
  mesaNumero: string | null;
};

export type MesaOpcion = { id: string; numero: string; zonaNombre: string };

function formatearHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

// El input datetime-local espera hora local sin zona, no ISO con "Z" — hay
// que restar el propio desfase de zona antes de cortar los segundos.
function isoADatetimeLocal(iso: string) {
  const d = new Date(iso);
  const sinZona = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return sinZona.toISOString().slice(0, 16);
}

function FilaReserva({
  localId,
  reserva,
  mesas,
}: {
  localId: string;
  reserva: ReservaData;
  mesas: MesaOpcion[];
}) {
  const [editando, setEditando] = useState(false);
  const [, startTransition] = useTransition();
  const [nombre, setNombre] = useState(reserva.nombre);
  const [telefono, setTelefono] = useState(reserva.telefono ?? "");
  const [personas, setPersonas] = useState(reserva.personas);
  const [hora, setHora] = useState(isoADatetimeLocal(reserva.hora));
  const [mesaId, setMesaId] = useState(reserva.mesaId ?? "");
  const [notas, setNotas] = useState(reserva.notas ?? "");
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    startTransition(async () => {
      const result = await actualizarReserva(
        localId,
        reserva.id,
        nombre,
        telefono,
        personas,
        hora,
        mesaId,
        notas,
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditando(false);
      }
    });
  }

  if (editando) {
    return (
      <li className="flex flex-col gap-2 rounded-sm bg-surface-2 px-3 py-2">
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-40" />
          <Input
            label="Comensales"
            type="number"
            min={1}
            value={personas}
            onChange={(e) => setPersonas(Number(e.target.value))}
            className="w-24"
          />
          <Input
            label="Fecha y hora"
            type="datetime-local"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-52"
          />
          <Input
            label="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-36"
          />
          <Select label="Mesa" value={mesaId} onChange={(e) => setMesaId(e.target.value)} className="w-36">
            <option value="">Sin asignar</option>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.zonaNombre} · {m.numero}
              </option>
            ))}
          </Select>
          <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={guardar}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-sm bg-surface-2 px-3 py-2">
      <div>
        <p className="text-text">
          <span className="font-mono font-medium">{formatearHora(reserva.hora)}</span>{" "}
          <span className="font-medium">{reserva.nombre}</span>{" "}
          <span className="text-text-muted">· {reserva.personas}p</span>
        </p>
        <p className="text-xs text-text-faint">
          {reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : "Sin mesa asignada"}
          {reserva.telefono ? ` · ${reserva.telefono}` : ""}
          {reserva.notas ? ` · ${reserva.notas}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="normal" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <form action={borrarReserva.bind(null, localId, reserva.id)}>
          <Button type="submit" variant="ghost" size="normal">
            Borrar
          </Button>
        </form>
      </div>
    </li>
  );
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
              <FilaReserva key={r.id} localId={localId} reserva={r} mesas={mesas} />
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
