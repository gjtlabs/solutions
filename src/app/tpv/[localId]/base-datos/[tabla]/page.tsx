import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLocalAccess } from "@/lib/local-access";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buscarTabla } from "../tablas";
import { TablaEditable, type CampoCliente } from "../tabla-editable";
import type { OpcionRelacion } from "../tipos";

export default async function TablaPage({
  params,
}: {
  params: Promise<{ localId: string; tabla: string }>;
}) {
  const { localId, tabla } = await params;
  await requireLocalAccess(localId);

  const definicion = buscarTabla(tabla);
  if (!definicion) notFound();

  const [filas, opcionesPorCampo] = await Promise.all([
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

  // cargarOpciones no cruza la frontera servidor -> cliente (no es
  // serializable) — el cliente ya recibe las opciones resueltas aparte.
  const campos: CampoCliente[] = definicion.campos.map((c) => {
    const { cargarOpciones, ...resto } = c;
    void cargarOpciones;
    return resto;
  });

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{definicion.etiqueta}</h1>
          <p className="text-text-muted">{definicion.descripcion}</p>
        </div>
        <div className="flex gap-2">
          {definicion.seccionUrl && (
            <Link href={`/tpv/${localId}/${definicion.seccionUrl}`}>
              <Button variant="secondary">Ir a la sección</Button>
            </Link>
          )}
          <Link href={`/tpv/${localId}/base-datos`}>
            <Button variant="ghost">Volver a base de datos</Button>
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
        />
      </Card>
    </main>
  );
}
