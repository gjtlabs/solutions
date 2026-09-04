"use client";

import { Badge } from "@/components/ui/badge";
import { useAhora, formatearDuracion } from "@/lib/tiempo-transcurrido";

export type LineaEstadoData = {
  id: string;
  nombre: string;
  cantidad: number;
  tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE";
  estado: "PENDIENTE" | "COCINA" | "SERVIDO";
  horaEnviada: string | null;
};

// Lo que ya se ha pedido, agrupado por bebida/comida y con su estado — a la
// vista mientras se sigue tomando nota, aparte del ticket (que es la
// cuenta, no el seguimiento de cocina/barra). La comida además lleva
// cuánto tiempo pendiente: es la que tarda y la que hay que vigilar: la
// bebida se sirve rápido, no hace falta cronometrarla.
export function EstadoLineas({
  lineas,
  horaApertura,
}: {
  lineas: LineaEstadoData[];
  horaApertura: string;
}) {
  const ahora = useAhora(15000);
  if (lineas.length === 0) return null;

  const bebidas = lineas.filter((l) => l.tipo === "BEBIDA");
  const comidas = lineas.filter((l) => l.tipo !== "BEBIDA");
  const inicioApertura = new Date(horaApertura).getTime();

  return (
    <div className="flex flex-col gap-4">
      {bebidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            Bebida
          </span>
          <div className="flex flex-col gap-1.5">
            {bebidas.map((l) => (
              <FilaEstado key={l.id} linea={l} ahora={ahora} inicioApertura={inicioApertura} mostrarTiempo={false} />
            ))}
          </div>
        </div>
      )}
      {comidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            Comida
          </span>
          <div className="flex flex-col gap-1.5">
            {comidas.map((l) => (
              <FilaEstado key={l.id} linea={l} ahora={ahora} inicioApertura={inicioApertura} mostrarTiempo />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilaEstado({
  linea,
  ahora,
  inicioApertura,
  mostrarTiempo,
}: {
  linea: LineaEstadoData;
  ahora: number;
  inicioApertura: number;
  mostrarTiempo: boolean;
}) {
  const servida = linea.estado === "SERVIDO";
  const inicioPendiente = linea.horaEnviada ? new Date(linea.horaEnviada).getTime() : inicioApertura;

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-text">
        {linea.cantidad}× {linea.nombre}
      </span>
      {servida ? (
        <Badge semantic="success">Servido</Badge>
      ) : (
        <Badge semantic="warning">
          {mostrarTiempo ? `Pendiente · ${formatearDuracion(ahora - inicioPendiente)}` : "Pendiente"}
        </Badge>
      )}
    </div>
  );
}
