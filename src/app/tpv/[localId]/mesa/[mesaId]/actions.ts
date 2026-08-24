"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

async function comandaAbierta(mesaId: string) {
  return prisma.comanda.findFirst({
    where: { mesaId, estado: { in: ["ABIERTA", "ENVIADA"] } },
  });
}

export async function abrirMesa(localId: string, mesaId: string) {
  const { session } = await requireLocalAccess(localId);
  const existente = await comandaAbierta(mesaId);
  if (!existente) {
    await prisma.comanda.create({
      data: { mesaId, camareroId: session.user.id },
    });
  }
  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  revalidatePath(`/tpv/${localId}`);
}

export type LineaFormState = { error?: string } | undefined;

export async function addLinea(
  localId: string,
  mesaId: string,
  _prevState: LineaFormState,
  formData: FormData,
): Promise<LineaFormState> {
  await requireLocalAccess(localId);
  const comanda = await comandaAbierta(mesaId);
  if (!comanda) {
    return { error: "Esta mesa no tiene una comanda abierta." };
  }

  const productoId = String(formData.get("productoId") ?? "");
  const cantidad = Number(formData.get("cantidad"));
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!productoId) {
    return { error: "Elige un producto." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { error: "La cantidad tiene que ser un número mayor que 0." };
  }

  await prisma.lineaComanda.create({
    data: { comandaId: comanda.id, productoId, cantidad, notas },
  });

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  return undefined;
}

export async function enviarACocina(localId: string, mesaId: string) {
  await requireLocalAccess(localId);
  const comanda = await comandaAbierta(mesaId);
  if (!comanda) return;

  await prisma.$transaction([
    prisma.lineaComanda.updateMany({
      where: { comandaId: comanda.id, estado: "PENDIENTE" },
      data: { estado: "COCINA" },
    }),
    prisma.comanda.update({
      where: { id: comanda.id },
      data: { estado: "ENVIADA" },
    }),
  ]);

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
}

export async function marcarServido(localId: string, mesaId: string, lineaId: string) {
  await requireLocalAccess(localId);
  await prisma.lineaComanda.update({
    where: { id: lineaId },
    data: { estado: "SERVIDO" },
  });
  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
}

export type CobroFormState = { error?: string } | undefined;

export async function cobrar(
  localId: string,
  mesaId: string,
  _prevState: CobroFormState,
  formData: FormData,
): Promise<CobroFormState> {
  await requireLocalAccess(localId);
  const comanda = await comandaAbierta(mesaId);
  if (!comanda) {
    return { error: "Esta mesa no tiene una comanda abierta." };
  }

  const lineas = await prisma.lineaComanda.findMany({
    where: { comandaId: comanda.id },
    include: { producto: true },
  });
  if (lineas.length === 0) {
    return { error: "Añade al menos un producto antes de cobrar." };
  }

  const total = lineas.reduce(
    (acc, l) => acc + Number(l.producto.precioVenta) * l.cantidad,
    0,
  );
  const metodoPago = String(formData.get("metodoPago") ?? "EFECTIVO") as
    | "EFECTIVO"
    | "TARJETA"
    | "OTRO";

  await prisma.$transaction([
    prisma.ticket.create({
      data: { comandaId: comanda.id, total, metodoPago },
    }),
    prisma.comanda.update({
      where: { id: comanda.id },
      data: { estado: "COBRADA", horaCierre: new Date() },
    }),
  ]);

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  revalidatePath(`/tpv/${localId}`);
  return undefined;
}
