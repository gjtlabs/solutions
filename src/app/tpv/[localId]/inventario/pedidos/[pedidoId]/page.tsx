import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeSemantic } from "@/components/ui/badge";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { LineaPedidoForm } from "./linea-pedido-form";
import { quitarLineaPedido, marcarEnviado, borrarPedido } from "../actions";

const ESTADO_BADGE: Record<string, { texto: string; semantic: BadgeSemantic }> = {
  BORRADOR: { texto: "Borrador", semantic: "neutral" },
  ENVIADO: { texto: "Enviado", semantic: "warning" },
  RECIBIDO: { texto: "Recibido", semantic: "success" },
};

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ localId: string; pedidoId: string }>;
}) {
  const { localId, pedidoId } = await params;

  const [pedido, ingredientes] = await Promise.all([
    prisma.pedidoProveedor.findUnique({
      where: { id: pedidoId },
      include: {
        proveedor: true,
        lineas: { include: { ingrediente: true }, orderBy: { id: "asc" } },
        recepcion: true,
      },
    }),
    prisma.ingrediente.findMany({ where: { localId }, orderBy: { nombre: "asc" } }),
  ]);

  if (!pedido || pedido.proveedor.localId !== localId) notFound();

  const badge = ESTADO_BADGE[pedido.estado];

  return (
    <>
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-text">{pedido.proveedor.nombre}</h2>
            <Badge semantic={badge.semantic}>{badge.texto}</Badge>
          </div>
          <div className="flex gap-2">
            {pedido.estado === "ENVIADO" && (
              <Link href={`/tpv/${localId}/inventario/pedidos/${pedido.id}/recepcion`}>
                <Button variant="primary">Recibir albarán</Button>
              </Link>
            )}
            {pedido.estado === "BORRADOR" && pedido.lineas.length > 0 && (
              <form action={marcarEnviado.bind(null, localId, pedido.id)}>
                <Button type="submit" variant="primary">
                  Marcar como enviado
                </Button>
              </form>
            )}
            {pedido.estado === "BORRADOR" && (
              <form action={borrarPedido.bind(null, localId, pedido.id)}>
                <Button type="submit" variant="danger">
                  Borrar pedido
                </Button>
              </form>
            )}
          </div>
        </div>

        {pedido.lineas.length === 0 ? (
          <p className="text-text-muted">Este pedido todavía no tiene líneas.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Referencia</Th>
                <Th>Cantidad pedida</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {pedido.lineas.map((linea) => (
                <TableRow key={linea.id}>
                  <Td>{linea.ingrediente.nombre}</Td>
                  <Td numeric>
                    {Number(linea.cantidad).toFixed(2)} {linea.ingrediente.unidadMedida}
                  </Td>
                  <Td>
                    {pedido.estado === "BORRADOR" && (
                      <div className="flex justify-end">
                        <form action={quitarLineaPedido.bind(null, localId, pedido.id, linea.id)}>
                          <Button type="submit" variant="ghost">
                            Quitar
                          </Button>
                        </form>
                      </div>
                    )}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {pedido.estado === "BORRADOR" && (
        <Card>
          <CardTitle>Añadir línea</CardTitle>
          {ingredientes.length === 0 ? (
            <p className="text-text-muted">
              Todavía no hay ninguna referencia.{" "}
              <Link href={`/tpv/${localId}/inventario`} className="text-brand underline">
                Da de alta la primera
              </Link>
              .
            </p>
          ) : (
            <LineaPedidoForm localId={localId} pedidoId={pedido.id} ingredientes={ingredientes} />
          )}
        </Card>
      )}

      {pedido.recepcion && (
        <Card>
          <CardTitle>Recepción</CardTitle>
          <p className="text-text-muted">
            Albarán {pedido.recepcion.numeroAlbaran ?? "sin número"} ·{" "}
            {pedido.recepcion.fecha.toLocaleDateString("es-ES")}
          </p>
          {pedido.recepcion.incidencias && (
            <p className="text-warning text-sm mt-2">{pedido.recepcion.incidencias}</p>
          )}
        </Card>
      )}
    </>
  );
}
