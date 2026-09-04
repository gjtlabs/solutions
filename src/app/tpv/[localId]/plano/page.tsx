import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { VolverAtrasButton } from "@/components/volver-atras-button";
import { PlanoEditable, type ZonaPlano, type ElementoPlanoData } from "./plano-editable";
import { RelojDigital } from "./reloj";

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

  const [zonasRaw, elementosRaw, local, reservasRaw] = await Promise.all([
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
              include: {
                // Lo que lleva pedida la mesa — se pinta directamente
                // encima de ella (bebida/comida, pendiente o servida) en
                // vez de en un panel aparte.
                lineas: { select: { estado: true, horaEnviada: true, producto: { select: { tipo: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.elementoPlano.findMany({ where: { localId }, orderBy: { id: "asc" } }),
    prisma.local.findUnique({
      where: { id: localId },
      select: { planoAlto: true },
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
    mesas: zona.mesas.map((mesa) => {
      const comanda = mesa.comandas[0];
      return {
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
        horaApertura: comanda ? comanda.horaApertura.toISOString() : null,
        lineas: comanda
          ? comanda.lineas.map((linea) => ({
              tipo: linea.producto.tipo,
              estado: linea.estado,
              horaEnviada: linea.horaEnviada ? linea.horaEnviada.toISOString() : null,
            }))
          : [],
      };
    }),
  }));

  const hayMesas = zonas.some((z) => z.mesas.length > 0);

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            {membresia.localNombre}
          </h1>
          <p className="text-text-muted">Plano de sala</p>
        </div>
        <RelojDigital />
        <div className="flex gap-2">
          <VolverAtrasButton />
          <Link href={`/tpv/${localId}`}>
            <Button variant="ghost">Inicio</Button>
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
    </main>
  );
}
