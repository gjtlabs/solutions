import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const local = await prisma.local.upsert({
    where: { id: "local-demo-zaragoza" },
    update: {},
    create: {
      id: "local-demo-zaragoza",
      nombre: "Bar Ejemplo (Zaragoza)",
      direccion: "Calle Alfonso I, Zaragoza",
    },
  });

  const passwordHash = await hashPassword("cambiar-esta-contrasena");

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@soluciones.local" },
    update: {},
    create: {
      email: "admin@soluciones.local",
      nombre: "Admin",
      passwordHash,
    },
  });

  await prisma.membresia.upsert({
    where: { usuarioId_localId: { usuarioId: admin.id, localId: local.id } },
    update: { rol: "ADMIN" },
    create: { usuarioId: admin.id, localId: local.id, rol: "ADMIN" },
  });

  // ---------------------------------------------------------------------
  // Carta + inventario de ejemplo, para poder jugar con Inventario/
  // Proveedores/Reposición sin tener que dar de alta nada a mano primero.
  // ---------------------------------------------------------------------

  const categoriaBebidas = await prisma.categoriaCarta.upsert({
    where: { id: "cat-demo-bebidas" },
    update: {},
    create: { id: "cat-demo-bebidas", localId: local.id, nombre: "Bebidas", orden: 0 },
  });

  const ingredientes = await Promise.all(
    [
      {
        id: "ing-demo-cerveza-barril",
        nombre: "Cerveza barril",
        unidadMedida: "l",
        stockAlmacen: 60,
        stockBarra: 15,
        stockMinimoBarra: 5,
        stockMaximoBarra: 20,
        costeUnitario: 1.2,
      },
      {
        id: "ing-demo-vino-tinto",
        nombre: "Vino tinto",
        unidadMedida: "l",
        stockAlmacen: 20,
        stockBarra: 4,
        stockMinimoBarra: 3,
        stockMaximoBarra: 8,
        costeUnitario: 3.5,
      },
      {
        id: "ing-demo-ron",
        nombre: "Ron",
        unidadMedida: "l",
        stockAlmacen: 10,
        stockBarra: 1.5,
        stockMinimoBarra: 1,
        stockMaximoBarra: 3,
        costeUnitario: 12,
      },
      {
        id: "ing-demo-refresco-cola",
        nombre: "Refresco de cola",
        unidadMedida: "l",
        stockAlmacen: 15,
        stockBarra: 2,
        stockMinimoBarra: 2,
        stockMaximoBarra: 6,
        costeUnitario: 0.9,
      },
    ].map((data) =>
      prisma.ingrediente.upsert({ where: { id: data.id }, update: {}, create: { ...data, localId: local.id } }),
    ),
  );
  const [cervezaBarril, vinoTinto, ron, refrescoCola] = ingredientes;

  const productos = await Promise.all(
    [
      { id: "prod-demo-cana", nombre: "Caña", precioVenta: 2.5 },
      { id: "prod-demo-vino", nombre: "Copa de vino", precioVenta: 3.5 },
      { id: "prod-demo-ron-cola", nombre: "Ron con cola", precioVenta: 6 },
    ].map((data) =>
      prisma.producto.upsert({
        where: { id: data.id },
        update: {},
        create: { ...data, localId: local.id, categoriaId: categoriaBebidas.id, tipo: "BEBIDA" },
      }),
    ),
  );
  const [cana, copaVino, ronCola] = productos;

  // Escandallo: qué ingredientes (y cuánto) consume cada producto vendido —
  // es lo que hace que cobrar en caja descuente stock de barra de verdad.
  await Promise.all(
    [
      { productoId: cana.id, ingredienteId: cervezaBarril.id, cantidad: 0.33 },
      { productoId: copaVino.id, ingredienteId: vinoTinto.id, cantidad: 0.15 },
      { productoId: ronCola.id, ingredienteId: ron.id, cantidad: 0.05 },
      { productoId: ronCola.id, ingredienteId: refrescoCola.id, cantidad: 0.15 },
    ].map((data) =>
      prisma.recetaLinea.upsert({
        where: { productoId_ingredienteId: { productoId: data.productoId, ingredienteId: data.ingredienteId } },
        update: {},
        create: data,
      }),
    ),
  );

  const proveedor = await prisma.proveedor.upsert({
    where: { id: "prov-demo-ebro" },
    update: {},
    create: {
      id: "prov-demo-ebro",
      localId: local.id,
      nombre: "Distribuciones Ebro",
      contacto: "976 123 456",
      productosHabituales: "Cerveza, vino, refrescos",
    },
  });

  // Un pedido ya "enviado" al proveedor, listo para probar el flujo de
  // Recibir albarán sin tener que crearlo a mano primero.
  const pedidoExistente = await prisma.pedidoProveedor.findUnique({
    where: { id: "pedido-demo-ebro-1" },
  });
  if (!pedidoExistente) {
    await prisma.pedidoProveedor.create({
      data: {
        id: "pedido-demo-ebro-1",
        proveedorId: proveedor.id,
        estado: "ENVIADO",
        lineas: {
          create: [
            { ingredienteId: cervezaBarril.id, cantidad: 30 },
            { ingredienteId: vinoTinto.id, cantidad: 10 },
          ],
        },
      },
    });
  }

  console.log(`Seed listo. Local: "${local.nombre}". Login: admin@soluciones.local / cambiar-esta-contrasena`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
