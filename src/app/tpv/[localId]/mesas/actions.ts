"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Zonas
// ---------------------------------------------------------------------------

export type ZonaFormState = { error?: string } | undefined;

export async function crearZona(
  localId: string,
  _prevState: ZonaFormState,
  formData: FormData,
): Promise<ZonaFormState> {
  await requireLocalAccess(localId);

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) {
    return { error: "El nombre es obligatorio." };
  }

  const orden = await prisma.zona.count({ where: { localId } });
  // Cascada para que las zonas nuevas no se amontonen todas en el centro
  // del plano — se reordenan arrastrando, igual que las mesas.
  const posicionX = 20 + (orden % 3) * 30;
  const posicionY = 20 + Math.floor(orden / 3) * 35;

  try {
    await prisma.zona.create({ data: { localId, nombre, orden, posicionX, posicionY } });
  } catch {
    return { error: `Ya existe una zona "${nombre}".` };
  }

  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
  return undefined;
}

export async function renombrarZona(localId: string, zonaId: string, nombre: string) {
  await requireLocalAccess(localId);
  const limpio = nombre.trim();
  if (!limpio) return;
  await prisma.zona.update({ where: { id: zonaId }, data: { nombre: limpio } });
  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

export async function borrarZona(localId: string, zonaId: string) {
  await requireLocalAccess(localId);
  const mesas = await prisma.mesa.count({ where: { zonaId } });
  if (mesas > 0) return; // la UI ya oculta el botón en este caso — defensa extra
  await prisma.zona.delete({ where: { id: zonaId } });
  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

export async function reordenarZona(
  localId: string,
  zonaId: string,
  direccion: "arriba" | "abajo",
) {
  await requireLocalAccess(localId);

  const zonas = await prisma.zona.findMany({
    where: { localId },
    orderBy: { orden: "asc" },
  });
  const i = zonas.findIndex((z) => z.id === zonaId);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= zonas.length) return;

  await prisma.$transaction([
    prisma.zona.update({ where: { id: zonas[i].id }, data: { orden: zonas[j].orden } }),
    prisma.zona.update({ where: { id: zonas[j].id }, data: { orden: zonas[i].orden } }),
  ]);

  revalidatePath(`/tpv/${localId}/mesas`);
  revalidatePath(`/tpv/${localId}`);
}

export async function moverZona(
  localId: string,
  zonaId: string,
  posicionX: number,
  posicionY: number,
) {
  await requireLocalAccess(localId);
  const x = Math.min(98, Math.max(2, posicionX));
  const y = Math.min(96, Math.max(2, posicionY));
  await prisma.zona.update({ where: { id: zonaId }, data: { posicionX: x, posicionY: y } });
  revalidatePath(`/tpv/${localId}`);
}

export async function actualizarTamanoZona(
  localId: string,
  zonaId: string,
  ancho: number,
  alto: number,
) {
  await requireLocalAccess(localId);
  await prisma.zona.update({
    where: { id: zonaId },
    data: {
      ancho: Math.min(900, Math.max(140, Math.round(ancho))),
      alto: Math.min(700, Math.max(120, Math.round(alto))),
    },
  });
  revalidatePath(`/tpv/${localId}`);
}

// ---------------------------------------------------------------------------
// Mesas
// ---------------------------------------------------------------------------

export type MesaFormState = { error?: string } | undefined;

export async function crearMesa(
  localId: string,
  _prevState: MesaFormState,
  formData: FormData,
): Promise<MesaFormState> {
  await requireLocalAccess(localId);

  const zonaId = String(formData.get("zonaId") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const capacidad = Number(formData.get("capacidad"));

  if (!zonaId || !numero) {
    return { error: "Zona y número son obligatorios." };
  }
  if (!Number.isFinite(capacidad) || capacidad < 1) {
    return { error: "La capacidad tiene que ser un número mayor que 0." };
  }

  // Coloca la mesa nueva en cascada dentro de su zona para que no se
  // amontonen todas en el centro — el usuario las reordena arrastrando
  // en el plano.
  const enZona = await prisma.mesa.count({ where: { zonaId } });
  const posicionX = 15 + (enZona % 5) * 18;
  const posicionY = 15 + Math.floor(enZona / 5) * 25;

  try {
    await prisma.mesa.create({
      data: { localId, zonaId, numero, capacidad, posicionX, posicionY },
    });
  } catch {
    return { error: `Ya existe una mesa "${numero}" en esa zona.` };
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

// ---------------------------------------------------------------------------
// Elementos del plano (puertas, escaleras, paredes)
// ---------------------------------------------------------------------------

const TAMANO_POR_TIPO: Record<"PUERTA" | "ESCALERA" | "PARED", { ancho: number; alto: number }> = {
  PUERTA: { ancho: 50, alto: 50 },
  ESCALERA: { ancho: 60, alto: 110 },
  PARED: { ancho: 140, alto: 12 },
};

export async function crearElemento(
  localId: string,
  tipo: "PUERTA" | "ESCALERA" | "PARED",
) {
  await requireLocalAccess(localId);
  // Cascada sobre TODOS los elementos del local, no solo los de este tipo —
  // si no, una puerta y una escalera recién creadas (cada una la "primera"
  // de su tipo) caerían exactamente en el mismo sitio.
  const enLocal = await prisma.elementoPlano.count({ where: { localId } });
  const posicionX = 25 + (enLocal % 3) * 25;
  const posicionY = 15 + Math.floor(enLocal / 3) * 15;
  const { ancho, alto } = TAMANO_POR_TIPO[tipo];

  await prisma.elementoPlano.create({
    data: { localId, tipo, ancho, alto, posicionX, posicionY },
  });
  revalidatePath(`/tpv/${localId}`);
}

export async function borrarElemento(localId: string, elementoId: string) {
  await requireLocalAccess(localId);
  await prisma.elementoPlano.delete({ where: { id: elementoId } });
  revalidatePath(`/tpv/${localId}`);
}

export async function moverElemento(
  localId: string,
  elementoId: string,
  posicionX: number,
  posicionY: number,
) {
  await requireLocalAccess(localId);
  const x = Math.min(98, Math.max(2, posicionX));
  const y = Math.min(98, Math.max(2, posicionY));
  await prisma.elementoPlano.update({
    where: { id: elementoId },
    data: { posicionX: x, posicionY: y },
  });
  revalidatePath(`/tpv/${localId}`);
}

export async function actualizarElemento(
  localId: string,
  elementoId: string,
  ancho: number,
  alto: number,
  rotacion: number,
) {
  await requireLocalAccess(localId);
  await prisma.elementoPlano.update({
    where: { id: elementoId },
    data: {
      ancho: Math.min(300, Math.max(10, Math.round(ancho))),
      alto: Math.min(300, Math.max(10, Math.round(alto))),
      rotacion: ((Math.round(rotacion) % 360) + 360) % 360,
    },
  });
  revalidatePath(`/tpv/${localId}`);
}
