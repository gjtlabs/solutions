import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";

const NOMBRE_METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

function inicioDeDia(fecha: Date) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDeDia(fecha: Date) {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatearInputFecha(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatearDiaLargo(clave: string) {
  const [y, m, d] = clave.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function BarraMagnitud({ valor, maximo }: { valor: number; maximo: number }) {
  const pct = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
  return (
    <div className="h-5 w-full rounded-sm bg-surface-2">
      <div className="h-5 rounded-sm bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function VentasPage({
  params,
  searchParams,
}: {
  params: Promise<{ localId: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);
  const sp = await searchParams;

  const hoy = new Date();
  const hace30 = new Date(hoy);
  hace30.setDate(hace30.getDate() - 30);

  const desde = sp.desde ? inicioDeDia(new Date(sp.desde)) : inicioDeDia(hace30);
  const hasta = sp.hasta ? finDeDia(new Date(sp.hasta)) : finDeDia(hoy);

  const tickets = await prisma.ticket.findMany({
    where: { comanda: { mesa: { localId } }, fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: "desc" },
    include: {
      comanda: {
        include: {
          mesa: { select: { numero: true, zona: { select: { nombre: true } } } },
          lineas: { include: { producto: { select: { nombre: true, precioVenta: true } } } },
        },
      },
    },
  });

  const totalVentas = tickets.reduce((acc, t) => acc + Number(t.total), 0);

  const porDiaMapa = new Map<string, { total: number; tickets: number }>();
  const porHoraMapa = new Map<number, { total: number; tickets: number }>();
  const porProductoMapa = new Map<string, { unidades: number; importe: number }>();

  for (const t of tickets) {
    const claveDia = formatearInputFecha(t.fecha);
    const dia = porDiaMapa.get(claveDia) ?? { total: 0, tickets: 0 };
    dia.total += Number(t.total);
    dia.tickets += 1;
    porDiaMapa.set(claveDia, dia);

    const hora = t.fecha.getHours();
    const franja = porHoraMapa.get(hora) ?? { total: 0, tickets: 0 };
    franja.total += Number(t.total);
    franja.tickets += 1;
    porHoraMapa.set(hora, franja);

    for (const linea of t.comanda.lineas) {
      const nombre = linea.producto.nombre;
      const importeLinea = linea.cantidad * Number(linea.producto.precioVenta);
      const actual = porProductoMapa.get(nombre) ?? { unidades: 0, importe: 0 };
      actual.unidades += linea.cantidad;
      actual.importe += importeLinea;
      porProductoMapa.set(nombre, actual);
    }
  }

  const porDia = [...porDiaMapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const porHora = [...porHoraMapa.entries()].sort((a, b) => a[0] - b[0]);
  const porProducto = [...porProductoMapa.entries()].sort((a, b) => b[1].importe - a[1].importe);

  const maxPorDia = Math.max(0, ...porDia.map(([, v]) => v.total));
  const maxPorHora = Math.max(0, ...porHora.map(([, v]) => v.total));
  const maxPorProducto = Math.max(0, ...porProducto.map(([, v]) => v.importe));

  return (
    <main className="flex-1 p-8 max-w-4xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-text">Ventas</h1>
        <div className="flex gap-2">
          <Link href={`/tpv/${localId}/caja`}>
            <Button variant="secondary">Caja</Button>
          </Link>
          <Link href={`/tpv/${localId}`}>
            <Button variant="ghost">Volver a inicio</Button>
          </Link>
        </div>
      </div>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Input label="Desde" name="desde" type="date" defaultValue={formatearInputFecha(desde)} />
          <Input label="Hasta" name="hasta" type="date" defaultValue={formatearInputFecha(hasta)} />
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          <p className="text-sm text-text-muted basis-full">
            {tickets.length} tickets · <span className="font-mono">{totalVentas.toFixed(2)} €</span> en total
          </p>
        </form>
      </Card>

      <Card>
        <CardTitle>Ventas por día</CardTitle>
        {porDia.length === 0 ? (
          <p className="text-text-muted">Sin ventas en este periodo.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {porDia.map(([clave, v]) => (
              <div key={clave} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-text-muted capitalize">
                  {formatearDiaLargo(clave)}
                </span>
                <BarraMagnitud valor={v.total} maximo={maxPorDia} />
                <span className="w-24 shrink-0 text-right font-mono text-sm text-text tabular-nums">
                  {v.total.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Ventas por franja horaria</CardTitle>
        {porHora.length === 0 ? (
          <p className="text-text-muted">Sin ventas en este periodo.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {porHora.map(([hora, v]) => (
              <div key={hora} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm text-text-muted font-mono">
                  {String(hora).padStart(2, "0")}:00
                </span>
                <BarraMagnitud valor={v.total} maximo={maxPorHora} />
                <span className="w-24 shrink-0 text-right font-mono text-sm text-text tabular-nums">
                  {v.total.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Ventas por producto</CardTitle>
        {porProducto.length === 0 ? (
          <p className="text-text-muted">Sin ventas en este periodo.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {porProducto.map(([nombre, v]) => (
              <div key={nombre} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-text-muted" title={nombre}>
                  {nombre}
                </span>
                <BarraMagnitud valor={v.importe} maximo={maxPorProducto} />
                <span className="w-32 shrink-0 text-right font-mono text-sm text-text tabular-nums">
                  {v.unidades}× — {v.importe.toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Histórico de tickets</CardTitle>
        {tickets.length === 0 ? (
          <p className="text-text-muted">Sin tickets en este periodo.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Fecha</Th>
                <Th>Mesa</Th>
                <Th>Método</Th>
                <Th>Total</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <Td compact>
                    {t.fecha.toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Td>
                  <Td compact>
                    {t.comanda.mesa.zona.nombre} · {t.comanda.mesa.numero}
                  </Td>
                  <Td compact>{NOMBRE_METODO[t.metodoPago] ?? t.metodoPago}</Td>
                  <Td compact numeric>
                    {Number(t.total).toFixed(2)} €
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </main>
  );
}
