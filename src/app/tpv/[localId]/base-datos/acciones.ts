"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { tagLocal, tagProductos } from "@/lib/cache-datos";
import { buscarTabla } from "./tablas";
import type { CampoTabla, FilaTabla, ResultadoMutacion } from "./tipos";

function validarRequeridos(campos: CampoTabla[], datos: FilaTabla): string | null {
  for (const campo of campos) {
    if (campo.soloLectura || !campo.requerido) continue;
    const v = datos[campo.clave];
    if (v === undefined || v === null || v === "") {
      return `El campo "${campo.etiqueta}" es obligatorio.`;
    }
  }
  return null;
}

// Slugs cuyos datos también viven cacheados fuera de Base de datos (ver
// cache-datos.ts) — un cambio ahí tiene que invalidar también esa caché,
// o el TPV seguiría sirviendo la carta o el tema viejos.
const ETIQUETAS_CACHE: Record<string, (localId: string) => string> = {
  productos: tagProductos,
  "categorias-carta": tagProductos,
  local: tagLocal,
};

function revalidar(localId: string, slug: string) {
  revalidatePath(`/tpv/${localId}/base-datos/${slug}`);
  revalidatePath(`/tpv/${localId}/base-datos`);
  const etiqueta = ETIQUETAS_CACHE[slug];
  if (etiqueta) updateTag(etiqueta(localId));
}

export async function crearFilaAction(
  localId: string,
  slug: string,
  datos: FilaTabla,
): Promise<ResultadoMutacion> {
  await requireLocalAccess(localId);
  const tabla = buscarTabla(slug);
  if (!tabla?.crear) return { error: "Esta tabla no admite añadir filas nuevas." };

  const errorValidacion = validarRequeridos(tabla.campos, datos);
  if (errorValidacion) return { error: errorValidacion };

  const resultado = await tabla.crear(localId, datos);
  if (!resultado.error) revalidar(localId, slug);
  return resultado;
}

export async function actualizarFilaAction(
  localId: string,
  slug: string,
  id: string,
  datos: FilaTabla,
): Promise<ResultadoMutacion> {
  await requireLocalAccess(localId);
  const tabla = buscarTabla(slug);
  if (!tabla?.actualizar) return { error: "Esta tabla no admite editar filas." };

  const resultado = await tabla.actualizar(localId, id, datos);
  if (!resultado.error) revalidar(localId, slug);
  return resultado;
}

export async function borrarFilaAction(
  localId: string,
  slug: string,
  id: string,
): Promise<ResultadoMutacion> {
  await requireLocalAccess(localId);
  const tabla = buscarTabla(slug);
  if (!tabla?.borrar) return { error: "Esta tabla no admite borrar filas." };

  const resultado = await tabla.borrar(localId, id);
  if (!resultado.error) revalidar(localId, slug);
  return resultado;
}

export type ResultadoReinicio = { error?: string; resumen?: string };

// Borra SOLO el historial de actividad de este local — todo lo que es un
// registro de algo que pasó (comandas, tickets, cierres, pedidos,
// recepciones, reposiciones, movimientos de stock, turnos, nóminas). Nunca
// toca la carta, el inventario (stock actual), zonas/mesas, proveedores,
// empleados ni usuarios — eso es catálogo/configuración, no historial.
// Pensado para volver a dejar un local de pruebas a cero.
export async function reiniciarHistorialesAction(localId: string): Promise<ResultadoReinicio> {
  const { membresia } = await requireLocalAccess(localId);
  if (membresia.rol !== "ADMIN") {
    return { error: "Solo un administrador de este local puede reiniciar el historial." };
  }

  const conteos = await prisma.$transaction(async (tx) => {
    // Orden de borrado: primero lo que cuelga de otra cosa por FK, luego el
    // padre — igual que exige la propia base de datos.
    const lineasComanda = await tx.lineaComanda.deleteMany({ where: { comanda: { mesa: { localId } } } });
    const tickets = await tx.ticket.deleteMany({ where: { comanda: { mesa: { localId } } } });
    const comandas = await tx.comanda.deleteMany({ where: { mesa: { localId } } });
    const cierresCaja = await tx.cierreCaja.deleteMany({ where: { localId } });
    const reservas = await tx.reserva.deleteMany({ where: { localId } });
    const movimientosStock = await tx.movimientoStock.deleteMany({ where: { ingrediente: { localId } } });
    const recepcionLineas = await tx.recepcionLinea.deleteMany({
      where: { recepcion: { pedido: { proveedor: { localId } } } },
    });
    const recepciones = await tx.recepcion.deleteMany({ where: { pedido: { proveedor: { localId } } } });
    const pedidoLineas = await tx.pedidoProveedorLinea.deleteMany({ where: { pedido: { proveedor: { localId } } } });
    const pedidos = await tx.pedidoProveedor.deleteMany({ where: { proveedor: { localId } } });
    const reposicionLineas = await tx.reposicionLinea.deleteMany({ where: { reposicion: { localId } } });
    const reposiciones = await tx.reposicion.deleteMany({ where: { localId } });
    const turnos = await tx.turno.deleteMany({ where: { empleado: { localId } } });
    const nominas = await tx.nomina.deleteMany({ where: { empleado: { localId } } });

    return {
      comandas: comandas.count,
      lineasComanda: lineasComanda.count,
      tickets: tickets.count,
      cierresCaja: cierresCaja.count,
      reservas: reservas.count,
      movimientosStock: movimientosStock.count,
      pedidos: pedidos.count,
      pedidoLineas: pedidoLineas.count,
      recepciones: recepciones.count,
      recepcionLineas: recepcionLineas.count,
      reposiciones: reposiciones.count,
      reposicionLineas: reposicionLineas.count,
      turnos: turnos.count,
      nominas: nominas.count,
    };
  });

  // "layout" en vez de una ruta suelta: el historial aparece en medio
  // local — plano, caja, ventas, inventario... — así se invalida todo el
  // segmento de una vez en lugar de listar cada ruta a mano.
  revalidatePath(`/tpv/${localId}`, "layout");

  const total = Object.values(conteos).reduce((acc, n) => acc + n, 0);
  if (total === 0) {
    return { resumen: "No había ningún historial que borrar — ya estaba a cero." };
  }

  return {
    resumen:
      `Borrado: ${conteos.comandas} comandas, ${conteos.tickets} tickets, ${conteos.cierresCaja} cierres de caja, ` +
      `${conteos.reservas} reservas, ${conteos.pedidos} pedidos a proveedor, ${conteos.recepciones} recepciones, ` +
      `${conteos.reposiciones} reposiciones, ${conteos.movimientosStock} movimientos de stock, ${conteos.turnos} turnos ` +
      `y ${conteos.nominas} nóminas.`,
  };
}
