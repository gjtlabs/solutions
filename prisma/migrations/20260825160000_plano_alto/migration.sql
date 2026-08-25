-- Alto ajustable del lienzo del plano de sala (px). El ancho sigue siendo
-- fluido; solo el alto se guarda, para poder recortar el espacio en blanco
-- que deja una proporción fija cuando el local tiene pocas zonas/mesas.
ALTER TABLE "locales" ADD COLUMN "planoAlto" INTEGER NOT NULL DEFAULT 560;
