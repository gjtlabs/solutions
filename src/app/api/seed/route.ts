import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

// Ruta temporal de arranque — crea un local y un usuario admin de prueba
// en una base de datos vacía. Protegida con AUTH_SECRET como token porque
// no hay otro secreto configurado todavía. Bórrala en cuanto la hayas usado
// una vez: no debe quedar viva en producción.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  return NextResponse.json({
    ok: true,
    mensaje: `Local "${local.nombre}" y usuario admin@soluciones.local listos. Recuerda borrar esta ruta ahora.`,
  });
}
