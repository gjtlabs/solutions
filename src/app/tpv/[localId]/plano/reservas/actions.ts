"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type ReservaFormState = { error?: string } | undefined;

export async function crearReserva(
  localId: string,
  _prevState: ReservaFormState,
  formData: FormData,
): Promise<ReservaFormState> {
  await requireLocalAccess(localId);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const personas = Number(formData.get("personas"));
  const horaRaw = String(formData.get("hora") ?? "");
  const mesaId = String(formData.get("mesaId") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }
  if (!Number.isFinite(personas) || personas < 1) {
    return { error: "Los comensales tienen que ser un número mayor que 0." };
  }
  const hora = horaRaw ? new Date(horaRaw) : null;
  if (!hora || Number.isNaN(hora.getTime())) {
    return { error: "Elige una fecha y hora." };
  }

  await prisma.reserva.create({
    data: { localId, nombre, telefono, personas, hora, mesaId, notas },
  });

  revalidatePath(`/tpv/${localId}/plano`);
  return undefined;
}

export async function borrarReserva(localId: string, reservaId: string) {
  await requireLocalAccess(localId);
  // deleteMany, no delete: el id por sí solo es único en la tabla, pero
  // filtrar también por localId evita borrar una reserva de otro local.
  await prisma.reserva.deleteMany({ where: { id: reservaId, localId } });
  revalidatePath(`/tpv/${localId}/plano`);
}

export async function actualizarReserva(
  localId: string,
  reservaId: string,
  nombre: string,
  telefono: string,
  personas: number,
  horaRaw: string,
  mesaId: string,
  notas: string,
): Promise<ReservaFormState> {
  await requireLocalAccess(localId);

  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) {
    return { error: "El nombre es obligatorio." };
  }
  if (!Number.isFinite(personas) || personas < 1) {
    return { error: "Los comensales tienen que ser un número mayor que 0." };
  }
  const hora = horaRaw ? new Date(horaRaw) : null;
  if (!hora || Number.isNaN(hora.getTime())) {
    return { error: "Elige una fecha y hora." };
  }

  await prisma.reserva.updateMany({
    where: { id: reservaId, localId },
    data: {
      nombre: nombreLimpio,
      telefono: telefono.trim() || null,
      personas: Math.round(personas),
      hora,
      mesaId: mesaId || null,
      notas: notas.trim() || null,
    },
  });

  revalidatePath(`/tpv/${localId}/plano`);
  return undefined;
}
