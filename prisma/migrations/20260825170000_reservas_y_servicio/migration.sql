-- Panel de servicio: distinguir comida/bebida por producto, saber cuándo
-- una línea pasó a cocina (para el aviso de +20 min), y reservas de mesa.

CREATE TYPE "TipoProducto" AS ENUM ('COMIDA', 'BEBIDA');

ALTER TABLE "productos" ADD COLUMN "tipo" "TipoProducto" NOT NULL DEFAULT 'COMIDA';

ALTER TABLE "lineas_comanda" ADD COLUMN "horaEnviada" TIMESTAMP(3);

CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "personas" INTEGER NOT NULL,
    "hora" TIMESTAMP(3) NOT NULL,
    "mesaId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
