-- Sustituye la carta de COMIDA inventada por la carta real del bar (foto
-- aportada por el usuario): fuera "Tapas Frías", "Tapas Calientes" y
-- "Montaditos y Bocadillos", dentro "Picoteo", "Ensaladas", "Tostadas",
-- "Marisco", "Raciones" y "Carnes". La carta de BEBIDA no se toca.
--
-- Los 28 productos y 3 categorías viejos tienen id fijo desde que se
-- insertaron en 20260831210000_catalogo_ejemplo — borrarlos por id es
-- seguro y, junto con ON CONFLICT DO NOTHING en los inserts nuevos, hace
-- que esta migración se pueda volver a aplicar sin duplicar ni fallar.
-- Se borran a mano las líneas de comanda y de escandallo que puedan
-- referenciar los productos viejos ANTES de borrar el producto — no dar
-- por hecho que el historial ya está vacío.
DO $$
DECLARE
  v_local_id TEXT;
  v_productos_viejos TEXT[] := ARRAY[
    'prod-jamon-racion', 'prod-tabla-quesos', 'prod-tabla-iberica', 'prod-aceitunas',
    'prod-banderillas', 'prod-boquerones', 'prod-ensaladilla', 'prod-pan-tomate', 'prod-ensalada-mixta',
    'prod-bravas', 'prod-alioli-patatas', 'prod-patatas-mixtas', 'prod-tortilla-racion',
    'prod-pincho-tortilla', 'prod-calamares', 'prod-croquetas', 'prod-pulpo', 'prod-champinones',
    'prod-huevos-rotos', 'prod-pisto',
    'prod-mont-jamon', 'prod-mont-chorizo', 'prod-mont-morcilla', 'prod-mont-queso', 'prod-mont-lomo',
    'prod-boc-jamon', 'prod-boc-calamares', 'prod-boc-lomo'
  ];
  v_categorias_viejas TEXT[] := ARRAY['cat-tapas-frias', 'cat-tapas-calientes', 'cat-montaditos-y-bocadillos'];
