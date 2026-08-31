import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Descuenta de stockBarra el ingrediente de cada línea vendida, según su
// escandallo (RecetaLinea) — se llama dentro de la misma transacción que
// cobra el ticket. Un producto sin receta definida no mueve inventario.
export async function descontarStockVenta(tx: Prisma.TransactionClient, comandaId: string) {
  const lineas = await tx.lineaComanda.findMany({
    where: { comandaId },
    include: { producto: { include: { receta: true } } },
  });

  const consumo = new Map<string, number>();
  for (const linea of lineas) {
    for (const receta of linea.producto.receta) {
      const cantidad = Number(receta.cantidad) * linea.cantidad;
      consumo.set(receta.ingredienteId, (consumo.get(receta.ingredienteId) ?? 0) + cantidad);
    }
  }

  for (const [ingredienteId, cantidad] of consumo) {
    if (cantidad <= 0) continue;
    await tx.ingrediente.update({
      where: { id: ingredienteId },
      data: { stockBarra: { decrement: cantidad } },
    });
    await tx.movimientoStock.create({
      data: { ingredienteId, tipo: "SALIDA", cantidad, referencia: `comanda:${comandaId}` },
    });
  }
}

// Qué referencias han caído por debajo de su mínimo en barra y cuánto
// llevar de almacén para rellenar hasta el máximo (nunca más de lo que
// haya en almacén). No crea una reposición nueva si ya hay una pendiente
// (p. ej. si la de ayer no se completó) — o si no hace falta reponer nada.
async function crearReposicionSiHaceFalta(localId: string) {
  const yaHayPendiente = await prisma.reposicion.findFirst({
    where: { localId, estado: "PENDIENTE" },
    select: { id: true },
  });
  if (yaHayPendiente) return;

  const ingredientes = await prisma.ingrediente.findMany({ where: { localId } });
  const lineas = ingredientes.flatMap((i) => {
    const stockBarra = Number(i.stockBarra);
    const stockMinimoBarra = Number(i.stockMinimoBarra);
    if (stockBarra >= stockMinimoBarra) return [];
    const objetivo = Number(i.stockMaximoBarra) - stockBarra;
    const cantidadSugerida = Math.min(objetivo, Number(i.stockAlmacen));
    return cantidadSugerida > 0 ? [{ ingredienteId: i.id, cantidadSugerida }] : [];
  });

  if (lineas.length === 0) return;

  await prisma.reposicion.create({ data: { localId, lineas: { create: lineas } } });
}

// Al cerrar la última mesa de la jornada (ninguna comanda abierta/enviada
// que quede en el local), genera la reposición automáticamente.
export async function generarReposicionSiProcede(localId: string) {
  const abiertas = await prisma.comanda.count({
    where: { estado: { in: ["ABIERTA", "ENVIADA"] }, mesa: { localId } },
  });
  if (abiertas > 0) return;

  await crearReposicionSiHaceFalta(localId);
}

// Botón "Generar ahora" de la pantalla de reposición — igual que la
// automática, pero sin esperar a que se vaya la última mesa (útil para
// adelantarla, o para pruebas).
export async function generarReposicionManual(localId: string) {
  await crearReposicionSiHaceFalta(localId);
}

// El camarero confirma una línea de la reposición: se traspasa de verdad
// el stock (almacén -> barra) y, si era la última línea pendiente, se da
// la reposición entera por completada.
export async function confirmarLineaReposicion(
  localId: string,
  lineaId: string,
  cantidadLlevada: number,
) {
  const linea = await prisma.reposicionLinea.findFirst({
    where: { id: lineaId, reposicion: { localId } },
    include: { ingrediente: true },
  });
  if (!linea || linea.completada) return;

  const cantidad = Math.max(0, Math.min(cantidadLlevada, Number(linea.ingrediente.stockAlmacen)));

  await prisma.$transaction([
    prisma.ingrediente.update({
      where: { id: linea.ingredienteId },
      data: { stockAlmacen: { decrement: cantidad }, stockBarra: { increment: cantidad } },
    }),
    prisma.movimientoStock.create({
      data: {
        ingredienteId: linea.ingredienteId,
        tipo: "TRASPASO",
        cantidad,
        referencia: `reposicion:${linea.reposicionId}`,
      },
    }),
    prisma.reposicionLinea.update({
      where: { id: lineaId },
      data: { cantidadLlevada: cantidad, completada: true },
    }),
  ]);

  const pendientes = await prisma.reposicionLinea.count({
    where: { reposicionId: linea.reposicionId, completada: false },
  });
  if (pendientes === 0) {
    await prisma.reposicion.update({
      where: { id: linea.reposicionId },
      data: { estado: "COMPLETADA" },
    });
  }
}
