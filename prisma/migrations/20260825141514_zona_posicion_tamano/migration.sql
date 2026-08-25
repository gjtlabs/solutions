-- AlterTable
-- Todas con DEFAULT explícito a propósito: la tabla "zonas" ya tiene filas
-- en producción (al menos la zona "General" creada al arreglar la
-- migración anterior), así que un NOT NULL sin default volvería a fallar
-- igual que la vez pasada.
ALTER TABLE "zonas"
  ADD COLUMN "posicionX" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "posicionY" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "ancho" INTEGER NOT NULL DEFAULT 280,
  ADD COLUMN "alto" INTEGER NOT NULL DEFAULT 220;
