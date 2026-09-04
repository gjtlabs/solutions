"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

const METODOS_PAGO = ["EFECTIVO", "TARJETA", "OTRO"] as const;
type MetodoPago = (typeof METODOS_PAGO)[number];

export type ActualizarTicketResult = { error?: string } | undefined;

// Corrige un ticket ya cobrado — por ejemplo se marcó "tarjeta" por error
// cuando pagaron en efectivo. Si el ticket ya pertenece a un cierre de caja,
// recalcula el esperado/diferencia de ese cierre para que siga cuadrando
// con la realidad en vez de quedar desincronizado en silencio.
export async function actualizarTicket(
  localId: string,
  ticketId: string,
  total: number,
  metodoPago: string,
): Promise<ActualizarTicketResult> {
  await requireLocalAccess(localId);

  if (!Number.isFinite(total) || total < 0) {
    return { error: "El total tiene que ser un número mayor o igual que 0." };
  }
  if (!METODOS_PAGO.includes(metodoPago as MetodoPago)) {
    return { error: "Método de pago no válido." };
  }

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: { id: ticketId, comanda: { mesa: { localId } } },
      select: { id: true, cierreCajaId: true },
    });
    if (!ticket) return;

    await tx.ticket.update({
      where: { id: ticket.id },
      data: { total, metodoPago: metodoPago as MetodoPago },
    });

    if (ticket.cierreCajaId) {
      const cierre = await tx.cierreCaja.findUnique({
        where: { id: ticket.cierreCajaId },
        include: { tickets: { select: { total: true, metodoPago: true } } },
      });
      if (cierre) {
        const totalEsperado = cierre.tickets
          .filter((t) => t.metodoPago === "EFECTIVO")
          .reduce((acc, t) => acc + Number(t.total), 0);
        const diferencia = Number(cierre.totalContado) - totalEsperado;
        await tx.cierreCaja.update({
          where: { id: cierre.id },
          data: { totalEsperado, diferencia },
        });
      }
    }
  });

  revalidatePath(`/tpv/${localId}/ventas`);
  revalidatePath(`/tpv/${localId}/caja`);
  return undefined;
}
