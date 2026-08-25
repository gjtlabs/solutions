-- AlterTable: sustituye el rectángulo fijo (posicionX/Y + ancho/alto en
-- píxeles) por una forma libre (lista de vértices en % del lienzo) y añade
-- el color de la zona.
ALTER TABLE "zonas" ADD COLUMN "puntos" JSONB;
ALTER TABLE "zonas" ADD COLUMN "color" TEXT NOT NULL DEFAULT 'neutro';

-- Backfill: convierte el rectángulo de cada zona existente en un polígono
-- de 4 vértices equivalente. ancho/alto estaban en píxeles sobre un lienzo
-- de referencia de 900x672 — la conversión es aproximada (dato de pruebas,
-- no producción real todavía), el usuario puede redibujar la forma desde
-- el plano si no encaja.
UPDATE "zonas" SET "puntos" = jsonb_build_array(
  jsonb_build_object(
    'x', "posicionX" - (("ancho"::float / 900 * 100) / 2),
    'y', "posicionY" - (("alto"::float / 672 * 100) / 2)
  ),
  jsonb_build_object(
    'x', "posicionX" + (("ancho"::float / 900 * 100) / 2),
    'y', "posicionY" - (("alto"::float / 672 * 100) / 2)
  ),
  jsonb_build_object(
    'x', "posicionX" + (("ancho"::float / 900 * 100) / 2),
    'y', "posicionY" + (("alto"::float / 672 * 100) / 2)
  ),
  jsonb_build_object(
    'x', "posicionX" - (("ancho"::float / 900 * 100) / 2),
    'y', "posicionY" + (("alto"::float / 672 * 100) / 2)
  )
)
WHERE "puntos" IS NULL;

ALTER TABLE "zonas" ALTER COLUMN "puntos" SET NOT NULL;
ALTER TABLE "zonas" DROP COLUMN "posicionX";
ALTER TABLE "zonas" DROP COLUMN "posicionY";
ALTER TABLE "zonas" DROP COLUMN "ancho";
ALTER TABLE "zonas" DROP COLUMN "alto";
