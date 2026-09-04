import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th } from "@/components/ui/table";
import { MesaForm } from "./mesa-form";
import { ZonaPanel } from "./zona-panel";
import { MesaRow } from "./mesa-row";

export default async function MesasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const [zonasRaw, mesas] = await Promise.all([
    prisma.zona.findMany({
      where: { localId },
      orderBy: { orden: "asc" },
      include: { _count: { select: { mesas: true } } },
    }),
    prisma.mesa.findMany({
      where: { localId },
      include: { zona: { select: { nombre: true } } },
      orderBy: [{ zona: { orden: "asc" } }, { numero: "asc" }],
    }),
  ]);

  const zonas = zonasRaw.map((z) => ({ id: z.id, nombre: z.nombre, mesas: z._count.mesas }));

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Mesas</h1>
        <Link href={`/tpv/${localId}/plano`}>
          <Button variant="ghost">Volver al plano</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Zonas</CardTitle>
        <ZonaPanel localId={localId} zonas={zonas} />
      </Card>

      <Card>
        <CardTitle>Añadir mesa</CardTitle>
        <MesaForm localId={localId} zonas={zonas} />
      </Card>

      <Card>
        <CardTitle>Todas las mesas</CardTitle>
        {mesas.length === 0 ? (
          <p className="text-text-muted">Todavía no hay ninguna.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Zona</Th>
                <Th>Número</Th>
                <Th>Capacidad</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {mesas.map((mesa) => (
                <MesaRow
                  key={mesa.id}
                  localId={localId}
                  mesa={{
                    id: mesa.id,
                    zonaNombre: mesa.zona.nombre,
                    numero: mesa.numero,
                    capacidad: mesa.capacidad,
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
