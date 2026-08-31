import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th } from "@/components/ui/table";
import { RecetaForm } from "./receta-form";
import { LineaRecetaRow } from "./linea-receta-row";

export default async function EscandalloPage({
  params,
}: {
  params: Promise<{ localId: string; productoId: string }>;
}) {
  const { localId, productoId } = await params;
  await requireLocalAccess(localId);

  const [producto, ingredientes] = await Promise.all([
    prisma.producto.findUnique({
      where: { id: productoId },
      include: { receta: { include: { ingrediente: true }, orderBy: { id: "asc" } } },
    }),
    prisma.ingrediente.findMany({ where: { localId }, orderBy: { nombre: "asc" } }),
  ]);

  if (!producto || producto.localId !== localId) notFound();

  const costeEscandallo = producto.receta.reduce(
    (acc, l) => acc + Number(l.cantidad) * Number(l.ingrediente.costeUnitario),
    0,
  );
  const margen = Number(producto.precioVenta) - costeEscandallo;

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{producto.nombre}</h1>
          <p className="text-text-muted">Escandallo — qué referencias de inventario consume esta venta</p>
        </div>
        <Link href={`/tpv/${localId}/productos`}>
          <Button variant="ghost">Volver a productos</Button>
        </Link>
      </div>

      <Card>
        <CardTitle>Composición</CardTitle>
        {producto.receta.length === 0 ? (
          <p className="text-text-muted">
            Todavía no consume ninguna referencia — cobrar este producto no
            descontará stock hasta que le añadas al menos una abajo.
          </p>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Referencia</Th>
                  <Th>Cantidad</Th>
                  <Th>Coste</Th>
                  <Th />
                </TableRow>
              </TableHead>
              <TableBody>
                {producto.receta.map((linea) => (
                  <LineaRecetaRow
                    key={linea.id}
                    localId={localId}
                    productoId={productoId}
                    linea={{
                      id: linea.id,
                      ingredienteNombre: linea.ingrediente.nombre,
                      unidadMedida: linea.ingrediente.unidadMedida,
                      cantidad: Number(linea.cantidad),
                      costeUnitario: Number(linea.ingrediente.costeUnitario),
                    }}
                  />
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-text-muted mt-4">
              Coste del escandallo: <span className="font-mono">{costeEscandallo.toFixed(4)} €</span> · Precio
              de venta: <span className="font-mono">{Number(producto.precioVenta).toFixed(2)} €</span> ·
              Margen: <span className="font-mono">{margen.toFixed(2)} €</span>
            </p>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>Añadir referencia</CardTitle>
        {ingredientes.length === 0 ? (
          <p className="text-text-muted">
            Todavía no hay ninguna referencia de inventario.{" "}
            <Link href={`/tpv/${localId}/inventario`} className="text-brand underline">
              Da de alta la primera
            </Link>
            .
          </p>
        ) : (
          <RecetaForm
            localId={localId}
            productoId={productoId}
            ingredientes={ingredientes.map((i) => ({
              id: i.id,
              nombre: i.nombre,
              unidadMedida: i.unidadMedida,
            }))}
          />
        )}
      </Card>
    </main>
  );
}
