-- CreateEnum
CREATE TYPE "TipoElemento" AS ENUM ('PUERTA', 'ESCALERA', 'PARED');

-- CreateTable
CREATE TABLE "elementos_plano" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "tipo" "TipoElemento" NOT NULL,
    "posicionX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "posicionY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "ancho" INTEGER NOT NULL DEFAULT 60,
    "alto" INTEGER NOT NULL DEFAULT 20,
    "rotacion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "elementos_plano_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "elementos_plano" ADD CONSTRAINT "elementos_plano_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
