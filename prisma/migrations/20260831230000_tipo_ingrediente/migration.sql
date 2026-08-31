-- El tipo (comida/bebida/consumible) pasa a ser compartido entre Producto
-- e Ingrediente — TipoProducto se renombra a TipoItem y gana CONSUMIBLE
-- para lo que no es ni comida ni bebida pero sigue siendo inventario
-- (servilletas, vasos de un solo uso, productos de limpieza...).
ALTER TYPE "TipoProducto" RENAME TO "TipoItem";
ALTER TYPE "TipoItem" ADD VALUE 'CONSUMIBLE';

-- Los ingredientes no tenían tipo hasta ahora — se añade con CONSUMIBLE
-- como valor por defecto (lo más neutro para una referencia que no
-- reconozcamos) y se clasifican correctamente las del catálogo de ejemplo
-- de la migración anterior; cualquier otra referencia ya creada a mano se
-- queda en CONSUMIBLE hasta que se corrija a mano desde Inventario, que
-- ahora permite editar el tipo.
ALTER TABLE "ingredientes" ADD COLUMN "tipo" "TipoItem" NOT NULL DEFAULT 'CONSUMIBLE';

UPDATE "ingredientes" SET "tipo" = 'BEBIDA' WHERE "id" IN (
  'ing-cerveza-barril', 'ing-cerveza-sin-alcohol', 'ing-vino-tinto', 'ing-vino-blanco',
  'ing-vino-rosado', 'ing-cava', 'ing-vermut', 'ing-ron', 'ing-ginebra', 'ing-whisky',
  'ing-refresco-cola', 'ing-refresco-naranja', 'ing-refresco-limon', 'ing-tonica',
  'ing-agua-mineral', 'ing-cafe-grano', 'ing-leche', 'ing-zumo-naranja', 'ing-sidra'
);

UPDATE "ingredientes" SET "tipo" = 'COMIDA' WHERE "id" IN (
  'ing-patatas', 'ing-aceite-oliva', 'ing-huevos', 'ing-jamon-serrano', 'ing-queso-curado',
  'ing-pan', 'ing-tomate', 'ing-pimiento-verde', 'ing-calamar', 'ing-boqueron',
  'ing-croqueta', 'ing-chorizo', 'ing-morcilla', 'ing-lomo', 'ing-pulpo', 'ing-champinon',
  'ing-salsa-brava', 'ing-alioli', 'ing-aceitunas', 'ing-anchoa', 'ing-lechuga',
  'ing-atun-lata', 'ing-mahonesa'
);
