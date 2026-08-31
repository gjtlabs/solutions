-- Precio real del proveedor: hasta ahora un pedido o una recepción solo
-- registraban cantidad, nunca precio — el "Coste" de Inventario era un
-- número suelto escrito a mano, sin relación con lo que de verdad se paga.
-- Ahora cada línea de pedido lleva el precio esperado, y cada línea de
-- recepción el precio realmente pagado; al confirmar la recepción, ese
-- precio pasa a ser el nuevo Coste del ingrediente (ver lib/inventario.ts).
ALTER TABLE "pedidos_proveedor_lineas" ADD COLUMN "precioUnitario" DECIMAL(10,4) NOT NULL DEFAULT 0;
ALTER TABLE "recepcion_lineas" ADD COLUMN "precioUnitario" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- El pedido de ejemplo de la migración de catálogo se queda con precio 0
-- si no se rellena aquí — le ponemos el mismo valor que el coste inicial
-- de esas dos referencias, como precio esperado razonable.
UPDATE "pedidos_proveedor_lineas" SET "precioUnitario" = 1.2 WHERE "id" = 'pedido-ejemplo-ebro-1-l1';
UPDATE "pedidos_proveedor_lineas" SET "precioUnitario" = 3.5 WHERE "id" = 'pedido-ejemplo-ebro-1-l2';
