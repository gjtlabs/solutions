import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { VolverAtrasButton } from "@/components/volver-atras-button";
import { Card, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, Th } from "@/components/ui/table";
import { CierreForm } from "./cierre-form";
import { CierreRow } from "./cierre-row";

function formatearFechaHora(fecha: Date) {
  return fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Cifra({ etiqueta, valor, destacado }: { etiqueta: string; valor: number; destacado?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-faint">{etiqueta}</p>
      <p
        className={`font-mono tabular-nums ${
          destacado ? "text-xl font-semibold text-text" : "text-lg text-text"
        }`}
      >
        {valor.toFixed(2)} €
      </p>
    </div>
  );
}

export default async function CajaPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const [ticketsPendientes, cierres] = await Promise.all([
    prisma.ticket.findMany({
      where: { cierreCajaId: null, comanda: { mesa: { localId } } },
      orderBy: { fecha: "asc" },
      select: { id: true, total: true, metodoPago: true, fecha: true },
    }),
    prisma.cierreCaja.findMany({
      where: { localId },
      orderBy: { fecha: "desc" },
      take: 20,
      include: { _count: { select: { tickets: true } } },
    }),
  ]);

  const porMetodo = { EFECTIVO: 0, TARJETA: 0, OTRO: 0 };
  for (const t of ticketsPendientes) {
    porMetodo[t.metodoPago] += Number(t.total);
  }
  const totalPendiente = porMetodo.EFECTIVO + porMetodo.TARJETA + porMetodo.OTRO;
  const desde = ticketsPendientes[0]?.fecha ?? null;

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-text">Caja</h1>
        <div className="flex gap-2">
          <VolverAtrasButton />
          <Link href={`/tpv/${localId}`}>
            <Button variant="ghost">Inicio</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardTitle>Periodo abierto</CardTitle>
        {ticketsPendientes.length === 0 ? (
          <p className="text-text-muted">No hay ventas pendientes de cierre.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Desde {desde ? formatearFechaHora(desde) : "—"} · {ticketsPendientes.length} tickets
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Cifra etiqueta="Efectivo" valor={porMetodo.EFECTIVO} />
              <Cifra etiqueta="Tarjeta" valor={porMetodo.TARJETA} />
              <Cifra etiqueta="Otro" valor={porMetodo.OTRO} />
              <Cifra etiqueta="Total" valor={totalPendiente} destacado />
            </div>
            <p className="text-sm text-text-muted">
              Solo el efectivo se cuenta en caja — es el único que deja dinero físico que arquear.
            </p>
            <CierreForm localId={localId} totalEsperado={porMetodo.EFECTIVO} />
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Histórico de cierres</CardTitle>
        {cierres.length === 0 ? (
          <p className="text-text-muted">Todavía no se ha cerrado caja.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Fecha</Th>
                <Th>Tickets</Th>
                <Th>Esperado</Th>
                <Th>Contado</Th>
                <Th>Diferencia</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {cierres.map((c) => (
                <CierreRow
                  key={c.id}
                  localId={localId}
                  cierre={{
                    id: c.id,
                    fechaTexto: formatearFechaHora(c.fecha),
                    tickets: c._count.tickets,
                    totalEsperado: Number(c.totalEsperado),
                    totalContado: Number(c.totalContado),
                  }}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </main>
  );
}
