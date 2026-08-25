"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeSemantic } from "@/components/ui/badge";

export type LineaEstado = {
  id: string;
  nombre: string;
  tipo: "COMIDA" | "BEBIDA";
  estado: "PENDIENTE" | "COCINA" | "SERVIDO";
  horaEnviada: string | null; // ISO
};

export type MesaEstado = {
  mesaId: string;
  numero: string;
  zonaNombre: string;
  horaApertura: string; // ISO
  lineas: LineaEstado[];
};

const UMBRAL_AVISO_MIN = 20;

// Recalcula el "hace cuánto" cada 15s — de sobra para una cifra en minutos,
// sin sobrecargar de renders una pantalla que suele quedarse encendida
// toda la jornada en el TPV.
function useAhora(intervaloMs: number) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

function formatearDuracion(ms: number) {
  const minutosTotales = Math.max(0, Math.floor(ms / 60000));
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;
}

// Desde cuándo lleva pendiente una categoría (bebidas o comidas) de una
// mesa: la más antigua de sus líneas sin servir, contando desde que se
// envió a cocina/barra o, si todavía no se envió, desde que se abrió la
// mesa. null si no hay nada pendiente en esa categoría.
function inicioPendiente(lineas: LineaEstado[], horaApertura: string): number | null {
  const pendientes = lineas.filter((l) => l.estado !== "SERVIDO");
  if (pendientes.length === 0) return null;
  return Math.min(
    ...pendientes.map((l) => (l.horaEnviada ? new Date(l.horaEnviada).getTime() : new Date(horaApertura).getTime())),
  );
}

// Lista de tarjetas, no tabla: con cinco datos por mesa (dos de ellos
// badges) una tabla clásica no cabe cómoda en una columna de un tercio de
// ancho — obliga a hacer scroll horizontal dentro de la propia tarjeta.
// Una lista se adapta sola al ancho disponible.
export function EstadoMesasPanel({ mesas }: { mesas: MesaEstado[] }) {
  const ahora = useAhora(15000);

  return (
    <Card>
      <CardTitle>Mesas en curso</CardTitle>
      {mesas.length === 0 ? (
        <p className="text-text-muted">No hay ninguna mesa abierta ahora mismo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mesas.map((m) => {
            const bebidas = m.lineas.filter((l) => l.tipo === "BEBIDA");
            const comidas = m.lineas.filter((l) => l.tipo === "COMIDA");
            const bebidasServidas = bebidas.length > 0 && bebidas.every((l) => l.estado === "SERVIDO");
            const comidasServidas = comidas.length > 0 && comidas.every((l) => l.estado === "SERVIDO");
            const ningunaServida = m.lineas.length > 0 && m.lineas.every((l) => l.estado !== "SERVIDO");
            const desdeBebidas = inicioPendiente(bebidas, m.horaApertura);
            const desdeComidas = inicioPendiente(comidas, m.horaApertura);

            return (
              <li
                key={m.mesaId}
                className={`rounded-sm px-3 py-2 ${ningunaServida ? "bg-warning-bg/50" : "bg-surface-2"}`}
              >
                <p className="font-medium text-text">
                  Mesa {m.numero} <span className="text-text-muted font-normal">· {m.zonaNombre}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {bebidas.length > 0 && (
                    <Badge semantic={bebidasServidas ? "success" : "warning"}>
                      Bebidas:{" "}
                      {bebidasServidas
                        ? "servidas"
                        : `pendientes desde hace ${formatearDuracion(ahora - (desdeBebidas ?? ahora))}`}
                    </Badge>
                  )}
                  {comidas.length > 0 && (
                    <Badge semantic={comidasServidas ? "success" : "warning"}>
                      Comidas:{" "}
                      {comidasServidas
                        ? "servidas"
                        : `pendientes desde hace ${formatearDuracion(ahora - (desdeComidas ?? ahora))}`}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

type ItemPorServir = {
  key: string;
  numero: string;
  zonaNombre: string;
  producto: string;
  tipo: "COMIDA" | "BEBIDA";
  minutos: number;
};

function ListaPorServir({ titulo, items }: { titulo: string; items: ItemPorServir[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text-muted">{titulo}</h3>
      {items.length === 0 ? (
        <p className="text-text-faint text-sm">Nada pendiente.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const tardio = item.minutos >= UMBRAL_AVISO_MIN;
            const semantic: BadgeSemantic = tardio ? "danger" : "info";
            return (
              <li
                key={item.key}
                className={`flex items-center justify-between gap-3 rounded-sm px-3 py-2 ${
                  tardio ? "bg-danger-bg" : "bg-surface-2"
                }`}
              >
                <span className="text-sm text-text">
                  Mesa {item.numero} ({item.zonaNombre}) — {item.producto}
                </span>
                <Badge semantic={semantic}>{item.minutos} min</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Todo lo que ya se envió (estado COCINA) y todavía no se ha servido, listo
// para que camareros y cocina/barra vean de un vistazo qué queda por subir
// — no solo lo que se ha retrasado. Lo que lleva más de 20 minutos se
// resalta en rojo dentro de la propia lista, en vez de tener una sección
// aparte solo para lo tardío.
export function PorServirPanel({ mesas }: { mesas: MesaEstado[] }) {
  const ahora = useAhora(15000);

  const pendientes: ItemPorServir[] = mesas
    .flatMap((m) =>
      m.lineas
        .filter((l) => l.estado === "COCINA" && l.horaEnviada)
        .map((l) => ({
          key: `${m.mesaId}-${l.id}`,
          numero: m.numero,
          zonaNombre: m.zonaNombre,
          producto: l.nombre,
          tipo: l.tipo,
          minutos: Math.floor((ahora - new Date(l.horaEnviada as string).getTime()) / 60000),
        })),
    )
    .sort((a, b) => b.minutos - a.minutos);

  const barra = pendientes.filter((p) => p.tipo === "BEBIDA");
  const cocina = pendientes.filter((p) => p.tipo === "COMIDA");

  return (
    <Card>
      <CardTitle>Por servir</CardTitle>
      <div className="flex flex-col gap-4">
        <ListaPorServir titulo="Barra" items={barra} />
        <ListaPorServir titulo="Cocina" items={cocina} />
      </div>
    </Card>
  );
}
