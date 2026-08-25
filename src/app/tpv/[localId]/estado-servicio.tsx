"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";

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

const UMBRAL_ALERTA_MIN = 20;

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

export function EstadoMesasPanel({ mesas }: { mesas: MesaEstado[] }) {
  const ahora = useAhora(15000);

  return (
    <Card>
      <CardTitle>Mesas en curso</CardTitle>
      {mesas.length === 0 ? (
        <p className="text-text-muted">No hay ninguna mesa abierta ahora mismo.</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <Th>Mesa</Th>
              <Th>Zona</Th>
              <Th>Sin servir desde hace</Th>
              <Th>Bebidas</Th>
              <Th>Comidas</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {mesas.map((m) => {
              const bebidas = m.lineas.filter((l) => l.tipo === "BEBIDA");
              const comidas = m.lineas.filter((l) => l.tipo === "COMIDA");
              const bebidasServidas = bebidas.length > 0 && bebidas.every((l) => l.estado === "SERVIDO");
              const comidasServidas = comidas.length > 0 && comidas.every((l) => l.estado === "SERVIDO");
              const ningunaServida = m.lineas.length > 0 && m.lineas.every((l) => l.estado !== "SERVIDO");
              const transcurridoMs = ahora - new Date(m.horaApertura).getTime();

              return (
                <TableRow key={m.mesaId} className={ningunaServida ? "bg-warning-bg/50" : undefined}>
                  <Td>{m.numero}</Td>
                  <Td>{m.zonaNombre}</Td>
                  <Td numeric>{ningunaServida ? formatearDuracion(transcurridoMs) : "—"}</Td>
                  <Td>
                    {bebidas.length === 0 ? (
                      <span className="text-text-faint">—</span>
                    ) : (
                      <Badge semantic={bebidasServidas ? "success" : "warning"}>
                        {bebidasServidas ? "Servidas" : "Pendientes"}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    {comidas.length === 0 ? (
                      <span className="text-text-faint">—</span>
                    ) : (
                      <Badge semantic={comidasServidas ? "success" : "warning"}>
                        {comidasServidas ? "Servidas" : "Pendientes"}
                      </Badge>
                    )}
                  </Td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export function AlertasPanel({ mesas }: { mesas: MesaEstado[] }) {
  const ahora = useAhora(15000);

  const alertas = mesas
    .flatMap((m) =>
      m.lineas
        .filter((l) => l.tipo === "COMIDA" && l.estado === "COCINA" && l.horaEnviada)
        .map((l) => ({
          key: `${m.mesaId}-${l.id}`,
          numero: m.numero,
          zonaNombre: m.zonaNombre,
          producto: l.nombre,
          minutos: Math.floor((ahora - new Date(l.horaEnviada as string).getTime()) / 60000),
        })),
    )
    .filter((a) => a.minutos >= UMBRAL_ALERTA_MIN)
    .sort((a, b) => b.minutos - a.minutos);

  return (
    <Card>
      <CardTitle>Alertas de cocina</CardTitle>
      {alertas.length === 0 ? (
        <p className="text-text-muted">
          Sin avisos — ningún plato lleva más de {UMBRAL_ALERTA_MIN} minutos sin salir.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alertas.map((a) => (
            <li
              key={a.key}
              className="flex items-center justify-between gap-3 rounded-sm bg-danger-bg px-3 py-2"
            >
              <span className="text-text">
                Mesa {a.numero} ({a.zonaNombre}) — {a.producto}
              </span>
              <Badge semantic="danger">{a.minutos} min sin salir</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
