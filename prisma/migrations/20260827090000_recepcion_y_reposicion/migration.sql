-- Ingrediente: separa el stock en dos ubicaciones (almacén/barra) con un
-- par mínimo/máximo de picking en barra, para poder calcular la reposición
-- diaria automáticamente. stockActual/stockMinimo se renombran (conservan
-- sus valores); stockBarra/stockMaximoBarra son columnas nuevas.
ALTER TABLE "ingredientes" RENAME COLUMN "stockActual" TO "stockAlmacen";
ALTER TABLE "ingredientes" RENAME COLUMN "stockMinimo" TO "stockMinimoBarra";
ALTER TABLE "ingredientes" ADD COLUMN "stockBarra" DECIMAL(10,3) NOT NULL DEFAULT 0;
ALTER TABLE "ingredientes" ADD COLUMN "stockMaximoBarra" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- Añadir dos veces la misma referencia a un pedido suma la cantidad, en
-- vez de crear una segunda línea duplicada para el mismo ingrediente.
CREATE UNIQUE INDEX "pedidos_proveedor_lineas_pedidoId_ingredienteId_key" ON "pedidos_proveedor_lineas"("pedidoId", "ingredienteId");

-- Número de albarán físico del proveedor, para cotejar la recepción.
ALTER TABLE "recepciones" ADD COLUMN "numeroAlbaran" TEXT;

-- Traspaso interno almacén -> barra (reposición): no es ni una entrada de
-- proveedor ni una venta, así que necesita su propio tipo de movimiento.
ALTER TYPE "TipoMovimientoStock" ADD VALUE 'TRASPASO';

CREATE TYPE "EstadoReposicion" AS ENUM ('PENDIENTE', 'COMPLETADA');

CREATE TABLE "reposiciones" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoReposicion" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "reposiciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reposicion_lineas" (
    "id" TEXT NOT NULL,
    "reposicionId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "cantidadSugerida" DECIMAL(10,3) NOT NULL,
    "cantidadLlevada" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "completada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reposicion_lineas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reposiciones" ADD CONSTRAINT "reposiciones_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reposicion_lineas" ADD CONSTRAINT "reposicion_lineas_reposicionId_fkey" FOREIGN KEY ("reposicionId") REFERENCES "reposiciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reposicion_lineas" ADD CONSTRAINT "reposicion_lineas_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
