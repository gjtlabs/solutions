import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { ProveedorForm } from "./proveedor-form";
import { borrarProveedor } from "./actions";
import { crearPedido } from "../inventario/pedidos/actions";

export default async function ProveedoresPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const proveedores = await prisma.proveedor.findMany({
    where: { localId },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { pedidos: true } } },
  });

  return (
    <main className="flex-1 p-8 max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-text">Proveedores</h1>
        <div className="flex gap-2">
          <Link href={`/tpv/${localId}/inventario`}>
            <Button variant="secondary">Inventario</Button>
          </Link>
          <Link href={`/tpv/${localId}`}>
            <Button variant="ghost">Volver al plano</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardTitle>Añadir proveedor</CardTitle>
        <ProveedorForm localId={localId} />
      </Card>

      <Card>
        <CardTitle>Proveedores</CardTitle>
        {proveedores.length === 0 ? (
          <p className="text-text-muted">Todavía no hay ningún proveedor.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Nombre</Th>
                <Th>Contacto</Th>
                <Th>Productos habituales</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {proveedores.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <Td>{proveedor.nombre}</Td>
                  <Td>{proveedor.contacto ?? "—"}</Td>
                  <Td>{proveedor.productosHabituales ?? "—"}</Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <form action={crearPedido.bind(null, localId, proveedor.id)}>
                        <Button type="submit" variant="ghost" size="normal">
                          Nuevo pedido
                        </Button>
                      </form>
                      {proveedor._count.pedidos === 0 && (
                        <form action={borrarProveedor.bind(null, localId, proveedor.id)}>
                          <Button type="submit" variant="ghost" size="normal">
                            Borrar
                          </Button>
                        </form>
                      )}
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
