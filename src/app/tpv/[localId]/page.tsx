import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PlanoEditable, type ZonaPlano, type ElementoPlanoData } from "./plano-editable";
import { RelojDigital } from "./reloj";
import { EstadoMesasPanel, AlertasPanel, type MesaEstado } from "./estado-servicio";
import { ReservasPanel, type ReservaData, type MesaOpcion } from "./reservas/reservas-panel";

// Fuera del componente a propósito: leer la hora actual es una operación
// impura que la regla de pureza de React no deja hacer dentro del cuerpo
// de un componente, aunque sea un Server Component.
function reservasDesde() {
  return new Date(Date.now() - 2 * 60 * 60 * 1000);
}

export default async function TpvPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const { membresia } = await requireLocalAccess(localId);

  const [zonasRaw, elementosRaw, local, comandasAbiertas, reservasRaw] = await Promise.all([
    prisma.zona.findMany({
      where: { localId },
      orderBy: { orden: "asc" },
      include: {
        mesas: {
          orderBy: { numero: "asc" },
          include: {
            comandas: {
              where: { estado: { in: ["ABIERTA", "ENVIADA"] } },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.elementoPlano.findMany({ where: { localId }, orderBy: { id: "asc" } }),
    prisma.local.findUnique({ where: { id: localId }, select: { planoAlto: true } }),
    prisma.comanda.findMany({
      where: { estado: { in: ["ABIERTA", "ENVIADA"] }, mesa: { localId } },
      include: {
        mesa: { include: { zona: true } },
        lineas: { include: { producto: true } },
      },
    }),
    prisma.reserva.findMany({
      where: { localId, hora: { gte: reservasDesde() } },
      orderBy: { hora: "asc" },
      include: { mesa: { select: { numero: true } } },
      take: 30,
    }),
  ]);

  const elementos: ElementoPlanoData[] = elementosRaw.map((el) => ({
    id: el.id,
    tipo: el.tipo,
    posicionX: el.posicionX,
    posicionY: el.posicionY,
    ancho: el.ancho,
    alto: el.alto,
    rotacion: el.rotacion,
  }));

  const zonas: ZonaPlano[] = zonasRaw.map((zona) => ({
    id: zona.id,
    nombre: zona.nombre,
    puntos: zona.puntos as unknown as ZonaPlano["puntos"],
    color: zona.color,
    mesas: zona.mesas.map((mesa) => ({
      id: mesa.id,
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      posicionX: mesa.posicionX,
      posicionY: mesa.posicionY,
      forma: mesa.forma,
      ancho: mesa.ancho,
      alto: mesa.alto,
      ocupada: mesa.comandas.length > 0,
    })),
  }));

  const hayMesas = zonas.some((z) => z.mesas.length > 0);

  const mesasEstado: MesaEstado[] = comandasAbiertas.map((comanda) => ({
    mesaId: comanda.mesa.id,
    numero: comanda.mesa.numero,
    zonaNombre: comanda.mesa.zona.nombre,
    horaApertura: comanda.horaApertura.toISOString(),
    lineas: comanda.lineas.map((linea) => ({
      id: linea.id,
      nombre: linea.producto.nombre,
      tipo: linea.producto.tipo,
      estado: linea.estado,
      horaEnviada: linea.horaEnviada ? linea.horaEnviada.toISOString() : null,
    })),
  }));

  const mesaOpciones: MesaOpcion[] = zonas.flatMap((zona) =>
    zona.mesas.map((mesa) => ({ id: mesa.id, numero: mesa.numero, zonaNombre: zona.nombre })),
  );

  const reservas: ReservaData[] = reservasRaw.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    telefono: r.telefono,
    personas: r.personas,
    hora: r.hora.toISOString(),
    notas: r.notas,
    mesaNumero: r.mesa?.numero ?? null,
  }));

  return (
    <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {membresia.localNombre}
          </h1>
          <p className="text-text-muted">Plano de sala</p>
        </div>
        <RelojDigital />
        <div className="flex gap-2">
          <Link href={`/tpv/${localId}/productos`}>
            <Button variant="secondary">Productos</Button>
          </Link>
          <Link href={`/tpv/${localId}/mesas`}>
            <Button variant="secondary">Gestionar mesas</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Volver</Button>
          </Link>
        </div>
      </div>

      {zonas.length === 0 ? (
        <p className="text-text-muted">
          Todavía no hay zonas.{" "}
          <Link href={`/tpv/${localId}/mesas`} className="text-brand underline">
            Crea la primera
          </Link>
          .
        </p>
      ) : !hayMesas ? (
        <p className="text-text-muted">
          Todavía no hay mesas.{" "}
          <Link href={`/tpv/${localId}/mesas`} className="text-brand underline">
            Añade la primera
          </Link>
          .
        </p>
      ) : null}

      {zonas.length > 0 && (
        <PlanoEditable
          localId={localId}
          zonas={zonas}
          elementos={elementos}
          planoAlto={local?.planoAlto ?? 560}
        />
      )}

      <ReservasPanel localId={localId} reservas={reservas} mesas={mesaOpciones} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <EstadoMesasPanel mesas={mesasEstado} />
        <AlertasPanel mesas={mesasEstado} />
      </div>
    </main>
  );
}
