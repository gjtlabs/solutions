"use server";

import { revalidatePath } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { descontarStockVenta, generarReposicionSiProcede } from "@/lib/inventario";

async function comandaAbierta(mesaId: string) {
  return prisma.comanda.findFirst({
    where: { mesaId, estado: { in: ["ABIERTA", "ENVIADA"] } },
    select: { id: true },
  });
}

// Solo abrirMesa necesita buscar la comanda por mesa — todavía no existe,
// así que no hay id que pasar de la pantalla. El resto de acciones reciben
// el id de la comanda directamente (la pantalla ya lo tiene al renderizar),
// para no repetir esa misma búsqueda en cada click: menos ida y vuelta a
// la base de datos, más ágil tomar nota en el TPV.
export async function abrirMesa(localId: string, mesaId: string) {
  const { session } = await requireLocalAccess(localId);
  const existente = await comandaAbierta(mesaId);
  if (!existente) {
    await prisma.comanda.create({
      data: { mesaId, camareroId: session.user.id },
    });
  }
  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  revalidatePath(`/tpv/${localId}/plano`);
}

export type LineaFormState = { error?: string } | undefined;

// Ya no exige una comanda abierta de antemano: el selector de productos se
// ve y se usa desde el primer momento, mesa libre o no, así que añadir la
// primera línea es lo que abre la mesa si todavía no lo estaba (mismo
// efecto que el botón "Abrir mesa", solo que implícito).
export async function addLinea(
  localId: string,
  mesaId: string,
  _prevState: LineaFormState,
  formData: FormData,
): Promise<LineaFormState> {
  const { session } = await requireLocalAccess(localId);

  const productoId = String(formData.get("productoId") ?? "");
  const cantidad = Number(formData.get("cantidad"));
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!productoId) {
    return { error: "Elige un producto." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { error: "La cantidad tiene que ser un número mayor que 0." };
  }

  try {
    const comanda =
      (await comandaAbierta(mesaId)) ??
      (await prisma.comanda.create({
        data: { mesaId, camareroId: session.user.id },
        select: { id: true },
      }));

    // Comprobar que la comanda sigue abierta y pertenece a este local, y
    // añadir la línea: una sola consulta en vez de dos.
    await prisma.comanda.update({
      where: { id: comanda.id, estado: { in: ["ABIERTA", "ENVIADA"] }, mesa: { localId } },
      data: { lineas: { create: { productoId, cantidad, notas } } },
    });
  } catch {
    return { error: "No se pudo añadir la línea." };
  }

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  revalidatePath(`/tpv/${localId}/plano`);
  return undefined;
}

export async function enviarACocina(localId: string, mesaId: string, comandaId: string) {
  await requireLocalAccess(localId);

  await prisma.$transaction([
    prisma.lineaComanda.updateMany({
      where: { comandaId, estado: "PENDIENTE", comanda: { mesa: { localId } } },
      data: { estado: "COCINA", horaEnviada: new Date() },
    }),
    prisma.comanda.update({
      where: { id: comandaId, mesa: { localId } },
      data: { estado: "ENVIADA" },
    }),
  ]);

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
}

export async function marcarServido(localId: string, mesaId: string, lineaId: string) {
  await requireLocalAccess(localId);
  await prisma.lineaComanda.update({
    where: { id: lineaId, comanda: { mesa: { localId } } },
    data: { estado: "SERVIDO" },
  });
  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
}

export type ActualizarLineaResult = { error?: string } | undefined;

export async function actualizarLinea(
  localId: string,
  mesaId: string,
  lineaId: string,
  cantidad: number,
  notas: string,
): Promise<ActualizarLineaResult> {
  await requireLocalAccess(localId);

  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { error: "La cantidad tiene que ser un número mayor que 0." };
  }

  // Solo se puede tocar una línea mientras la comanda sigue abierta — una
  // vez cobrada, el ticket ya es un registro histórico de la venta.
  await prisma.lineaComanda.updateMany({
    where: { id: lineaId, comanda: { mesa: { localId }, estado: { in: ["ABIERTA", "ENVIADA"] } } },
    data: { cantidad: Math.round(cantidad), notas: notas.trim() || null },
  });

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  return undefined;
}

export async function borrarLinea(localId: string, mesaId: string, lineaId: string) {
  await requireLocalAccess(localId);
  await prisma.lineaComanda.deleteMany({
    where: { id: lineaId, comanda: { mesa: { localId }, estado: { in: ["ABIERTA", "ENVIADA"] } } },
  });
  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
}

export type CobroFormState = { error?: string } | undefined;

export async function cobrar(
  localId: string,
  mesaId: string,
  comandaId: string,
  _prevState: CobroFormState,
  formData: FormData,
): Promise<CobroFormState> {
  await requireLocalAccess(localId);

  const lineas = await prisma.lineaComanda.findMany({
    where: { comandaId, comanda: { mesa: { localId } } },
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

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticket.create({ data: { comandaId, total, metodoPago } });
      await tx.comanda.update({
        where: { id: comandaId, estado: { in: ["ABIERTA", "ENVIADA"] }, mesa: { localId } },
        data: { estado: "COBRADA", horaCierre: new Date() },
      });
      await descontarStockVenta(tx, comandaId);
    });
  } catch {
    return { error: "No se pudo cobrar la comanda." };
  }

  // Fuera de la transacción del cobro a propósito: si ya no queda ninguna
  // mesa abierta en el local, esta era la última de la jornada — genera la
  // reposición. No hace falta que sea atómico con el cobro en sí.
  await generarReposicionSiProcede(localId);

  revalidatePath(`/tpv/${localId}/mesa/${mesaId}`);
  revalidatePath(`/tpv/${localId}/plano`);
  return undefined;
}
