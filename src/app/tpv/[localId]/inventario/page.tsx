import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, Th } from "@/components/ui/table";
import { IngredienteForm } from "./ingrediente-form";
import { IngredienteRow, type IngredienteData } from "./ingrediente-row";
import { AjusteStockForm } from "./ajuste-stock-form";

export default async function InventarioStockPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;

  const ingredientesRaw = await prisma.ingrediente.findMany({
    where: { localId },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { recetaLineas: true } } },
  });

  const ingredientes: IngredienteData[] = ingredientesRaw.map((i) => ({
    id: i.id,
    nombre: i.nombre,
    tipo: i.tipo,
    unidadMedida: i.unidadMedida,
    stockAlmacen: Number(i.stockAlmacen),
    stockBarra: Number(i.stockBarra),
    stockMinimoBarra: Number(i.stockMinimoBarra),
    stockMaximoBarra: Number(i.stockMaximoBarra),
    costeUnitario: Number(i.costeUnitario),
    enUso: i._count.recetaLineas > 0,
  }));

  return (
    <>
      <p className="text-sm text-text-muted">
        Cada referencia vive partida en dos sitios: el grueso en{" "}
        <strong>almacén</strong> y una cantidad pequeña &quot;a mano&quot; en{" "}
        <strong>barra</strong>. Una venta cobrada descuenta de barra; recibir un
        pedido de proveedor suma a almacén; la reposición mueve de uno a otro.
      </p>

      <Card>
        <CardTitle>Añadir referencia</CardTitle>
        <IngredienteForm localId={localId} />
      </Card>

      <Card>
        <CardTitle>Stock</CardTitle>
        {ingredientes.length === 0 ? (
          <p className="text-text-muted">Todavía no hay ninguna referencia.</p>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Referencia</Th>
                <Th>Tipo</Th>
                <Th>Unidad</Th>
                <Th>Almacén</Th>
                <Th>Barra</Th>
                <Th>Mín. barra</Th>
                <Th>Máx. barra</Th>
                <Th>Coste</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {ingredientes.map((ingrediente) => (
                <IngredienteRow key={ingrediente.id} localId={localId} ingrediente={ingrediente} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {ingredientes.length > 0 && (
        <Card>
          <CardTitle>Registrar merma o ajuste</CardTitle>
          <AjusteStockForm
            localId={localId}
            ingredientes={ingredientes.map((i) => ({ id: i.id, nombre: i.nombre }))}
          />
        </Card>
      )}
    </>
  );
}