BEGIN
  SELECT id INTO v_local_id FROM "locales" ORDER BY "createdAt" ASC LIMIT 1;
  IF v_local_id IS NULL THEN
    RETURN;
  END IF;

  -- Limpieza defensiva de lo que pudiera colgar todavía de los productos
  -- viejos (líneas de comanda de pruebas, escandallo).
  DELETE FROM "lineas_comanda" WHERE "productoId" = ANY(v_productos_viejos);
  DELETE FROM "receta_lineas" WHERE "productoId" = ANY(v_productos_viejos);
  DELETE FROM "productos" WHERE id = ANY(v_productos_viejos);
  DELETE FROM "categorias_carta" WHERE id = ANY(v_categorias_viejas);

  -- Categorías nuevas, a continuación de las de bebida (orden 0-4).
  INSERT INTO "categorias_carta" ("id", "localId", "nombre", "orden") VALUES ('cat-picoteo', v_local_id, 'Picoteo', 5) ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "categorias_carta" ("id", "localId", "nombre", "orden") VALUES ('cat-ensaladas', v_local_id, 'Ensaladas', 6) ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "categorias_carta" ("id", "localId", "nombre", "orden") VALUES ('cat-tostadas', v_local_id, 'Tostadas', 7) ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "categorias_carta" ("id", "localId", "nombre", "orden") VALUES ('cat-marisco', v_local_id, 'Marisco', 8) ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "categorias_carta" ("id", "localId", "nombre", "orden") VALUES ('cat-raciones', v_local_id, 'Raciones', 9) ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "categorias_carta" ("id", "localId", "nombre", "orden") VALUES ('cat-carnes', v_local_id, 'Carnes', 10) ON CONFLICT ("id") DO NOTHING;

  -- Picoteo
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-salmuera-hielo', v_local_id, 'cat-picoteo', 'Salmuera con hielo pilé', 1.95, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-vinagrillos', v_local_id, 'cat-picoteo', 'Vinagrillos', 1.85, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-banderilla-rejo', v_local_id, 'cat-picoteo', 'Banderilla de rejo', 3.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-alcachofas-parrilla', v_local_id, 'cat-picoteo', 'Alcachofas a la parrilla aliñadas en vinagre y espárragos', 4.20, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-boqueron-ajillo', v_local_id, 'cat-picoteo', 'Boquerón al ajillo', 1.95, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-guardia-civil', v_local_id, 'cat-picoteo', 'Guardia civil', 3.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-taco-escabeche', v_local_id, 'cat-picoteo', 'Taco escabeche', 5.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-torrezno', v_local_id, 'cat-picoteo', 'Torrezno', 3.90, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-bunuelitos-bacalao', v_local_id, 'cat-picoteo', 'Buñuelitos de bacalao (10 uds)', 3.60, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-carioca', v_local_id, 'cat-picoteo', 'Carioca', 3.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-croqueton', v_local_id, 'cat-picoteo', 'Croquetón', 3.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-empanadilla-picante', v_local_id, 'cat-picoteo', 'Empanadilla carne picante', 3.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;

  -- Ensaladas
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-ensaladilla-med', v_local_id, 'cat-ensaladas', 'Ensaladilla rusa (mediana)', 3.40, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-ensaladilla-grande', v_local_id, 'cat-ensaladas', 'Ensaladilla rusa (grande)', 5.90, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-tomate-preparado', v_local_id, 'cat-ensaladas', 'Tomate preparado', 6.90, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-bacalao-guacamole-ensalada', v_local_id, 'cat-ensaladas', 'Bacalao ahumado con guacamole (ensalada)', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-trujalico', v_local_id, 'cat-ensaladas', 'Trujalico: tomate, jamón y ventresca', 15.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;

  -- Tostadas (con pan con tomate)
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-tostada-anchoas', v_local_id, 'cat-tostadas', 'Tostada de anchoas, boquerones y piquillo', 9.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-tostada-bacalao-guacamole', v_local_id, 'cat-tostadas', 'Tostada de bacalao ahumado con guacamole', 9.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-tostada-ventresca', v_local_id, 'cat-tostadas', 'Tostada de ventresca con piquillo', 9.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-tostada-solomillo-px', v_local_id, 'cat-tostadas', 'Tostada de solomillo al Pedro Ximénez', 9.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;

  -- Marisco
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-crujiente-langostino', v_local_id, 'cat-marisco', 'Crujiente de langostino', 2.60, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-ostra', v_local_id, 'cat-marisco', 'Ostra', 3.10, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-zamburina-plancha', v_local_id, 'cat-marisco', 'Zamburiña plancha (salsa especial)', 2.30, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-salpicon-marisco', v_local_id, 'cat-marisco', 'Salpicón de marisco', 7.80, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-navajitas-plancha', v_local_id, 'cat-marisco', 'Navajitas plancha (6 uds, salsa especial)', 9.95, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-chipirones-plancha', v_local_id, 'cat-marisco', 'Chipirones plancha', 13.70, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-gamba-roja-plancha', v_local_id, 'cat-marisco', 'Gamba roja plancha (8 uds)', 16.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;

  -- Raciones
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-papas-bravas-real', v_local_id, 'cat-raciones', 'Papas bravas', 6.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-rabas-calamar', v_local_id, 'cat-raciones', 'Rabas de calamar', 10.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-gambardinas', v_local_id, 'cat-raciones', 'Gambardinas (10 uds)', 7.00, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-migas-huevo-uva', v_local_id, 'cat-raciones', 'Migas con huevo frito y uva', 6.30, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-verduritas-tempura', v_local_id, 'cat-raciones', 'Verduritas en tempura', 11.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-fritura-mixta', v_local_id, 'cat-raciones', 'Fritura mixta', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-garbanzos-bogavante', v_local_id, 'cat-raciones', 'Garbanzos con bogavante', 9.95, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-bacalao-tomate-huevo', v_local_id, 'cat-raciones', 'Bacalao con tomate y huevo', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-huevos-rotos-jamon-real', v_local_id, 'cat-raciones', 'Huevos rotos con jamón', 15.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-huevos-rotos-gulas', v_local_id, 'cat-raciones', 'Huevos rotos con gulas', 15.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-huevos-rotos-picadillo-soria', v_local_id, 'cat-raciones', 'Huevos rotos con picadillo Soria', 15.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;

  -- Carnes
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-madeja-patatas', v_local_id, 'cat-carnes', 'Madeja con patatas', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-pollo-cajun-patatas', v_local_id, 'cat-carnes', 'Pollo cajún con patatas', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-solomillo-roquefort', v_local_id, 'cat-carnes', 'Solomillo con roquefort', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
  INSERT INTO "productos" ("id", "localId", "categoriaId", "nombre", "precioVenta", "tipo") VALUES ('prod-churrasco-ternera', v_local_id, 'cat-carnes', 'Churrasco de ternera', 12.50, 'COMIDA') ON CONFLICT ("id") DO NOTHING;
END $$;
