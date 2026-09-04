import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import type { DefinicionTabla, FilaTabla, OpcionRelacion, ResultadoMutacion } from "./tipos";

// Prisma lanza P2002 (única) y P2003/P2025 (referencia rota o fila ya
// desaparecida) — un editor genérico sobre 26 modelos con sus propios
// checks tiene que traducirlas a algo que un dueño de bar entienda, en vez
// de dejar pasar el error crudo de Postgres.
function manejarError(e: unknown): ResultadoMutacion {
  const codigo = (e as { code?: string } | null)?.code;
  if (codigo === "P2002") return { error: "Ya existe una fila con ese mismo valor único." };
  if (codigo === "P2003") return { error: "No se puede borrar: hay otras filas que dependen de esta." };
  if (codigo === "P2025") return { error: "Esa fila ya no existe, o el id relacionado no es válido." };
  return { error: "No se pudo guardar." };
}

// --- Opciones para los selects de campos "relacion", siempre acotadas a
// este local — un select con filas de otro local sería una fuga entre
// inquilinos, no un atajo de UI. ---

async function opcionesZonas(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.zona.findMany({ where: { localId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.nombre }));
}

async function opcionesMesas(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.mesa.findMany({
    where: { localId },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, zona: { select: { nombre: true } } },
  });
  return filas.map((f) => ({ id: f.id, etiqueta: `${f.zona.nombre} · ${f.numero}` }));
}

async function opcionesProductos(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.producto.findMany({ where: { localId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.nombre }));
}

async function opcionesIngredientes(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.ingrediente.findMany({ where: { localId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.nombre }));
}

async function opcionesCategorias(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.categoriaCarta.findMany({ where: { localId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.nombre }));
}

async function opcionesProveedores(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.proveedor.findMany({ where: { localId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.nombre }));
}

async function opcionesPedidos(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.pedidoProveedor.findMany({
    where: { proveedor: { localId } },
    orderBy: { fecha: "desc" },
    select: { id: true, fecha: true, proveedor: { select: { nombre: true } } },
  });
  return filas.map((f) => ({ id: f.id, etiqueta: `${f.proveedor.nombre} · ${f.fecha.toLocaleDateString("es-ES")}` }));
}

async function opcionesRecepciones(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.recepcion.findMany({
    where: { pedido: { proveedor: { localId } } },
    orderBy: { fecha: "desc" },
    select: { id: true, fecha: true },
  });
  return filas.map((f) => ({ id: f.id, etiqueta: f.fecha.toLocaleString("es-ES") }));
}

async function opcionesReposiciones(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.reposicion.findMany({ where: { localId }, orderBy: { fecha: "desc" }, select: { id: true, fecha: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.fecha.toLocaleString("es-ES") }));
}

async function opcionesComandas(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.comanda.findMany({
    where: { mesa: { localId } },
    orderBy: { horaApertura: "desc" },
    take: 100,
    select: { id: true, horaApertura: true, mesa: { select: { numero: true } } },
  });
  return filas.map((f) => ({ id: f.id, etiqueta: `Mesa ${f.mesa.numero} · ${f.horaApertura.toLocaleString("es-ES")}` }));
}

