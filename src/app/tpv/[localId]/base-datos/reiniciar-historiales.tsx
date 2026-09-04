"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reiniciarHistorialesAction } from "./acciones";

const PALABRA_CONFIRMACION = "REINICIAR";

export function ReiniciarHistoriales({ localId }: { localId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ error?: string; resumen?: string } | null>(null);

  function reiniciar() {
    startTransition(async () => {
      const r = await reiniciarHistorialesAction(localId);
      setResultado(r);
      if (!r.error) {
        setAbierto(false);
        setConfirmacion("");
      }
    });
  }

  function cancelar() {
    setAbierto(false);
    setConfirmacion("");
  }

  return (
    <Card className="border-danger">
      <CardTitle>Zona de pruebas</CardTitle>
      <p className="text-sm text-text-muted mb-4">
        Borra de golpe todo el historial de actividad de este local: comandas, tickets, cierres de
        caja, reservas, pedidos a proveedor, recepciones, reposiciones, movimientos de stock, turnos y
        nóminas. No toca la carta, el inventario (stock actual), zonas/mesas, proveedores ni usuarios —
        solo lo que es un registro de algo que pasó. Pensado para volver a dejar un local de pruebas a
        cero. No hay vuelta atrás.
      </p>

      {!abierto ? (
        <Button type="button" variant="danger" onClick={() => setAbierto(true)}>
          Reiniciar historiales…
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text">
            Escribe <span className="font-mono font-semibold">{PALABRA_CONFIRMACION}</span> para
            confirmar que quieres borrar todo el historial.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              autoFocus
              className="h-10 bg-surface border border-border rounded-sm px-3 text-text font-mono w-48"
            />
            <Button
              type="button"
              variant="danger"
              disabled={confirmacion !== PALABRA_CONFIRMACION || pending}
              onClick={reiniciar}
            >
              {pending ? "Borrando…" : "Confirmar borrado"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelar} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {resultado?.error && <p className="text-sm text-danger mt-3">{resultado.error}</p>}
      {resultado?.resumen && <p className="text-sm text-success mt-3">{resultado.resumen}</p>}
    </Card>
  );
}
