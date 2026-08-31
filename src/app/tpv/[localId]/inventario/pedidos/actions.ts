"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export async function crearPedido(localId: string, proveedorId: string) {
  await requireLocalAccess(localId);
  const pedido = await prisma.pedidoProveedor.create({ data: { proveedorId } });
  revalidatePath(`/tpv/${localId}/inventario/pedidos`);
  redirect(`/tpv/${localId}/inventario/pedidos/${pedido.id}`);
}

export type LineaPedidoFormState = { error?: string } | undefined;

export async function anadirLineaPedido(
  localId: string,
  pedidoId: string,
  _prevState: LineaPedidoFormState,
  formData: FormData,
): Promise<LineaPedidoFormState> {
  await requireLocalAccess(localId);

  const ingredienteId = String(formData.get("ingredienteId") ?? "");
  const cantidad = Number(formData.get("cantidad"));

  if (!ingredienteId) {
    return { error: "Elige una referencia." };
  }
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un número mayor que 0." };
  }

  const pedido = await prisma.pedidoProveedor.findUnique({
    where: { id: pedidoId },
    select: { estado: true },
  });
  if (!pedido || pedido.estado !== "BORRADOR") {
    return { error: "Este pedido ya no se puede editar." };
  }

  await prisma.pedidoProveedorLinea.upsert({
    where: { pedidoId_ingredienteId: { pedidoId, ingredienteId } },
    create: { pedidoId, ingredienteId, cantidad },
    update: { cantidad: { increment: cantidad } },
  });

  revalidatePath(`/tpv/${localId}/inventario/pedidos/${pedidoId}`);
  return undefined;
}

export async function quitarLineaPedido(localId: string, pedidoId: string, lineaId: string) {
  await requireLocalAccess(localId);
  await prisma.pedidoProveedorLinea.delete({
    where: { id: lineaId, pedido: { id: pedidoId, estado: "BORRADOR" } },
  });
  revalidatePath(`/tpv/${localId}/inventario/pedidos/${pedidoId}`);
}

export async function marcarEnviado(localId: string, pedidoId: string) {
  await requireLocalAccess(localId);
  await prisma.pedidoProveedor.update({
    where: { id: pedidoId, estado: "BORRADOR" },
    data: { estado: "ENVIADO" },
  });
  revalidatePath(`/tpv/${localId}/inventario/pedidos/${pedidoId}`);
  revalidatePath(`/tpv/${localId}/inventario/pedidos`);
}

export async function borrarPedido(localId: string, pedidoId: string) {
  await requireLocalAccess(localId);
  await prisma.pedidoProveedor.delete({ where: { id: pedidoId, estado: "BORRADOR" } });
  revalidatePath(`/tpv/${localId}/inventario/pedidos`);
  redirect(`/tpv/${localId}/inventario/pedidos`);
}
