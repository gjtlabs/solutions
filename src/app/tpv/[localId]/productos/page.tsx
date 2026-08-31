import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { ProductoForm } from "./producto-form";
import { borrarProducto } from "./actions";

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
          <Button variant="ghost">Volver al plano</Button>
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
              {productos.map((producto) => (
                <TableRow key={producto.id}>
                  <Td>{producto.nombre}</Td>
                  <Td>
                    <Badge semantic="neutral">
                      {producto.tipo === "BEBIDA" ? "Bebida" : "Comida"}
                    </Badge>
                  </Td>
                  <Td numeric>{Number(producto.precioVenta).toFixed(2)} €</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link href={`/tpv/${localId}/productos/${producto.id}`}>
                        <Button type="button" variant="ghost" size="normal">
                          Escandallo
                        </Button>
                      </Link>
                      <form action={borrarProducto.bind(null, localId, producto.id)}>
                        <Button type="submit" variant="ghost" size="normal">
                          Borrar
                        </Button>
                      </form>
                    </div>
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
