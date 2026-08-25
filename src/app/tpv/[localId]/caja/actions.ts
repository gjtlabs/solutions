"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type CierreFormState = { error?: string } | undefined;

// Cierra el periodo abierto: todos los tickets sin cierreCajaId asignado
// (de cualquier método de pago) pasan a este cierre, pero solo el efectivo
// cuenta para "lo esperado" — es lo único que de verdad hay que contar en
// el cajón. Tarjeta y otros métodos no dejan efectivo físico que arquear.
export async function cerrarCaja(
  localId: string,
  _prevState: CierreFormState,
  formData: FormData,
): Promise<CierreFormState> {
  await requireLocalAccess(localId);

  const totalContado = Number(formData.get("totalContado"));
  if (!Number.isFinite(totalContado) || totalContado < 0) {
    return { error: "Introduce el efectivo contado — un número mayor o igual que 0." };
  }

  const ticketsPendientes = await prisma.ticket.findMany({
    where: { cierreCajaId: null, comanda: { mesa: { localId } } },
    select: { id: true, total: true, metodoPago: true },
  });

  if (ticketsPendientes.length === 0) {
    return { error: "No hay ningún ticket pendiente de cierre." };
  }

  const totalEsperado = ticketsPendientes
    .filter((t) => t.metodoPago === "EFECTIVO")
    .reduce((acc, t) => acc + Number(t.total), 0);
  const diferencia = totalContado - totalEsperado;

  await prisma.$transaction(async (tx) => {
    const cierre = await tx.cierreCaja.create({
      data: { localId, totalEsperado, totalContado, diferencia },
    });
    await tx.ticket.updateMany({
      where: { id: { in: ticketsPendientes.map((t) => t.id) } },
      data: { cierreCajaId: cierre.id },
    });
  });

  revalidatePath(`/tpv/${localId}/caja`);
  return undefined;
}
