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
