-- planoFormato pasa a ser el ancho de TODA la página (no del lienzo del
-- plano); se restaura planoAlto para el alto libre del lienzo, que se
-- había sustituido por error por el propio planoFormato. Se añaden
-- tema (claro/oscuro) y colorMarca (acento de los botones) para Ajustes.

CREATE TYPE "TemaColor" AS ENUM ('CLARO', 'OSCURO');
CREATE TYPE "ColorMarca" AS ENUM ('VERDE', 'AZUL', 'TERRACOTA', 'GRANATE', 'PIZARRA');

ALTER TABLE "locales" ADD COLUMN "planoAlto" INTEGER NOT NULL DEFAULT 560;
ALTER TABLE "locales" ADD COLUMN "tema" "TemaColor" NOT NULL DEFAULT 'CLARO';
ALTER TABLE "locales" ADD COLUMN "colorMarca" "ColorMarca" NOT NULL DEFAULT 'VERDE';
