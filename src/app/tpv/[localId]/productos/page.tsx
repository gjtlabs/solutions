import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th } from "@/components/ui/table";
import { ProductoForm } from "./producto-form";
import { ProductoRow, type ProductoData } from "./producto-row";

export default async function ProductosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const productos = await prisma.producto.findMany({
    where: { localId },
    orderBy: { nombre: "asc" },
  });

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Productos</h1>
        <Link href={`/tpv/${localId}`}>
          <Button variant="ghost">Volver a inicio</Button>
        </Link>
      </div>

      <p className="text-sm text-text-muted -mt-4">
        Alta rápida para poder tomar comandas. La gestión completa de la
        carta (categorías, visibilidad, QR) llega en la siguiente fase.
      </p>

      <Card>
        <CardTitle>Añadir producto</CardTitle>
        <ProductoForm localId={localId} />
      </Card>

      <Card>
        <CardTitle>Carta actual</CardTitle>
        {productos.length === 0 ? (
          <p className="text-text-muted">Todavía no hay ningún producto.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Precio</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {productos.map((producto) => {
                const data: ProductoData = {
                  id: producto.id,
                  nombre: producto.nombre,
                  precioVenta: Number(producto.precioVenta),
                  tipo: producto.tipo,
                };
                return <ProductoRow key={producto.id} localId={localId} producto={data} />;
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </main>
  );
}
