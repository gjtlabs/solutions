"use client";

import { useActionState, useState } from "react";
import { crearZona, renombrarZona, borrarZona, reordenarZona, type ZonaFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ZonaConMesas = { id: string; nombre: string; mesas: number };

export function ZonaPanel({
  localId,
  zonas,
}: {
  localId: string;
  zonas: ZonaConMesas[];
}) {
  const action = crearZona.bind(null, localId);
  const [state, formAction, pending] = useActionState<ZonaFormState, FormData>(
    action,
    undefined,
  );
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <Input label="Nueva zona" name="nombre" placeholder="Barra" required />
        <Button type="submit" disabled={pending}>
          {pending ? "Añadiendo…" : "Añadir zona"}
        </Button>
        {state?.error && <p className="text-sm text-danger basis-full">{state.error}</p>}
      </form>

      {zonas.length === 0 ? (
        <p className="text-text-muted">Todavía no hay ninguna zona.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {zonas.map((z, i) => (
            <li
              key={z.id}
              className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
            >
              {editando === z.id ? (
                <form
                  action={async () => {
                    await renombrarZona(localId, z.id, nombreEdit);
                    setEditando(null);
                  }}
                  className="flex items-center gap-2 flex-1"
                >
                  <input
                    autoFocus
                    defaultValue={z.nombre}
                    onChange={(e) => setNombreEdit(e.target.value)}
                    className="bg-surface border border-border rounded-sm px-2 h-9 text-base text-text flex-1"
                  />
                  <Button type="submit" variant="ghost">
                    Guardar
                  </Button>
                </form>
              ) : (
                <span className="text-text">
                  {z.nombre}{" "}
                  <span className="text-text-faint text-sm">
                    ({z.mesas} {z.mesas === 1 ? "mesa" : "mesas"})
                  </span>
                </span>
              )}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => reordenarZona(localId, z.id, "arriba")}
                  disabled={i === 0}
                  aria-label="Subir zona"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => reordenarZona(localId, z.id, "abajo")}
                  disabled={i === zonas.length - 1}
                  aria-label="Bajar zona"
                >
                  ↓
                </Button>
                {editando !== z.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditando(z.id);
                      setNombreEdit(z.nombre);
                    }}
                  >
                    Renombrar
                  </Button>
                )}
                {z.mesas === 0 && (
                  <form action={borrarZona.bind(null, localId, z.id)}>
                    <Button type="submit" variant="ghost">
                      Borrar
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
