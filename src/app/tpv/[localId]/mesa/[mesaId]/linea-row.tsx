"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { borrarLinea } from "./actions";

export type LineaComandaData = {
  id: string;
  nombre: string;
  cantidad: number;
  notas: string | null;
  estado: string;
};

// Una línea del ticket — deliberadamente mínima: solo lo que se pidió y un
// botón para quitarla. Corregir cantidad/notas o marcar "servido" se hace
// desde donde de verdad hace falta (la propia toma de nota), no aquí.
export function LineaRow({
  localId,
  mesaId,
  linea,
}: {
  localId: string;
  mesaId: string;
  linea: LineaComandaData;
}) {
  const [, startTransition] = useTransition();

  function borrar() {
    startTransition(() => {
      borrarLinea(localId, mesaId, linea.id);
    });
  }

  return (
    <div className="bg-surface border border-border rounded-md px-3 py-2 flex items-center justify-between gap-3">
      <span className="text-sm text-text flex-1 min-w-0 break-words">
        {linea.cantidad}× {linea.nombre}
      </span>
      <Button type="button" variant="ghost" size="compacto" onClick={borrar} className="shrink-0">
        Borrar
      </Button>
    </div>
  );
}
