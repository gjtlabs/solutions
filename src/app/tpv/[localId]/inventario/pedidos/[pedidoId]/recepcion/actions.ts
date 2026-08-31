"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type RecepcionFormState = { error?: string } | undefined;

export async function recibirPedido(
  localId: string,
  pedidoId: string,
  _prevState: RecepcionFormState,
  formData: FormData,
): Promise<RecepcionFormState> {
  await requireLocalAccess(localId);

  const pedido = await prisma.pedidoProveedor.findUnique({
    where: { id: pedidoId },
    include: { proveedor: true, lineas: true },
  });
  if (!pedido || pedido.proveedor.localId !== localId || pedido.estado !== "ENVIADO") {
    return { error: "Este pedido no está pendiente de recibir." };
  }

  const numeroAlbaran = String(formData.get("numeroAlbaran") ?? "").trim() || null;
  const incidencias = String(formData.get("incidencias") ?? "").trim() || null;

  const lineasRecibidas = pedido.lineas.map((linea) => {
    const cantidadRecibida = Number(formData.get(`cantidad:${linea.id}`));
    return {
      ingredienteId: linea.ingredienteId,
      cantidadRecibida: Number.isFinite(cantidadRecibida) && cantidadRecibida >= 0 ? cantidadRecibida : 0,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.recepcion.create({
      data: {
        pedidoId,
        numeroAlbaran,
        incidencias,
        lineas: { create: lineasRecibidas },
      },
    });
    await tx.pedidoProveedor.update({ where: { id: pedidoId }, data: { estado: "RECIBIDO" } });

    for (const linea of lineasRecibidas) {
      if (linea.cantidadRecibida <= 0) continue;
      await tx.ingrediente.update({
        where: { id: linea.ingredienteId },
        data: { stockAlmacen: { increment: linea.cantidadRecibida } },
      });
      await tx.movimientoStock.create({
        data: {
          ingredienteId: linea.ingredienteId,
          tipo: "ENTRADA",
          cantidad: linea.cantidadRecibida,
          referencia: `pedido:${pedidoId}`,
        },
      });
    }
  });

  revalidatePath(`/tpv/${localId}/inventario`);
  revalidatePath(`/tpv/${localId}/inventario/pedidos`);
  redirect(`/tpv/${localId}/inventario/pedidos/${pedidoId}`);
}
