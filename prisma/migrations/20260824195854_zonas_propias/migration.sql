-- CreateTable
CREATE TABLE "zonas" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zonas_localId_nombre_key" ON "zonas"("localId", "nombre");

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: sustituye la columna de texto "zona" por una relación a "zonas".
-- La tabla "mesas" no tiene filas todavía en producción, así que no hace
-- falta backfill.
DROP INDEX "mesas_localId_zona_numero_key";
ALTER TABLE "mesas" DROP COLUMN "zona";
ALTER TABLE "mesas" ADD COLUMN "zonaId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "mesas_zonaId_numero_key" ON "mesas"("zonaId", "numero");
