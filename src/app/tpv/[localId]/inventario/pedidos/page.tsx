import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeSemantic } from "@/components/ui/badge";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { PedidoForm } from "./pedido-form";

const ESTADO_BADGE: Record<string, { texto: string; semantic: BadgeSemantic }> = {
  BORRADOR: { texto: "Borrador", semantic: "neutral" },
  ENVIADO: { texto: "Enviado", semantic: "warning" },
  RECIBIDO: { texto: "Recibido", semantic: "success" },
};

function formatearFecha(fecha: Date) {
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;

  const [proveedores, pedidos] = await Promise.all([
    prisma.proveedor.findMany({ where: { localId }, orderBy: { nombre: "asc" } }),
    prisma.pedidoProveedor.findMany({
      where: { proveedor: { localId } },
      orderBy: { fecha: "desc" },
      include: { proveedor: true, _count: { select: { lineas: true } } },
    }),
  ]);

  return (
    <>
      <Card>
        <CardTitle>Nuevo pedido</CardTitle>
        {proveedores.length === 0 ? (
          <p className="text-text-muted">
            Todavía no hay ningún proveedor.{" "}
            <Link href={`/tpv/${localId}/proveedores`} className="text-brand underline">
              Da de alta el primero
            </Link>
            .
          </p>
        ) : (
          <PedidoForm localId={localId} proveedores={proveedores} />
        )}
      </Card>

      <Card>
        <CardTitle>Pedidos</CardTitle>
        {pedidos.length === 0 ? (
          <p className="text-text-muted">Todavía no hay ningún pedido.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Proveedor</Th>
                <Th>Fecha</Th>
                <Th>Estado</Th>
                <Th>Referencias</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {pedidos.map((pedido) => {
                const badge = ESTADO_BADGE[pedido.estado];
                return (
                  <TableRow key={pedido.id}>
                    <Td>{pedido.proveedor.nombre}</Td>
                    <Td>{formatearFecha(pedido.fecha)}</Td>
                    <Td>
                      <Badge semantic={badge.semantic}>{badge.texto}</Badge>
                    </Td>
                    <Td numeric>{pedido._count.lineas}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <Link
                          href={`/tpv/${localId}/inventario/pedidos/${pedido.id}`}
                          className="text-brand underline text-sm"
                        >
                          Ver
                        </Link>
                      </div>
                    </Td>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
