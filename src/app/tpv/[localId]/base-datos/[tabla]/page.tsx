import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLocalAccess } from "@/lib/local-access";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { buscarTabla } from "../tablas";
import { formatoCelda } from "../formato";

export default async function TablaPage({
  params,
}: {
  params: Promise<{ localId: string; tabla: string }>;
}) {
  const { localId, tabla } = await params;
  await requireLocalAccess(localId);

  const definicion = buscarTabla(tabla);
  if (!definicion) notFound();

  const filas = await definicion.cargar(localId);

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
        {filas.length === 0 ? (
          <p className="text-text-muted">Todavía no hay ninguna.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                {definicion.columnas.map((c) => (
                  <Th key={c}>{c}</Th>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map((fila, i) => (
                <TableRow key={String(fila.id ?? i)}>
                  {definicion.columnas.map((c) => (
                    <Td key={c} compact className="font-mono">
                      {formatoCelda(fila[c])}
                    </Td>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </main>
  );
}
