"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

export type MesaFormState = { error?: string } | undefined;

export async function crearMesa(
  localId: string,
  _prevState: MesaFormState,
  formData: FormData,
): Promise<MesaFormState> {
  await requireLocalAccess(localId);

  const zona = String(formData.get("zona") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const capacidad = Number(formData.get("capacidad"));

  if (!zona || !numero) {
    return { error: "Zona y número son obligatorios." };
  }
  if (!Number.isFinite(capacidad) || capacidad < 1) {
    return { error: "La capacidad tiene que ser un número mayor que 0." };
  }

  // Coloca la mesa nueva en cascada dentro de su zona para que no se
  // amontonen todas en el centro — el usuario las reordena arrastrando
  // en el plano.
  const enZona = await prisma.mesa.count({ where: { localId, zona } });
  const posicionX = 15 + (enZona % 5) * 18;
  const posicionY = 15 + Math.floor(enZona / 5) * 25;

  try {
    await prisma.mesa.create({
      data: { localId, zona, numero, capacidad, posicionX, posicionY },
    });
  } catch {
    return { error: `Ya existe una mesa "${numero}" en la zona "${zona}".` };
  }

  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
  return undefined;
}

export async function borrarMesa(localId: string, mesaId: string) {
  await requireLocalAccess(localId);
  await prisma.mesa.delete({ where: { id: mesaId } });
  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

export async function moverMesa(
  localId: string,
  mesaId: string,
  posicionX: number,
  posicionY: number,
) {
  await requireLocalAccess(localId);
  const x = Math.min(97, Math.max(3, posicionX));
  const y = Math.min(95, Math.max(5, posicionY));
  await prisma.mesa.update({
    where: { id: mesaId },
    data: { posicionX: x, posicionY: y },
  });
  revalidatePath(`/tpv/${localId}`);
}

export async function actualizarEstiloMesa(
  localId: string,
  mesaId: string,
  forma: "REDONDA" | "RECTANGULAR",
  ancho: number,
  alto: number,
) {
  await requireLocalAccess(localId);
  await prisma.mesa.update({
    where: { id: mesaId },
    data: {
      forma,
      ancho: Math.min(200, Math.max(50, Math.round(ancho))),
      alto: Math.min(200, Math.max(50, Math.round(alto))),
    },
  });
  revalidatePath(`/tpv/${localId}`);
}
