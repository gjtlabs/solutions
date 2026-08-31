import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { RecepcionForm, type LineaPedidoData } from "./recepcion-form";

export default async function RecepcionPage({
  params,
}: {
  params: Promise<{ localId: string; pedidoId: string }>;
}) {
  const { localId, pedidoId } = await params;

  const pedido = await prisma.pedidoProveedor.findUnique({
    where: { id: pedidoId },
    include: { proveedor: true, lineas: { include: { ingrediente: true } } },
  });

  if (!pedido || pedido.proveedor.localId !== localId) notFound();
  if (pedido.estado !== "ENVIADO") {
    redirect(`/tpv/${localId}/inventario/pedidos/${pedidoId}`);
  }

  const lineas: LineaPedidoData[] = pedido.lineas.map((linea) => ({
    id: linea.id,
    ingredienteNombre: linea.ingrediente.nombre,
    unidadMedida: linea.ingrediente.unidadMedida,
    cantidadPedida: Number(linea.cantidad),
    precioUnitario: Number(linea.precioUnitario),
  }));

  return (
    <Card>
      <CardTitle>Recibir albarán de {pedido.proveedor.nombre}</CardTitle>
      <p className="text-text-muted mb-4">
        Ajusta la cantidad recibida si difiere de lo pedido — se suma a stock de
        almacén tal como la confirmes aquí.
      </p>
      <RecepcionForm localId={localId} pedidoId={pedidoId} lineas={lineas} />
    </Card>
  );
}
