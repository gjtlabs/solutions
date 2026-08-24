import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { MesaForm } from "./mesa-form";
import { borrarMesa } from "./actions";

export default async function MesasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const mesas = await prisma.mesa.findMany({
    where: { localId },
    orderBy: [{ zona: "asc" }, { numero: "asc" }],
  });

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Mesas</h1>
        <Link href={`/tpv/${localId}`}>
          <Button variant="ghost">Volver al plano</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Añadir mesa</CardTitle>
        <MesaForm localId={localId} />
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
                <TableRow key={mesa.id}>
                  <Td>{mesa.zona}</Td>
                  <Td>{mesa.numero}</Td>
                  <Td numeric>{mesa.capacidad}</Td>
                  <Td>
                    <form action={borrarMesa.bind(null, localId, mesa.id)}>
                      <Button type="submit" variant="ghost" size="normal">
                        Borrar
                      </Button>
                    </form>
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
