import Link from "next/link";
import { requireLocalAccess } from "@/lib/local-access";
import { Card, CardTitle } from "@/components/ui/card";
import { TABLAS } from "./tablas";

export default async function BaseDatosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  await requireLocalAccess(localId);

  const conteos = await Promise.all(
    TABLAS.map(async (t) => ({ slug: t.slug, total: (await t.cargar(localId)).length })),
  );
  const totalPorSlug = new Map(conteos.map((c) => [c.slug, c.total]));

  const grupos = [...new Set(TABLAS.map((t) => t.grupo))];

  return (
    <main className="flex-1 p-8 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Base de datos</h1>
          <p className="text-text-muted">
            Todas las tablas del sistema — de aquí manan todas las secciones. Añade,
            edita o borra filas directamente, o entra en la sección de cada una.
          </p>
        </div>
        <Link href={`/tpv/${localId}`} className="text-sm text-text-muted underline">
          Volver a inicio
        </Link>
      </div>

      {grupos.map((grupo) => (
        <Card key={grupo}>
          <CardTitle>{grupo}</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TABLAS.filter((t) => t.grupo === grupo).map((t) => (
              <Link
                key={t.slug}
                href={`/tpv/${localId}/base-datos/${t.slug}`}
                className="rounded-md border border-border bg-surface-2 px-4 py-3 hover:shadow-raised transition-shadow flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text">{t.etiqueta}</span>
                  <span className="font-mono text-sm text-text-muted">
                    {totalPorSlug.get(t.slug) ?? 0}
                  </span>
                </div>
                <p className="text-xs text-text-faint">{t.descripcion}</p>
                {t.seccionUrl && (
                  <span className="text-xs text-brand">
                    Se edita en {t.seccionUrl.split("/")[0]} →
                  </span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      ))}
    </main>
  );
}
