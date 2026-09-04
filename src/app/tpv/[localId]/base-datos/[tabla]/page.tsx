import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLocalAccess } from "@/lib/local-access";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VolverAtrasButton } from "@/components/volver-atras-button";
import { buscarTabla } from "../tablas";
import { TablaEditable, type CampoCliente } from "../tabla-editable";
import type { OpcionRelacion } from "../tipos";

export default async function TablaPage({
  params,
  searchParams,
}: {
  params: Promise<{ localId: string; tabla: string }>;
  searchParams: Promise<{ comandaId?: string }>;
}) {
  const { localId, tabla } = await params;
  const { comandaId } = await searchParams;
  await requireLocalAccess(localId);

  const definicion = buscarTabla(tabla);
  if (!definicion) notFound();

  const [filasCargadas, opcionesPorCampo] = await Promise.all([
    definicion.cargar(localId),
    (async () => {
      const entradas = await Promise.all(
        definicion.campos
          .filter((c) => c.tipo === "relacion" && c.cargarOpciones)
          .map(async (c) => [c.clave, await c.cargarOpciones!(localId)] as [string, OpcionRelacion[]]),
      );
      return Object.fromEntries(entradas);
    })(),
  ]);

  // Al llegar desde el enlace "Ver →" de un ticket, solo interesan las
  // líneas de esa comanda concreta — y el alta ya trae el comandaId puesto.
  const filas =
    tabla === "lineas-comanda" && comandaId
      ? filasCargadas.filter((f) => f.comandaId === comandaId)
      : filasCargadas;
  const valoresPredefinidas =
    tabla === "lineas-comanda" && comandaId ? { comandaId } : undefined;

  // cargarOpciones no cruza la frontera servidor -> cliente (no es
  // serializable) — el cliente ya recibe las opciones resueltas aparte.
  // Los campos "oculto" (id, y todo lo que solo tiene sentido en el editor
  // visual del plano: color, ancho, alto, posición, rotación) ni se
  // muestran ni se piden al crear — siguen ahí por debajo con su valor por
  // defecto, simplemente no son columnas de esta tabla.
  const campos: CampoCliente[] = definicion.campos
    .filter((c) => !c.oculto)
    .map((c) => {
      const { cargarOpciones, ...resto } = c;
      void cargarOpciones;
      return resto;
    });

  const campoFiltro = definicion.filtroRapido
    ? definicion.campos.find((c) => c.clave === definicion.filtroRapido)
    : undefined;
  const filtroRapido = campoFiltro
    ? { clave: campoFiltro.clave, opciones: campoFiltro.opciones ?? [] }
    : undefined;

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{definicion.etiqueta}</h1>
          <p className="text-text-muted">{definicion.descripcion}</p>
        </div>
        <div className="flex gap-2">
          <VolverAtrasButton />
          <Link href={`/tpv/${localId}`}>
            <Button variant="ghost">Inicio</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardTitle>
          {filas.length} {filas.length === 1 ? "fila" : "filas"}
        </CardTitle>
        <TablaEditable
          localId={localId}
          slug={tabla}
          campos={campos}
          filas={filas}
          opcionesPorCampo={opcionesPorCampo}
          puedeCrear={Boolean(definicion.crear)}
          puedeEditar={Boolean(definicion.actualizar)}
          puedeBorrar={Boolean(definicion.borrar)}
          filtroRapido={filtroRapido}
          valoresPredefinidas={valoresPredefinidas}
        />
      </Card>
    </main>
  );
}
