# Soluciones

Sistema de gestión para bares — TPV de sala, ventas, inventario, proveedores, carta con QR, escandallos y gestoría. Punto de partida: hostelería de Zaragoza.

Ver el documento de arquitectura para el contexto completo (visión, módulos, modelo de datos, roadmap).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4, Prisma sobre PostgreSQL, Auth.js (NextAuth) para login con roles por local.

El sistema de diseño (paleta, tipografía, componentes) vive en `.claude/skills/design-system/` y ya está aplicado en `src/app/globals.css` y `src/components/ui/`.

## Desarrollo

```bash
pnpm install
cp .env.example .env   # rellena DATABASE_URL y AUTH_SECRET (npx auth secret)
pnpm db:migrate         # crea las tablas a partir de prisma/schema.prisma
pnpm db:seed            # crea un local y un usuario admin de prueba
pnpm dev
```

Login de prueba tras el seed: `admin@soluciones.local` / `cambiar-esta-contrasena`.

Otros scripts útiles: `pnpm db:studio` (explorador visual de la base de datos), `pnpm lint`, `pnpm build`.
