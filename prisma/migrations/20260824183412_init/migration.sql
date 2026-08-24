-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'ENCARGADO', 'CAMARERO', 'COCINA', 'GESTORIA');

-- CreateEnum
CREATE TYPE "EstadoComanda" AS ENUM ('ABIERTA', 'ENVIADA', 'COBRADA');

-- CreateEnum
CREATE TYPE "EstadoLineaComanda" AS ENUM ('PENDIENTE', 'COCINA', 'SERVIDO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('ENTRADA', 'SALIDA', 'MERMA');

-- CreateEnum
CREATE TYPE "EstadoPedidoProveedor" AS ENUM ('BORRADOR', 'ENVIADO', 'RECIBIDO');

-- CreateEnum
CREATE TYPE "EstadoNomina" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateTable
CREATE TABLE "locales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "pin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membresias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,

    CONSTRAINT "membresias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 2,
    "posicionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posicionY" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas" (
    "id" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "camareroId" TEXT NOT NULL,
    "estado" "EstadoComanda" NOT NULL DEFAULT 'ABIERTA',
    "horaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaCierre" TIMESTAMP(3),

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_comanda" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "notas" TEXT,
    "estado" "EstadoLineaComanda" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "lineas_comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "cierreCajaId" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cierres_caja" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalEsperado" DECIMAL(10,2) NOT NULL,
    "totalContado" DECIMAL(10,2) NOT NULL,
    "diferencia" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cierres_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_carta" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorias_carta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioVenta" DECIMAL(10,2) NOT NULL,
    "visibleEnCarta" BOOLEAN NOT NULL DEFAULT true,
    "alergenos" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receta_lineas" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "receta_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredientes" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "stockActual" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "costeUnitario" DECIMAL(10,4) NOT NULL DEFAULT 0,

    CONSTRAINT "ingredientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "productosHabituales" TEXT,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_proveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPedidoProveedor" NOT NULL DEFAULT 'BORRADOR',

    CONSTRAINT "pedidos_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_proveedor_lineas" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "pedidos_proveedor_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepciones" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidencias" TEXT,

    CONSTRAINT "recepciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepcion_lineas" (
    "id" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "cantidadRecibida" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "recepcion_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "dniNie" TEXT NOT NULL,
    "iban" TEXT,
    "tipoContrato" TEXT NOT NULL,
    "salarioBase" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "horaEntrada" TIMESTAMP(3) NOT NULL,
    "horaSalida" TIMESTAMP(3),

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "bruto" DECIMAL(10,2) NOT NULL,
    "deducciones" DECIMAL(10,2) NOT NULL,
    "neto" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoNomina" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membresias_usuarioId_localId_key" ON "membresias"("usuarioId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_localId_zona_numero_key" ON "mesas"("localId", "zona", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_comandaId_key" ON "tickets"("comandaId");

-- CreateIndex
CREATE UNIQUE INDEX "receta_lineas_productoId_ingredienteId_key" ON "receta_lineas"("productoId", "ingredienteId");

-- CreateIndex
CREATE UNIQUE INDEX "recepciones_pedidoId_key" ON "recepciones"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_usuarioId_key" ON "empleados"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_dniNie_key" ON "empleados"("dniNie");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_empleadoId_periodo_key" ON "nominas"("empleadoId", "periodo");

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_camareroId_fkey" FOREIGN KEY ("camareroId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_comanda" ADD CONSTRAINT "lineas_comanda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_comanda" ADD CONSTRAINT "lineas_comanda_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_cierreCajaId_fkey" FOREIGN KEY ("cierreCajaId") REFERENCES "cierres_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_caja" ADD CONSTRAINT "cierres_caja_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_carta" ADD CONSTRAINT "categorias_carta_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_carta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_lineas" ADD CONSTRAINT "receta_lineas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receta_lineas" ADD CONSTRAINT "receta_lineas_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_proveedor" ADD CONSTRAINT "pedidos_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_proveedor_lineas" ADD CONSTRAINT "pedidos_proveedor_lineas_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_proveedor_lineas" ADD CONSTRAINT "pedidos_proveedor_lineas_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones" ADD CONSTRAINT "recepciones_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_lineas" ADD CONSTRAINT "recepcion_lineas_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "recepciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepcion_lineas" ADD CONSTRAINT "recepcion_lineas_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_localId_fkey" FOREIGN KEY ("localId") REFERENCES "locales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