async function opcionesUsuariosDelLocal(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.usuario.findMany({
    where: { membresias: { some: { localId } } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });
  return filas.map((f) => ({ id: f.id, etiqueta: f.nombre }));
}

async function opcionesEmpleados(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.empleado.findMany({
    where: { localId },
    select: { id: true, usuario: { select: { nombre: true } } },
  });
  return filas.map((f) => ({ id: f.id, etiqueta: f.usuario.nombre }));
}

async function opcionesCierresCaja(localId: string): Promise<OpcionRelacion[]> {
  const filas = await prisma.cierreCaja.findMany({ where: { localId }, orderBy: { fecha: "desc" }, select: { id: true, fecha: true } });
  return filas.map((f) => ({ id: f.id, etiqueta: f.fecha.toLocaleString("es-ES") }));
}

// Helpers para leer los datos que llegan del formulario genérico del
// cliente — igual que en el resto de la app (ver actualizarReserva), las
// fechas viajan como el string tal cual del input, nunca como Date: un
// server action solo tiene garantizado serializar bien tipos simples.
function texto(datos: FilaTabla, clave: string): string {
  const v = datos[clave];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}
function textoOpcional(datos: FilaTabla, clave: string): string | null {
  const v = texto(datos, clave);
  return v === "" ? null : v;
}
function numero(datos: FilaTabla, clave: string, porDefecto: number): number {
  const v = datos[clave];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return porDefecto;
}
function booleano(datos: FilaTabla, clave: string, porDefecto: boolean): boolean {
  const v = datos[clave];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true" || v === "1" || v === "on";
  return porDefecto;
}
function fecha(datos: FilaTabla, clave: string): Date | null {
  const v = datos[clave];
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function lista(datos: FilaTabla, clave: string): string[] {
  const v = datos[clave];
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
function json(datos: FilaTabla, clave: string): unknown {
  const v = datos[clave];
  if (typeof v !== "string" || v.trim() === "") return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}

export const TABLAS: DefinicionTabla[] = [
  {
    slug: "local",
    etiqueta: "Local",
    grupo: "Local",
    descripcion: "Datos del propio local y su apariencia.",
    seccionUrl: "ajustes",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "direccion", etiqueta: "direccion", tipo: "texto" },
      { clave: "zonaHoraria", etiqueta: "zonaHoraria", tipo: "texto", requerido: true },
      { clave: "createdAt", etiqueta: "createdAt", tipo: "fecha", soloLectura: true },
      { clave: "planoFormato", etiqueta: "planoFormato", tipo: "enum", opciones: ["PANORAMICO_16_9", "ESTANDAR_4_3"] },
      { clave: "planoAlto", etiqueta: "planoAlto", tipo: "numero", oculto: true },
      { clave: "tema", etiqueta: "tema", tipo: "enum", opciones: ["CLARO", "OSCURO"] },
      { clave: "colorMarca", etiqueta: "colorMarca", tipo: "enum", opciones: ["VERDE", "AZUL", "TERRACOTA", "GRANATE", "PIZARRA"], oculto: true },
    ],
    cargar: (localId) =>
      prisma.local.findMany({
        where: { id: localId },
        select: {
          id: true, nombre: true, direccion: true, zonaHoraria: true, createdAt: true,
          planoFormato: true, planoAlto: true, tema: true, colorMarca: true,
        },
      }),
    // Sin crear ni borrar a propósito: Local es el propio inquilino de la
    // URL — no tiene sentido crear uno segundo desde aquí, ni borrar el
    // único que hay.
    actualizar: async (localId, _id, datos) => {
      try {
        await prisma.local.update({
          where: { id: localId },
          data: {
            nombre: texto(datos, "nombre"),
            direccion: textoOpcional(datos, "direccion"),
            zonaHoraria: texto(datos, "zonaHoraria"),
            planoFormato: texto(datos, "planoFormato") as "PANORAMICO_16_9" | "ESTANDAR_4_3",
            planoAlto: numero(datos, "planoAlto", 560),
            tema: texto(datos, "tema") as "CLARO" | "OSCURO",
            colorMarca: texto(datos, "colorMarca") as "VERDE" | "AZUL" | "TERRACOTA" | "GRANATE" | "PIZARRA",
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "usuarios",
    etiqueta: "Usuarios",
    grupo: "Cuenta y accesos",
    descripcion: "Personas con acceso a este local, con cualquier rol.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "email", etiqueta: "email", tipo: "texto", requerido: true },
      { clave: "pin", etiqueta: "pin", tipo: "texto" },
      { clave: "password", etiqueta: "contraseña (déjalo en blanco para no cambiarla)", tipo: "password" },
      { clave: "createdAt", etiqueta: "createdAt", tipo: "fecha", soloLectura: true },
    ],
    cargar: (localId) =>
      prisma.usuario.findMany({
        where: { membresias: { some: { localId } } },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, email: true, pin: true, createdAt: true },
      }),
    // Crear un usuario aquí también le da de alta una membresía CAMARERO en
    // este local — si no, no aparecería nunca en este listado (que solo
    // muestra usuarios con acceso a este local concreto).
    crear: async (localId, datos) => {
      const contrasena = texto(datos, "password");
      if (!contrasena) return { error: "La contraseña es obligatoria para dar de alta un usuario." };
      try {
        const passwordHash = await hashPassword(contrasena);
        await prisma.usuario.create({
          data: {
            nombre: texto(datos, "nombre"),
            email: texto(datos, "email"),
            pin: textoOpcional(datos, "pin"),
            passwordHash,
            membresias: { create: { localId, rol: "CAMARERO" } },
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      try {
        const contrasena = texto(datos, "password");
        await prisma.usuario.updateMany({
          where: { id, membresias: { some: { localId } } },
          data: {
            nombre: texto(datos, "nombre"),
            email: texto(datos, "email"),
            pin: textoOpcional(datos, "pin"),
            ...(contrasena ? { passwordHash: await hashPassword(contrasena) } : {}),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    // Borra la cuenta entera (vale para todos los locales donde tenga
    // membresía, no solo este) — para quitarle el acceso a un usuario SOLO
    // en este local, edita o borra su fila en Membresías en vez de esta.
    borrar: async (localId, id) => {
      try {
        const r = await prisma.usuario.deleteMany({ where: { id, membresias: { some: { localId } } } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "membresias",
    etiqueta: "Membresías",
    grupo: "Cuenta y accesos",
    descripcion: "El rol de cada usuario en este local.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "usuarioId", etiqueta: "usuarioId", tipo: "texto", requerido: true },
      { clave: "usuarioNombre", etiqueta: "usuarioNombre", tipo: "texto", soloLectura: true },
      { clave: "rol", etiqueta: "rol", tipo: "enum", opciones: ["ADMIN", "ENCARGADO", "CAMARERO", "COCINA", "GESTORIA"], requerido: true },
    ],
    cargar: async (localId) => {
      const filas = await prisma.membresia.findMany({
        where: { localId },
        select: { id: true, usuarioId: true, rol: true, usuario: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, usuarioId: f.usuarioId, usuarioNombre: f.usuario.nombre, rol: f.rol }));
    },
    crear: async (localId, datos) => {
      const usuarioId = texto(datos, "usuarioId");
      if (!usuarioId) return { error: "El id de usuario es obligatorio — cópialo de la tabla Usuarios." };
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } });
      if (!usuario) return { error: "No existe ningún usuario con ese id." };
      try {
        await prisma.membresia.create({ data: { localId, usuarioId, rol: texto(datos, "rol") as "ADMIN" | "ENCARGADO" | "CAMARERO" | "COCINA" | "GESTORIA" } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      try {
        const r = await prisma.membresia.updateMany({
          where: { id, localId },
          data: { rol: texto(datos, "rol") as "ADMIN" | "ENCARGADO" | "CAMARERO" | "COCINA" | "GESTORIA" },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      const r = await prisma.membresia.deleteMany({ where: { id, localId } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "zonas",
    etiqueta: "Zonas",
    grupo: "Sala y plano",
    descripcion: "Espacios físicos del local (Terraza, Interior, Barra...).",
    seccionUrl: "mesas",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "orden", etiqueta: "orden", tipo: "numero" },
      { clave: "color", etiqueta: "color", tipo: "enum", opciones: ["neutro", "azul", "ocre", "terracota", "malva", "pizarra"], oculto: true },
      { clave: "puntos", etiqueta: "puntos", tipo: "json" },
    ],
    cargar: (localId) =>
      prisma.zona.findMany({
        where: { localId },
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true, orden: true, color: true, puntos: true },
      }),
    crear: async (localId, datos) => {
      try {
        const puntos = json(datos, "puntos") ?? [
          { x: 40, y: 40 },
          { x: 60, y: 40 },
          { x: 60, y: 60 },
          { x: 40, y: 60 },
        ];
        await prisma.zona.create({
          data: {
            localId,
            nombre: texto(datos, "nombre"),
            orden: numero(datos, "orden", 0),
            color: texto(datos, "color") || "neutro",
            puntos: puntos as object,
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    // Borrar una zona borra en cascada sus mesas (así lo define el
    // esquema) — la propia base de datos es la que impone esa regla, no
    // este editor.
    actualizar: async (localId, id, datos) => {
      try {
        const puntos = json(datos, "puntos");
        const r = await prisma.zona.updateMany({
          where: { id, localId },
          data: { nombre: texto(datos, "nombre"), orden: numero(datos, "orden", 0), color: texto(datos, "color") || "neutro", puntos: (puntos ?? undefined) as object | undefined },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.zona.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "mesas",
    etiqueta: "Mesas",
    grupo: "Sala y plano",
    descripcion: "Cada mesa, su zona, capacidad y posición en el plano.",
    seccionUrl: "mesas",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "zonaId", etiqueta: "zonaId", tipo: "relacion", cargarOpciones: opcionesZonas, requerido: true },
      { clave: "zonaNombre", etiqueta: "zonaNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "numero", etiqueta: "numero", tipo: "texto", requerido: true },
      { clave: "capacidad", etiqueta: "capacidad", tipo: "numero" },
      { clave: "forma", etiqueta: "forma", tipo: "enum", opciones: ["REDONDA", "RECTANGULAR"] },
      { clave: "ancho", etiqueta: "ancho", tipo: "numero", oculto: true },
      { clave: "alto", etiqueta: "alto", tipo: "numero", oculto: true },
      { clave: "posicionX", etiqueta: "posicionX", tipo: "numero", oculto: true },
      { clave: "posicionY", etiqueta: "posicionY", tipo: "numero", oculto: true },
    ],
    cargar: async (localId) => {
      const filas = await prisma.mesa.findMany({
        where: { localId },
        orderBy: [{ zona: { orden: "asc" } }, { numero: "asc" }],
        select: {
          id: true, zonaId: true, numero: true, capacidad: true, forma: true, ancho: true, alto: true,
          posicionX: true, posicionY: true, zona: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({ ...f, zonaNombre: f.zona.nombre, zona: undefined }));
    },
    crear: async (localId, datos) => {
      const zonaId = texto(datos, "zonaId");
      const zona = await prisma.zona.findFirst({ where: { id: zonaId, localId }, select: { id: true } });
      if (!zona) return { error: "Esa zona no existe en este local." };
      try {
        await prisma.mesa.create({
          data: {
            localId, zonaId,
            numero: texto(datos, "numero"),
            capacidad: numero(datos, "capacidad", 2),
            forma: (texto(datos, "forma") || "RECTANGULAR") as "REDONDA" | "RECTANGULAR",
            ancho: numero(datos, "ancho", 90),
            alto: numero(datos, "alto", 90),
            posicionX: numero(datos, "posicionX", 50),
            posicionY: numero(datos, "posicionY", 50),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const zonaId = texto(datos, "zonaId");
      if (zonaId) {
        const zona = await prisma.zona.findFirst({ where: { id: zonaId, localId }, select: { id: true } });
        if (!zona) return { error: "Esa zona no existe en este local." };
      }
      try {
        const r = await prisma.mesa.updateMany({
          where: { id, localId },
          data: {
            zonaId: zonaId || undefined,
            numero: texto(datos, "numero"),
            capacidad: numero(datos, "capacidad", 2),
            forma: (texto(datos, "forma") || "RECTANGULAR") as "REDONDA" | "RECTANGULAR",
            ancho: numero(datos, "ancho", 90),
            alto: numero(datos, "alto", 90),
            posicionX: numero(datos, "posicionX", 50),
            posicionY: numero(datos, "posicionY", 50),
          },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.mesa.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "elementos-plano",
    etiqueta: "Elementos del plano",
    grupo: "Sala y plano",
    descripcion: "Puertas, escaleras y paredes dibujadas en el plano.",
    seccionUrl: "plano",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "tipo", etiqueta: "tipo", tipo: "enum", opciones: ["PUERTA", "ESCALERA", "PARED"], requerido: true },
      { clave: "posicionX", etiqueta: "posicionX", tipo: "numero", oculto: true },
      { clave: "posicionY", etiqueta: "posicionY", tipo: "numero", oculto: true },
      { clave: "ancho", etiqueta: "ancho", tipo: "numero", oculto: true },
      { clave: "alto", etiqueta: "alto", tipo: "numero", oculto: true },
      { clave: "rotacion", etiqueta: "rotacion", tipo: "numero", oculto: true },
    ],
    cargar: (localId) =>
      prisma.elementoPlano.findMany({
        where: { localId },
        select: { id: true, tipo: true, posicionX: true, posicionY: true, ancho: true, alto: true, rotacion: true },
      }),
    crear: async (localId, datos) => {
      try {
        await prisma.elementoPlano.create({
          data: {
            localId,
            tipo: texto(datos, "tipo") as "PUERTA" | "ESCALERA" | "PARED",
            posicionX: numero(datos, "posicionX", 50),
            posicionY: numero(datos, "posicionY", 50),
            ancho: numero(datos, "ancho", 60),
            alto: numero(datos, "alto", 20),
            rotacion: numero(datos, "rotacion", 0),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.elementoPlano.updateMany({
        where: { id, localId },
        data: {
          tipo: texto(datos, "tipo") as "PUERTA" | "ESCALERA" | "PARED",
          posicionX: numero(datos, "posicionX", 50),
          posicionY: numero(datos, "posicionY", 50),
          ancho: numero(datos, "ancho", 60),
          alto: numero(datos, "alto", 20),
          rotacion: numero(datos, "rotacion", 0),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.elementoPlano.deleteMany({ where: { id, localId } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "comandas",
    etiqueta: "Comandas",
    grupo: "Servicio y caja",
    descripcion: "Cada visita de mesa: abierta, enviada a cocina o cobrada.",
    seccionUrl: "plano",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "mesaId", etiqueta: "mesaId", tipo: "relacion", cargarOpciones: opcionesMesas, requerido: true },
      { clave: "mesaNumero", etiqueta: "mesaNumero", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "camareroId", etiqueta: "camareroId", tipo: "relacion", cargarOpciones: opcionesUsuariosDelLocal, requerido: true },
      { clave: "camareroNombre", etiqueta: "camareroNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "estado", etiqueta: "estado", tipo: "enum", opciones: ["ABIERTA", "ENVIADA", "COBRADA"] },
      { clave: "horaApertura", etiqueta: "horaApertura", tipo: "fecha" },
      { clave: "horaCierre", etiqueta: "horaCierre", tipo: "fecha" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.comanda.findMany({
        where: { mesa: { localId } },
        orderBy: { horaApertura: "desc" },
        take: 200,
        select: {
          id: true, mesaId: true, camareroId: true, estado: true, horaApertura: true, horaCierre: true,
          mesa: { select: { numero: true } }, camarero: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id, mesaId: f.mesaId, mesaNumero: f.mesa.numero, camareroId: f.camareroId, camareroNombre: f.camarero.nombre,
        estado: f.estado, horaApertura: f.horaApertura, horaCierre: f.horaCierre,
      }));
    },
    crear: async (localId, datos) => {
      const mesaId = texto(datos, "mesaId");
      const camareroId = texto(datos, "camareroId");
      const mesa = await prisma.mesa.findFirst({ where: { id: mesaId, localId }, select: { id: true } });
      if (!mesa) return { error: "Esa mesa no existe en este local." };
      const usuario = await prisma.usuario.findFirst({ where: { id: camareroId, membresias: { some: { localId } } }, select: { id: true } });
      if (!usuario) return { error: "Ese camarero no tiene acceso a este local." };
      try {
        await prisma.comanda.create({
          data: {
            mesaId, camareroId,
            estado: (texto(datos, "estado") || "ABIERTA") as "ABIERTA" | "ENVIADA" | "COBRADA",
            horaApertura: fecha(datos, "horaApertura") ?? new Date(),
            horaCierre: fecha(datos, "horaCierre"),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      try {
        const r = await prisma.comanda.updateMany({
          where: { id, mesa: { localId } },
          data: {
            estado: (texto(datos, "estado") || "ABIERTA") as "ABIERTA" | "ENVIADA" | "COBRADA",
            horaApertura: fecha(datos, "horaApertura") ?? undefined,
            horaCierre: fecha(datos, "horaCierre"),
          },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.comanda.deleteMany({ where: { id, mesa: { localId } } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "lineas-comanda",
    etiqueta: "Líneas de comanda",
    grupo: "Servicio y caja",
    descripcion: "Cada producto pedido dentro de una comanda.",
    seccionUrl: "plano",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "comandaId", etiqueta: "comandaId", tipo: "relacion", cargarOpciones: opcionesComandas, requerido: true },
      { clave: "productoId", etiqueta: "productoId", tipo: "relacion", cargarOpciones: opcionesProductos, requerido: true },
      { clave: "productoNombre", etiqueta: "productoNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "cantidad", etiqueta: "cantidad", tipo: "numero", requerido: true },
      { clave: "notas", etiqueta: "notas", tipo: "texto" },
      { clave: "estado", etiqueta: "estado", tipo: "enum", opciones: ["PENDIENTE", "COCINA", "SERVIDO"] },
      { clave: "horaEnviada", etiqueta: "horaEnviada", tipo: "fecha" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.lineaComanda.findMany({
        where: { comanda: { mesa: { localId } } },
        orderBy: { id: "desc" },
        take: 300,
        select: { id: true, comandaId: true, productoId: true, cantidad: true, notas: true, estado: true, horaEnviada: true, producto: { select: { nombre: true } } },
      });
      return filas.map((f) => ({
        id: f.id, comandaId: f.comandaId, productoId: f.productoId, productoNombre: f.producto.nombre, cantidad: f.cantidad,
        notas: f.notas, estado: f.estado, horaEnviada: f.horaEnviada,
      }));
    },
    crear: async (localId, datos) => {
      const comandaId = texto(datos, "comandaId");
      const productoId = texto(datos, "productoId");
      const comanda = await prisma.comanda.findFirst({ where: { id: comandaId, mesa: { localId } }, select: { id: true } });
      if (!comanda) return { error: "Esa comanda no existe en este local." };
      const producto = await prisma.producto.findFirst({ where: { id: productoId, localId }, select: { id: true } });
      if (!producto) return { error: "Ese producto no existe en este local." };
      try {
        await prisma.lineaComanda.create({
          data: {
            comandaId, productoId,
            cantidad: numero(datos, "cantidad", 1),
            notas: textoOpcional(datos, "notas"),
            estado: (texto(datos, "estado") || "PENDIENTE") as "PENDIENTE" | "COCINA" | "SERVIDO",
            horaEnviada: fecha(datos, "horaEnviada"),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.lineaComanda.updateMany({
        where: { id, comanda: { mesa: { localId } } },
        data: {
          cantidad: numero(datos, "cantidad", 1),
          notas: textoOpcional(datos, "notas"),
          estado: (texto(datos, "estado") || "PENDIENTE") as "PENDIENTE" | "COCINA" | "SERVIDO",
          horaEnviada: fecha(datos, "horaEnviada"),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.lineaComanda.deleteMany({ where: { id, comanda: { mesa: { localId } } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "tickets",
    etiqueta: "Tickets",
    grupo: "Servicio y caja",
    descripcion: "Cobros ya emitidos, cada uno de una comanda.",
    seccionUrl: "ventas",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "comandaId", etiqueta: "comandaId", tipo: "relacion", cargarOpciones: opcionesComandas, requerido: true },
      { clave: "mesaNumero", etiqueta: "mesaNumero", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "total", etiqueta: "total", tipo: "decimal", requerido: true },
      { clave: "metodoPago", etiqueta: "metodoPago", tipo: "enum", opciones: ["EFECTIVO", "TARJETA", "OTRO"] },
      { clave: "fecha", etiqueta: "fecha", tipo: "fecha" },
      { clave: "cierreCajaId", etiqueta: "cierreCajaId", tipo: "relacion", cargarOpciones: opcionesCierresCaja },
    ],
    cargar: async (localId) => {
      const filas = await prisma.ticket.findMany({
        where: { comanda: { mesa: { localId } } },
        orderBy: { fecha: "desc" },
        take: 300,
        select: { id: true, comandaId: true, total: true, metodoPago: true, fecha: true, cierreCajaId: true, comanda: { select: { mesa: { select: { numero: true } } } } },
      });
      return filas.map((f) => ({
        id: f.id, comandaId: f.comandaId, mesaNumero: f.comanda.mesa.numero, total: Number(f.total), metodoPago: f.metodoPago,
        fecha: f.fecha, cierreCajaId: f.cierreCajaId,
      }));
    },
    crear: async (localId, datos) => {
      const comandaId = texto(datos, "comandaId");
      const comanda = await prisma.comanda.findFirst({ where: { id: comandaId, mesa: { localId } }, select: { id: true } });
      if (!comanda) return { error: "Esa comanda no existe en este local." };
      try {
        await prisma.ticket.create({
          data: {
            comandaId,
            total: numero(datos, "total", 0),
            metodoPago: (texto(datos, "metodoPago") || "EFECTIVO") as "EFECTIVO" | "TARJETA" | "OTRO",
            fecha: fecha(datos, "fecha") ?? new Date(),
            cierreCajaId: textoOpcional(datos, "cierreCajaId"),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      try {
        const r = await prisma.ticket.updateMany({
          where: { id, comanda: { mesa: { localId } } },
          data: {
            total: numero(datos, "total", 0),
            metodoPago: (texto(datos, "metodoPago") || "EFECTIVO") as "EFECTIVO" | "TARJETA" | "OTRO",
            fecha: fecha(datos, "fecha") ?? undefined,
            cierreCajaId: textoOpcional(datos, "cierreCajaId"),
          },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      const r = await prisma.ticket.deleteMany({ where: { id, comanda: { mesa: { localId } } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "cierres-caja",
    etiqueta: "Cierres de caja",
    grupo: "Servicio y caja",
    descripcion: "Arqueos ya hechos: esperado, contado y diferencia.",
    seccionUrl: "caja",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "fecha", etiqueta: "fecha", tipo: "fecha" },
      { clave: "totalEsperado", etiqueta: "totalEsperado", tipo: "decimal", requerido: true },
      { clave: "totalContado", etiqueta: "totalContado", tipo: "decimal", requerido: true },
      { clave: "diferencia", etiqueta: "diferencia", tipo: "decimal", requerido: true },
    ],
    cargar: async (localId) => {
      const filas = await prisma.cierreCaja.findMany({ where: { localId }, orderBy: { fecha: "desc" } });
      return filas.map((f) => ({ id: f.id, fecha: f.fecha, totalEsperado: Number(f.totalEsperado), totalContado: Number(f.totalContado), diferencia: Number(f.diferencia) }));
    },
    crear: async (localId, datos) => {
      try {
        const totalEsperado = numero(datos, "totalEsperado", 0);
        const totalContado = numero(datos, "totalContado", 0);
        await prisma.cierreCaja.create({
          data: { localId, fecha: fecha(datos, "fecha") ?? new Date(), totalEsperado, totalContado, diferencia: totalContado - totalEsperado },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const totalEsperado = numero(datos, "totalEsperado", 0);
      const totalContado = numero(datos, "totalContado", 0);
      const r = await prisma.cierreCaja.updateMany({
        where: { id, localId },
        data: { fecha: fecha(datos, "fecha") ?? undefined, totalEsperado, totalContado, diferencia: totalContado - totalEsperado },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.cierreCaja.deleteMany({ where: { id, localId } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "reservas",
    etiqueta: "Reservas",
    grupo: "Servicio y caja",
    descripcion: "Reservas de mesa, pasadas y futuras.",
    seccionUrl: "plano",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "telefono", etiqueta: "telefono", tipo: "texto" },
      { clave: "personas", etiqueta: "personas", tipo: "numero", requerido: true },
      { clave: "hora", etiqueta: "hora", tipo: "fecha", requerido: true },
      { clave: "mesaId", etiqueta: "mesaId", tipo: "relacion", cargarOpciones: opcionesMesas },
      { clave: "mesaNumero", etiqueta: "mesaNumero", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "notas", etiqueta: "notas", tipo: "texto" },
      { clave: "createdAt", etiqueta: "createdAt", tipo: "fecha", soloLectura: true },
    ],
    cargar: async (localId) => {
      const filas = await prisma.reserva.findMany({
        where: { localId },
        orderBy: { hora: "desc" },
        select: { id: true, nombre: true, telefono: true, personas: true, hora: true, mesaId: true, notas: true, createdAt: true, mesa: { select: { numero: true } } },
      });
      return filas.map((f) => ({ id: f.id, nombre: f.nombre, telefono: f.telefono, personas: f.personas, hora: f.hora, mesaId: f.mesaId, mesaNumero: f.mesa?.numero ?? null, notas: f.notas, createdAt: f.createdAt }));
    },
    crear: async (localId, datos) => {
      try {
        await prisma.reserva.create({
          data: {
            localId,
            nombre: texto(datos, "nombre"),
            telefono: textoOpcional(datos, "telefono"),
            personas: numero(datos, "personas", 1),
            hora: fecha(datos, "hora") ?? new Date(),
            mesaId: textoOpcional(datos, "mesaId"),
            notas: textoOpcional(datos, "notas"),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.reserva.updateMany({
        where: { id, localId },
        data: {
          nombre: texto(datos, "nombre"),
          telefono: textoOpcional(datos, "telefono"),
          personas: numero(datos, "personas", 1),
          hora: fecha(datos, "hora") ?? undefined,
          mesaId: textoOpcional(datos, "mesaId"),
          notas: textoOpcional(datos, "notas"),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.reserva.deleteMany({ where: { id, localId } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "categorias-carta",
    etiqueta: "Categorías de carta",
    grupo: "Productos",
    descripcion: "Agrupación de productos en la carta.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "orden", etiqueta: "orden", tipo: "numero" },
    ],
    cargar: (localId) => prisma.categoriaCarta.findMany({ where: { localId }, orderBy: { orden: "asc" }, select: { id: true, nombre: true, orden: true } }),
    crear: async (localId, datos) => {
      try {
        await prisma.categoriaCarta.create({ data: { localId, nombre: texto(datos, "nombre"), orden: numero(datos, "orden", 0) } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.categoriaCarta.updateMany({ where: { id, localId }, data: { nombre: texto(datos, "nombre"), orden: numero(datos, "orden", 0) } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.categoriaCarta.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "productos",
    etiqueta: "Productos",
    grupo: "Productos",
    descripcion: "La carta: lo que se vende, con su precio y tipo. Lo que sale en los comanderos.",
    seccionUrl: "productos",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "categoriaId", etiqueta: "categoriaId", tipo: "relacion", cargarOpciones: opcionesCategorias, requerido: true },
      { clave: "categoriaNombre", etiqueta: "categoriaNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "tipo", etiqueta: "tipo", tipo: "enum", opciones: ["COMIDA", "BEBIDA", "CONSUMIBLE"] },
      { clave: "precioVenta", etiqueta: "precioVenta", tipo: "decimal", requerido: true },
      { clave: "visibleEnCarta", etiqueta: "visibleEnCarta", tipo: "booleano" },
      { clave: "alergenos", etiqueta: "alergenos (separados por coma)", tipo: "lista" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.producto.findMany({
        where: { localId },
        orderBy: { nombre: "asc" },
        select: { id: true, categoriaId: true, nombre: true, tipo: true, precioVenta: true, visibleEnCarta: true, alergenos: true, categoria: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, categoriaId: f.categoriaId, nombre: f.nombre, categoriaNombre: f.categoria.nombre, tipo: f.tipo, precioVenta: Number(f.precioVenta), visibleEnCarta: f.visibleEnCarta, alergenos: f.alergenos }));
    },
    crear: async (localId, datos) => {
      const categoriaId = texto(datos, "categoriaId");
      const categoria = await prisma.categoriaCarta.findFirst({ where: { id: categoriaId, localId }, select: { id: true } });
      if (!categoria) return { error: "Esa categoría no existe en este local." };
      try {
        await prisma.producto.create({
          data: {
            localId, categoriaId,
            nombre: texto(datos, "nombre"),
            tipo: (texto(datos, "tipo") || "COMIDA") as "COMIDA" | "BEBIDA" | "CONSUMIBLE",
            precioVenta: numero(datos, "precioVenta", 0),
            visibleEnCarta: booleano(datos, "visibleEnCarta", true),
            alergenos: lista(datos, "alergenos"),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const categoriaId = texto(datos, "categoriaId");
      if (categoriaId) {
        const categoria = await prisma.categoriaCarta.findFirst({ where: { id: categoriaId, localId }, select: { id: true } });
        if (!categoria) return { error: "Esa categoría no existe en este local." };
      }
      const r = await prisma.producto.updateMany({
        where: { id, localId },
        data: {
          categoriaId: categoriaId || undefined,
          nombre: texto(datos, "nombre"),
          tipo: (texto(datos, "tipo") || "COMIDA") as "COMIDA" | "BEBIDA" | "CONSUMIBLE",
          precioVenta: numero(datos, "precioVenta", 0),
          visibleEnCarta: booleano(datos, "visibleEnCarta", true),
          alergenos: lista(datos, "alergenos"),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.producto.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "receta-lineas",
    etiqueta: "Líneas de escandallo",
    grupo: "Escandallos",
    descripcion: "Las referencias de inventario que componen cada producto — el escandallo.",
    seccionUrl: "productos",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "productoId", etiqueta: "productoId", tipo: "relacion", cargarOpciones: opcionesProductos, requerido: true },
      { clave: "productoNombre", etiqueta: "productoNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "ingredienteId", etiqueta: "ingredienteId", tipo: "relacion", cargarOpciones: opcionesIngredientes, requerido: true },
      { clave: "ingredienteNombre", etiqueta: "ingredienteNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "cantidad", etiqueta: "cantidad", tipo: "decimal", requerido: true },
    ],
    cargar: async (localId) => {
      const filas = await prisma.recetaLinea.findMany({
        where: { producto: { localId } },
        select: { id: true, productoId: true, ingredienteId: true, cantidad: true, producto: { select: { nombre: true } }, ingrediente: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, productoId: f.productoId, productoNombre: f.producto.nombre, ingredienteId: f.ingredienteId, ingredienteNombre: f.ingrediente.nombre, cantidad: Number(f.cantidad) }));
    },
    crear: async (localId, datos) => {
      const productoId = texto(datos, "productoId");
      const producto = await prisma.producto.findFirst({ where: { id: productoId, localId }, select: { id: true } });
      if (!producto) return { error: "Ese producto no existe en este local." };
      try {
        await prisma.recetaLinea.create({ data: { productoId, ingredienteId: texto(datos, "ingredienteId"), cantidad: numero(datos, "cantidad", 0) } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.recetaLinea.updateMany({
        where: { id, producto: { localId } },
        data: { cantidad: numero(datos, "cantidad", 0) },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.recetaLinea.deleteMany({ where: { id, producto: { localId } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "ingredientes",
    etiqueta: "Ingredientes",
    grupo: "Ingredientes",
    descripcion: "Referencias de inventario: stock, mínimos/máximos y coste.",
    seccionUrl: "inventario",
    // Filtro rápido por tipo (comida/bebida/consumible) en vez de tres
    // tablas separadas — es el mismo Ingrediente con un campo distinto, no
    // hace falta duplicar la definición para poder verlos por separado.
    filtroRapido: "tipo",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "tipo", etiqueta: "tipo", tipo: "enum", opciones: ["COMIDA", "BEBIDA", "CONSUMIBLE"] },
      { clave: "unidadMedida", etiqueta: "unidadMedida", tipo: "texto", requerido: true },
      { clave: "stockAlmacen", etiqueta: "stockAlmacen", tipo: "decimal" },
      { clave: "stockBarra", etiqueta: "stockBarra", tipo: "decimal" },
      { clave: "stockMinimoBarra", etiqueta: "stockMinimoBarra", tipo: "decimal" },
      { clave: "stockMaximoBarra", etiqueta: "stockMaximoBarra", tipo: "decimal" },
      { clave: "costeUnitario", etiqueta: "costeUnitario", tipo: "decimal" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.ingrediente.findMany({ where: { localId }, orderBy: { nombre: "asc" } });
      return filas.map((f) => ({
        id: f.id, nombre: f.nombre, tipo: f.tipo, unidadMedida: f.unidadMedida,
        stockAlmacen: Number(f.stockAlmacen), stockBarra: Number(f.stockBarra),
        stockMinimoBarra: Number(f.stockMinimoBarra), stockMaximoBarra: Number(f.stockMaximoBarra),
        costeUnitario: Number(f.costeUnitario),
      }));
    },
    crear: async (localId, datos) => {
      try {
        await prisma.ingrediente.create({
          data: {
            localId,
            nombre: texto(datos, "nombre"),
            tipo: (texto(datos, "tipo") || "CONSUMIBLE") as "COMIDA" | "BEBIDA" | "CONSUMIBLE",
            unidadMedida: texto(datos, "unidadMedida"),
            stockAlmacen: numero(datos, "stockAlmacen", 0),
            stockBarra: numero(datos, "stockBarra", 0),
            stockMinimoBarra: numero(datos, "stockMinimoBarra", 0),
            stockMaximoBarra: numero(datos, "stockMaximoBarra", 0),
            costeUnitario: numero(datos, "costeUnitario", 0),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.ingrediente.updateMany({
        where: { id, localId },
        data: {
          nombre: texto(datos, "nombre"),
          tipo: (texto(datos, "tipo") || "CONSUMIBLE") as "COMIDA" | "BEBIDA" | "CONSUMIBLE",
          unidadMedida: texto(datos, "unidadMedida"),
          stockAlmacen: numero(datos, "stockAlmacen", 0),
          stockBarra: numero(datos, "stockBarra", 0),
          stockMinimoBarra: numero(datos, "stockMinimoBarra", 0),
          stockMaximoBarra: numero(datos, "stockMaximoBarra", 0),
          costeUnitario: numero(datos, "costeUnitario", 0),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.ingrediente.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "movimientos-stock",
    etiqueta: "Movimientos de stock",
    grupo: "Proveedores e inventario",
    descripcion: "Historial de entradas, salidas, mermas y traspasos.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "ingredienteId", etiqueta: "ingredienteId", tipo: "relacion", cargarOpciones: opcionesIngredientes, requerido: true },
      { clave: "ingredienteNombre", etiqueta: "ingredienteNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "tipo", etiqueta: "tipo", tipo: "enum", opciones: ["ENTRADA", "SALIDA", "MERMA", "TRASPASO"], requerido: true },
      { clave: "cantidad", etiqueta: "cantidad", tipo: "decimal", requerido: true },
      { clave: "fecha", etiqueta: "fecha", tipo: "fecha" },
      { clave: "referencia", etiqueta: "referencia", tipo: "texto" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.movimientoStock.findMany({
        where: { ingrediente: { localId } },
        orderBy: { fecha: "desc" },
        take: 300,
        select: { id: true, ingredienteId: true, tipo: true, cantidad: true, fecha: true, referencia: true, ingrediente: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, ingredienteId: f.ingredienteId, ingredienteNombre: f.ingrediente.nombre, tipo: f.tipo, cantidad: Number(f.cantidad), fecha: f.fecha, referencia: f.referencia }));
    },
    crear: async (localId, datos) => {
      const ingredienteId = texto(datos, "ingredienteId");
      const ingrediente = await prisma.ingrediente.findFirst({ where: { id: ingredienteId, localId }, select: { id: true } });
      if (!ingrediente) return { error: "Ese ingrediente no existe en este local." };
      try {
        await prisma.movimientoStock.create({
          data: {
            ingredienteId,
            tipo: texto(datos, "tipo") as "ENTRADA" | "SALIDA" | "MERMA" | "TRASPASO",
            cantidad: numero(datos, "cantidad", 0),
            fecha: fecha(datos, "fecha") ?? new Date(),
            referencia: textoOpcional(datos, "referencia"),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.movimientoStock.updateMany({
        where: { id, ingrediente: { localId } },
        data: {
          tipo: texto(datos, "tipo") as "ENTRADA" | "SALIDA" | "MERMA" | "TRASPASO",
          cantidad: numero(datos, "cantidad", 0),
          fecha: fecha(datos, "fecha") ?? undefined,
          referencia: textoOpcional(datos, "referencia"),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.movimientoStock.deleteMany({ where: { id, ingrediente: { localId } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "proveedores",
    etiqueta: "Proveedores",
    grupo: "Proveedores e inventario",
    descripcion: "Altas de proveedor y sus datos de contacto.",
    seccionUrl: "proveedores",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "nombre", etiqueta: "nombre", tipo: "texto", requerido: true },
      { clave: "contacto", etiqueta: "contacto", tipo: "texto" },
      { clave: "productosHabituales", etiqueta: "productosHabituales", tipo: "textoLargo" },
    ],
    cargar: (localId) => prisma.proveedor.findMany({ where: { localId }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, contacto: true, productosHabituales: true } }),
    crear: async (localId, datos) => {
      try {
        await prisma.proveedor.create({ data: { localId, nombre: texto(datos, "nombre"), contacto: textoOpcional(datos, "contacto"), productosHabituales: textoOpcional(datos, "productosHabituales") } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.proveedor.updateMany({
        where: { id, localId },
        data: { nombre: texto(datos, "nombre"), contacto: textoOpcional(datos, "contacto"), productosHabituales: textoOpcional(datos, "productosHabituales") },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.proveedor.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "pedidos-proveedor",
    etiqueta: "Pedidos a proveedor",
    grupo: "Proveedores e inventario",
    descripcion: "Cada pedido lanzado, su proveedor y estado.",
    seccionUrl: "inventario/pedidos",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "proveedorId", etiqueta: "proveedorId", tipo: "relacion", cargarOpciones: opcionesProveedores, requerido: true },
      { clave: "proveedorNombre", etiqueta: "proveedorNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "fecha", etiqueta: "fecha", tipo: "fecha" },
      { clave: "estado", etiqueta: "estado", tipo: "enum", opciones: ["BORRADOR", "ENVIADO", "RECIBIDO"] },
    ],
    cargar: async (localId) => {
      const filas = await prisma.pedidoProveedor.findMany({
        where: { proveedor: { localId } },
        orderBy: { fecha: "desc" },
        select: { id: true, proveedorId: true, fecha: true, estado: true, proveedor: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, proveedorId: f.proveedorId, proveedorNombre: f.proveedor.nombre, fecha: f.fecha, estado: f.estado }));
    },
    crear: async (localId, datos) => {
      const proveedorId = texto(datos, "proveedorId");
      const proveedor = await prisma.proveedor.findFirst({ where: { id: proveedorId, localId }, select: { id: true } });
      if (!proveedor) return { error: "Ese proveedor no existe en este local." };
      try {
        await prisma.pedidoProveedor.create({ data: { proveedorId, fecha: fecha(datos, "fecha") ?? new Date(), estado: (texto(datos, "estado") || "BORRADOR") as "BORRADOR" | "ENVIADO" | "RECIBIDO" } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.pedidoProveedor.updateMany({
        where: { id, proveedor: { localId } },
        data: { fecha: fecha(datos, "fecha") ?? undefined, estado: (texto(datos, "estado") || "BORRADOR") as "BORRADOR" | "ENVIADO" | "RECIBIDO" },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.pedidoProveedor.deleteMany({ where: { id, proveedor: { localId } } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "pedidos-proveedor-lineas",
    etiqueta: "Líneas de pedido",
    grupo: "Proveedores e inventario",
    descripcion: "Qué referencia y cuánta cantidad lleva cada pedido.",
    seccionUrl: "inventario/pedidos",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "pedidoId", etiqueta: "pedidoId", tipo: "relacion", cargarOpciones: opcionesPedidos, requerido: true },
      { clave: "ingredienteId", etiqueta: "ingredienteId", tipo: "relacion", cargarOpciones: opcionesIngredientes, requerido: true },
      { clave: "ingredienteNombre", etiqueta: "ingredienteNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "cantidad", etiqueta: "cantidad", tipo: "decimal", requerido: true },
      { clave: "precioUnitario", etiqueta: "precioUnitario", tipo: "decimal" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.pedidoProveedorLinea.findMany({
        where: { pedido: { proveedor: { localId } } },
        select: { id: true, pedidoId: true, ingredienteId: true, cantidad: true, precioUnitario: true, ingrediente: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, pedidoId: f.pedidoId, ingredienteId: f.ingredienteId, ingredienteNombre: f.ingrediente.nombre, cantidad: Number(f.cantidad), precioUnitario: Number(f.precioUnitario) }));
    },
    crear: async (localId, datos) => {
      const pedidoId = texto(datos, "pedidoId");
      const pedido = await prisma.pedidoProveedor.findFirst({ where: { id: pedidoId, proveedor: { localId } }, select: { id: true } });
      if (!pedido) return { error: "Ese pedido no existe en este local." };
      try {
        await prisma.pedidoProveedorLinea.create({ data: { pedidoId, ingredienteId: texto(datos, "ingredienteId"), cantidad: numero(datos, "cantidad", 0), precioUnitario: numero(datos, "precioUnitario", 0) } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.pedidoProveedorLinea.updateMany({
        where: { id, pedido: { proveedor: { localId } } },
        data: { cantidad: numero(datos, "cantidad", 0), precioUnitario: numero(datos, "precioUnitario", 0) },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.pedidoProveedorLinea.deleteMany({ where: { id, pedido: { proveedor: { localId } } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "recepciones",
    etiqueta: "Recepciones",
    grupo: "Proveedores e inventario",
    descripcion: "Albaranes recibidos de cada pedido.",
    seccionUrl: "inventario/pedidos",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "pedidoId", etiqueta: "pedidoId", tipo: "relacion", cargarOpciones: opcionesPedidos, requerido: true },
      { clave: "proveedorNombre", etiqueta: "proveedorNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "fecha", etiqueta: "fecha", tipo: "fecha" },
      { clave: "numeroAlbaran", etiqueta: "numeroAlbaran", tipo: "texto" },
      { clave: "incidencias", etiqueta: "incidencias", tipo: "textoLargo" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.recepcion.findMany({
        where: { pedido: { proveedor: { localId } } },
        orderBy: { fecha: "desc" },
        select: { id: true, pedidoId: true, fecha: true, numeroAlbaran: true, incidencias: true, pedido: { select: { proveedor: { select: { nombre: true } } } } },
      });
      return filas.map((f) => ({ id: f.id, pedidoId: f.pedidoId, proveedorNombre: f.pedido.proveedor.nombre, fecha: f.fecha, numeroAlbaran: f.numeroAlbaran, incidencias: f.incidencias }));
    },
    crear: async (localId, datos) => {
      const pedidoId = texto(datos, "pedidoId");
      const pedido = await prisma.pedidoProveedor.findFirst({ where: { id: pedidoId, proveedor: { localId } }, select: { id: true } });
      if (!pedido) return { error: "Ese pedido no existe en este local." };
      try {
        await prisma.recepcion.create({ data: { pedidoId, fecha: fecha(datos, "fecha") ?? new Date(), numeroAlbaran: textoOpcional(datos, "numeroAlbaran"), incidencias: textoOpcional(datos, "incidencias") } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.recepcion.updateMany({
        where: { id, pedido: { proveedor: { localId } } },
        data: { fecha: fecha(datos, "fecha") ?? undefined, numeroAlbaran: textoOpcional(datos, "numeroAlbaran"), incidencias: textoOpcional(datos, "incidencias") },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.recepcion.deleteMany({ where: { id, pedido: { proveedor: { localId } } } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "recepcion-lineas",
    etiqueta: "Líneas de recepción",
    grupo: "Proveedores e inventario",
    descripcion: "Cantidad y precio real de cada referencia recibida.",
    seccionUrl: "inventario/pedidos",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "recepcionId", etiqueta: "recepcionId", tipo: "relacion", cargarOpciones: opcionesRecepciones, requerido: true },
      { clave: "ingredienteId", etiqueta: "ingredienteId", tipo: "relacion", cargarOpciones: opcionesIngredientes, requerido: true },
      { clave: "ingredienteNombre", etiqueta: "ingredienteNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "cantidadRecibida", etiqueta: "cantidadRecibida", tipo: "decimal", requerido: true },
      { clave: "precioUnitario", etiqueta: "precioUnitario", tipo: "decimal" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.recepcionLinea.findMany({
        where: { recepcion: { pedido: { proveedor: { localId } } } },
        select: { id: true, recepcionId: true, ingredienteId: true, cantidadRecibida: true, precioUnitario: true, ingrediente: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, recepcionId: f.recepcionId, ingredienteId: f.ingredienteId, ingredienteNombre: f.ingrediente.nombre, cantidadRecibida: Number(f.cantidadRecibida), precioUnitario: Number(f.precioUnitario) }));
    },
    crear: async (localId, datos) => {
      const recepcionId = texto(datos, "recepcionId");
      const recepcion = await prisma.recepcion.findFirst({ where: { id: recepcionId, pedido: { proveedor: { localId } } }, select: { id: true } });
      if (!recepcion) return { error: "Esa recepción no existe en este local." };
      try {
        await prisma.recepcionLinea.create({ data: { recepcionId, ingredienteId: texto(datos, "ingredienteId"), cantidadRecibida: numero(datos, "cantidadRecibida", 0), precioUnitario: numero(datos, "precioUnitario", 0) } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.recepcionLinea.updateMany({
        where: { id, recepcion: { pedido: { proveedor: { localId } } } },
        data: { cantidadRecibida: numero(datos, "cantidadRecibida", 0), precioUnitario: numero(datos, "precioUnitario", 0) },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.recepcionLinea.deleteMany({ where: { id, recepcion: { pedido: { proveedor: { localId } } } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "reposiciones",
    etiqueta: "Reposiciones",
    grupo: "Proveedores e inventario",
    descripcion: "Cada tanda de reposición diaria almacén -> barra.",
    seccionUrl: "inventario/reposicion",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "fecha", etiqueta: "fecha", tipo: "fecha" },
      { clave: "estado", etiqueta: "estado", tipo: "enum", opciones: ["PENDIENTE", "COMPLETADA"] },
    ],
    cargar: (localId) => prisma.reposicion.findMany({ where: { localId }, orderBy: { fecha: "desc" }, select: { id: true, fecha: true, estado: true } }),
    crear: async (localId, datos) => {
      try {
        await prisma.reposicion.create({ data: { localId, fecha: fecha(datos, "fecha") ?? new Date(), estado: (texto(datos, "estado") || "PENDIENTE") as "PENDIENTE" | "COMPLETADA" } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.reposicion.updateMany({ where: { id, localId }, data: { fecha: fecha(datos, "fecha") ?? undefined, estado: (texto(datos, "estado") || "PENDIENTE") as "PENDIENTE" | "COMPLETADA" } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.reposicion.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "reposicion-lineas",
    etiqueta: "Líneas de reposición",
    grupo: "Proveedores e inventario",
    descripcion: "Qué referencia y cuánto se llevó a barra en cada reposición.",
    seccionUrl: "inventario/reposicion",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "reposicionId", etiqueta: "reposicionId", tipo: "relacion", cargarOpciones: opcionesReposiciones, requerido: true },
      { clave: "ingredienteId", etiqueta: "ingredienteId", tipo: "relacion", cargarOpciones: opcionesIngredientes, requerido: true },
      { clave: "ingredienteNombre", etiqueta: "ingredienteNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "cantidadSugerida", etiqueta: "cantidadSugerida", tipo: "decimal", requerido: true },
      { clave: "cantidadLlevada", etiqueta: "cantidadLlevada", tipo: "decimal" },
      { clave: "completada", etiqueta: "completada", tipo: "booleano" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.reposicionLinea.findMany({
        where: { reposicion: { localId } },
        select: { id: true, reposicionId: true, ingredienteId: true, cantidadSugerida: true, cantidadLlevada: true, completada: true, ingrediente: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, reposicionId: f.reposicionId, ingredienteId: f.ingredienteId, ingredienteNombre: f.ingrediente.nombre, cantidadSugerida: Number(f.cantidadSugerida), cantidadLlevada: Number(f.cantidadLlevada), completada: f.completada }));
    },
    crear: async (localId, datos) => {
      const reposicionId = texto(datos, "reposicionId");
      const reposicion = await prisma.reposicion.findFirst({ where: { id: reposicionId, localId }, select: { id: true } });
      if (!reposicion) return { error: "Esa reposición no existe en este local." };
      try {
        await prisma.reposicionLinea.create({
          data: {
            reposicionId, ingredienteId: texto(datos, "ingredienteId"),
            cantidadSugerida: numero(datos, "cantidadSugerida", 0),
            cantidadLlevada: numero(datos, "cantidadLlevada", 0),
            completada: booleano(datos, "completada", false),
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.reposicionLinea.updateMany({
        where: { id, reposicion: { localId } },
        data: {
          cantidadSugerida: numero(datos, "cantidadSugerida", 0),
          cantidadLlevada: numero(datos, "cantidadLlevada", 0),
          completada: booleano(datos, "completada", false),
        },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.reposicionLinea.deleteMany({ where: { id, reposicion: { localId } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "empleados",
    etiqueta: "Empleados",
    grupo: "Equipo y gestoría",
    descripcion: "Ficha laboral básica de cada empleado.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "usuarioId", etiqueta: "usuarioId", tipo: "relacion", cargarOpciones: opcionesUsuariosDelLocal, requerido: true },
      { clave: "usuarioNombre", etiqueta: "usuarioNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "dniNie", etiqueta: "dniNie", tipo: "texto", requerido: true },
      { clave: "iban", etiqueta: "iban", tipo: "texto" },
      { clave: "tipoContrato", etiqueta: "tipoContrato", tipo: "texto", requerido: true },
      { clave: "salarioBase", etiqueta: "salarioBase", tipo: "decimal", requerido: true },
    ],
    cargar: async (localId) => {
      const filas = await prisma.empleado.findMany({
        where: { localId },
        select: { id: true, usuarioId: true, dniNie: true, iban: true, tipoContrato: true, salarioBase: true, usuario: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, usuarioId: f.usuarioId, usuarioNombre: f.usuario.nombre, dniNie: f.dniNie, iban: f.iban, tipoContrato: f.tipoContrato, salarioBase: Number(f.salarioBase) }));
    },
    crear: async (localId, datos) => {
      const usuarioId = texto(datos, "usuarioId");
      const usuario = await prisma.usuario.findFirst({ where: { id: usuarioId, membresias: { some: { localId } } }, select: { id: true } });
      if (!usuario) return { error: "Ese usuario no tiene acceso a este local." };
      try {
        await prisma.empleado.create({
          data: { localId, usuarioId, dniNie: texto(datos, "dniNie"), iban: textoOpcional(datos, "iban"), tipoContrato: texto(datos, "tipoContrato"), salarioBase: numero(datos, "salarioBase", 0) },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      try {
        const r = await prisma.empleado.updateMany({
          where: { id, localId },
          data: { dniNie: texto(datos, "dniNie"), iban: textoOpcional(datos, "iban"), tipoContrato: texto(datos, "tipoContrato"), salarioBase: numero(datos, "salarioBase", 0) },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      try {
        const r = await prisma.empleado.deleteMany({ where: { id, localId } });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
  },
  {
    slug: "turnos",
    etiqueta: "Turnos",
    grupo: "Equipo y gestoría",
    descripcion: "Fichajes de entrada y salida de cada empleado.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "empleadoId", etiqueta: "empleadoId", tipo: "relacion", cargarOpciones: opcionesEmpleados, requerido: true },
      { clave: "empleadoNombre", etiqueta: "empleadoNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "horaEntrada", etiqueta: "horaEntrada", tipo: "fecha", requerido: true },
      { clave: "horaSalida", etiqueta: "horaSalida", tipo: "fecha" },
    ],
    cargar: async (localId) => {
      const filas = await prisma.turno.findMany({
        where: { empleado: { localId } },
        orderBy: { horaEntrada: "desc" },
        take: 300,
        select: { id: true, empleadoId: true, horaEntrada: true, horaSalida: true, empleado: { select: { usuario: { select: { nombre: true } } } } },
      });
      return filas.map((f) => ({ id: f.id, empleadoId: f.empleadoId, empleadoNombre: f.empleado.usuario.nombre, horaEntrada: f.horaEntrada, horaSalida: f.horaSalida }));
    },
    crear: async (localId, datos) => {
      const empleadoId = texto(datos, "empleadoId");
      const empleado = await prisma.empleado.findFirst({ where: { id: empleadoId, localId }, select: { id: true } });
      if (!empleado) return { error: "Ese empleado no existe en este local." };
      try {
        await prisma.turno.create({ data: { empleadoId, horaEntrada: fecha(datos, "horaEntrada") ?? new Date(), horaSalida: fecha(datos, "horaSalida") } });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      const r = await prisma.turno.updateMany({
        where: { id, empleado: { localId } },
        data: { horaEntrada: fecha(datos, "horaEntrada") ?? undefined, horaSalida: fecha(datos, "horaSalida") },
      });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
    borrar: async (localId, id) => {
      const r = await prisma.turno.deleteMany({ where: { id, empleado: { localId } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
  {
    slug: "nominas",
    etiqueta: "Nóminas",
    grupo: "Equipo y gestoría",
    descripcion: "Nómina mensual de cada empleado.",
    campos: [
      { clave: "id", etiqueta: "id", tipo: "id", soloLectura: true, oculto: true },
      { clave: "empleadoId", etiqueta: "empleadoId", tipo: "relacion", cargarOpciones: opcionesEmpleados, requerido: true },
      { clave: "empleadoNombre", etiqueta: "empleadoNombre", tipo: "texto", soloLectura: true, oculto: true },
      { clave: "periodo", etiqueta: "periodo (AAAA-MM)", tipo: "texto", requerido: true },
      { clave: "bruto", etiqueta: "bruto", tipo: "decimal", requerido: true },
      { clave: "deducciones", etiqueta: "deducciones", tipo: "decimal" },
      { clave: "neto", etiqueta: "neto", tipo: "decimal", requerido: true },
      { clave: "estado", etiqueta: "estado", tipo: "enum", opciones: ["PENDIENTE", "PAGADA"] },
    ],
    cargar: async (localId) => {
      const filas = await prisma.nomina.findMany({
        where: { empleado: { localId } },
        orderBy: { periodo: "desc" },
        select: { id: true, empleadoId: true, periodo: true, bruto: true, deducciones: true, neto: true, estado: true, empleado: { select: { usuario: { select: { nombre: true } } } } },
      });
      return filas.map((f) => ({ id: f.id, empleadoId: f.empleadoId, empleadoNombre: f.empleado.usuario.nombre, periodo: f.periodo, bruto: Number(f.bruto), deducciones: Number(f.deducciones), neto: Number(f.neto), estado: f.estado }));
    },
    crear: async (localId, datos) => {
      const empleadoId = texto(datos, "empleadoId");
      const empleado = await prisma.empleado.findFirst({ where: { id: empleadoId, localId }, select: { id: true } });
      if (!empleado) return { error: "Ese empleado no existe en este local." };
      try {
        await prisma.nomina.create({
          data: {
            empleadoId, periodo: texto(datos, "periodo"),
            bruto: numero(datos, "bruto", 0), deducciones: numero(datos, "deducciones", 0), neto: numero(datos, "neto", 0),
            estado: (texto(datos, "estado") || "PENDIENTE") as "PENDIENTE" | "PAGADA",
          },
        });
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    actualizar: async (localId, id, datos) => {
      try {
        const r = await prisma.nomina.updateMany({
          where: { id, empleado: { localId } },
          data: {
            periodo: texto(datos, "periodo"),
            bruto: numero(datos, "bruto", 0), deducciones: numero(datos, "deducciones", 0), neto: numero(datos, "neto", 0),
            estado: (texto(datos, "estado") || "PENDIENTE") as "PENDIENTE" | "PAGADA",
          },
        });
        if (r.count === 0) return { error: "No encontrado." };
        return {};
      } catch (e) {
        return manejarError(e);
      }
    },
    borrar: async (localId, id) => {
      const r = await prisma.nomina.deleteMany({ where: { id, empleado: { localId } } });
      if (r.count === 0) return { error: "No encontrado." };
      return {};
    },
  },
];

export function buscarTabla(slug: string): DefinicionTabla | undefined {
  return TABLAS.find((t) => t.slug === slug);
}
