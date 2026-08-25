import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PlanoEditable, type ZonaPlano, type ElementoPlanoData } from "./plano-editable";
import { RelojDigital } from "./reloj";
import { EstadoMesasPanel, PorServirPanel, type MesaEstado } from "./estado-servicio";
import { ReservasPanel, type ReservaData, type MesaOpcion } from "./reservas/reservas-panel";

// Fuera del componente a propósito: leer la hora actual es una operación
// impura que la regla de pureza de React no deja hacer dentro del cuerpo
// de un componente, aunque sea un Server Component.
function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDeHoy() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function ahora() {
  return new Date();
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
    prisma.local.findUnique({ where: { id: localId }, select: { planoFormato: true } }),
    prisma.comanda.findMany({
      where: { estado: { in: ["ABIERTA", "ENVIADA"] }, mesa: { localId } },
      include: {
        mesa: { include: { zona: true } },
        lineas: { include: { producto: true } },
      },
    }),
    prisma.reserva.findMany({
      where: { localId, hora: { gte: inicioDeHoy(), lte: finDeHoy() } },
      orderBy: { hora: "asc" },
      include: { mesa: { select: { id: true, numero: true } } },
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

  // Solo cuenta como aviso en la mesa la próxima reserva de hoy que todavía
  // no ha pasado — es un aviso, no bloquea usar la mesa antes en otro turno.
  const ahoraTs = ahora();
  const reservaPorMesaId = new Map<string, Date>();
  for (const r of reservasRaw) {
    if (!r.mesa || r.hora.getTime() < ahoraTs.getTime()) continue;
    const actual = reservaPorMesaId.get(r.mesa.id);
    if (!actual || r.hora.getTime() < actual.getTime()) {
      reservaPorMesaId.set(r.mesa.id, r.hora);
    }
  }

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
      proximaReserva: reservaPorMesaId.get(mesa.id)?.toISOString() ?? null,
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
    <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {membresia.localNombre}
          </h1>
          <p className="text-text-muted">Plano de sala</p>
        </div>
        <RelojDigital />
        <div className="flex gap-2">
          <Link href={`/tpv/${localId}/ventas`}>
            <Button variant="secondary">Ventas</Button>
          </Link>
          <Link href={`/tpv/${localId}/caja`}>
            <Button variant="secondary">Caja</Button>
          </Link>
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
          planoFormato={local?.planoFormato ?? "PANORAMICO_16_9"}
        />
      )}

      {/*
        min-w-0 en cada columna: sin él, una tabla o un formulario ancho
        empuja la columna de la grid más allá de su hueco en vez de meter
        scroll horizontal dentro de la tarjeta — el "blowout" clásico de
        CSS grid con contenido que no se envuelve solo.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="min-w-0">
          <ReservasPanel localId={localId} reservas={reservas} mesas={mesaOpciones} />
        </div>
        <div className="min-w-0">
          <EstadoMesasPanel mesas={mesasEstado} />
        </div>
        <div className="min-w-0">
          <PorServirPanel mesas={mesasEstado} />
        </div>
      </div>
    </main>
  );
}
