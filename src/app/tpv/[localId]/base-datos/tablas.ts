import { prisma } from "@/lib/prisma";

export type FilaTabla = Record<string, unknown>;

export type DefinicionTabla = {
  slug: string;
  etiqueta: string;
  grupo: string;
  descripcion: string;
  // Ruta (relativa al local) de la sección donde se gestiona esta tabla de
  // verdad, si existe una — el listado raw de aquí siempre es de solo
  // lectura, para editar se manda ahí.
  seccionUrl?: string;
  columnas: string[];
  cargar: (localId: string) => Promise<FilaTabla[]>;
};

// Cada tabla vive colgada del local por un camino distinto — unas tienen
// localId directo, otras solo llegan a él a través de dos o tres relaciones
// (p. ej. una línea de recepción cuelga de recepción -> pedido -> proveedor
// -> local). Este archivo es el único sitio que conoce esos caminos.
export const TABLAS: DefinicionTabla[] = [
  {
    slug: "local",
    etiqueta: "Local",
    grupo: "Local",
    descripcion: "Datos del propio local y su apariencia.",
    seccionUrl: "ajustes",
    columnas: ["id", "nombre", "direccion", "zonaHoraria", "createdAt", "planoFormato", "planoAlto", "tema", "colorMarca"],
    cargar: (localId) =>
      prisma.local.findMany({
        where: { id: localId },
        select: {
          id: true,
          nombre: true,
          direccion: true,
          zonaHoraria: true,
          createdAt: true,
          planoFormato: true,
          planoAlto: true,
          tema: true,
          colorMarca: true,
        },
      }),
  },
  {
    slug: "usuarios",
    etiqueta: "Usuarios",
    grupo: "Cuenta y accesos",
    descripcion: "Personas con acceso a este local, con cualquier rol.",
    columnas: ["id", "nombre", "email", "pin", "createdAt"],
    cargar: (localId) =>
      prisma.usuario.findMany({
        where: { membresias: { some: { localId } } },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, email: true, pin: true, createdAt: true },
      }),
  },
  {
    slug: "membresias",
    etiqueta: "Membresías",
    grupo: "Cuenta y accesos",
    descripcion: "El rol de cada usuario en este local.",
    columnas: ["id", "usuarioId", "usuarioNombre", "rol"],
    cargar: async (localId) => {
      const filas = await prisma.membresia.findMany({
        where: { localId },
        select: { id: true, usuarioId: true, rol: true, usuario: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, usuarioId: f.usuarioId, usuarioNombre: f.usuario.nombre, rol: f.rol }));
    },
  },
  {
    slug: "zonas",
    etiqueta: "Zonas",
    grupo: "Sala y plano",
    descripcion: "Espacios físicos del local (Terraza, Interior, Barra...).",
    seccionUrl: "mesas",
    columnas: ["id", "nombre", "orden", "color", "puntos"],
    cargar: (localId) =>
      prisma.zona.findMany({
        where: { localId },
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true, orden: true, color: true, puntos: true },
      }),
  },
  {
    slug: "mesas",
    etiqueta: "Mesas",
    grupo: "Sala y plano",
    descripcion: "Cada mesa, su zona, capacidad y posición en el plano.",
    seccionUrl: "mesas",
    columnas: ["id", "zonaId", "zonaNombre", "numero", "capacidad", "forma", "ancho", "alto", "posicionX", "posicionY"],
    cargar: async (localId) => {
      const filas = await prisma.mesa.findMany({
        where: { localId },
        orderBy: [{ zona: { orden: "asc" } }, { numero: "asc" }],
        select: {
          id: true,
          zonaId: true,
          numero: true,
          capacidad: true,
          forma: true,
          ancho: true,
          alto: true,
          posicionX: true,
          posicionY: true,
          zona: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({ ...f, zonaNombre: f.zona.nombre, zona: undefined }));
    },
  },
  {
    slug: "elementos-plano",
    etiqueta: "Elementos del plano",
    grupo: "Sala y plano",
    descripcion: "Puertas, escaleras y paredes dibujadas en el plano.",
    seccionUrl: "plano",
    columnas: ["id", "tipo", "posicionX", "posicionY", "ancho", "alto", "rotacion"],
    cargar: (localId) =>
      prisma.elementoPlano.findMany({
        where: { localId },
        select: { id: true, tipo: true, posicionX: true, posicionY: true, ancho: true, alto: true, rotacion: true },
      }),
  },
  {
    slug: "comandas",
    etiqueta: "Comandas",
    grupo: "Servicio y caja",
    descripcion: "Cada visita de mesa: abierta, enviada a cocina o cobrada.",
    seccionUrl: "plano",
    columnas: ["id", "mesaId", "mesaNumero", "camareroNombre", "estado", "horaApertura", "horaCierre"],
    cargar: async (localId) => {
      const filas = await prisma.comanda.findMany({
        where: { mesa: { localId } },
        orderBy: { horaApertura: "desc" },
        take: 200,
        select: {
          id: true,
          mesaId: true,
          estado: true,
          horaApertura: true,
          horaCierre: true,
          mesa: { select: { numero: true } },
          camarero: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        mesaId: f.mesaId,
        mesaNumero: f.mesa.numero,
        camareroNombre: f.camarero.nombre,
        estado: f.estado,
        horaApertura: f.horaApertura,
        horaCierre: f.horaCierre,
      }));
    },
  },
  {
    slug: "lineas-comanda",
    etiqueta: "Líneas de comanda",
    grupo: "Servicio y caja",
    descripcion: "Cada producto pedido dentro de una comanda.",
    seccionUrl: "plano",
    columnas: ["id", "comandaId", "productoNombre", "cantidad", "notas", "estado", "horaEnviada"],
    cargar: async (localId) => {
      const filas = await prisma.lineaComanda.findMany({
        where: { comanda: { mesa: { localId } } },
        orderBy: { id: "desc" },
        take: 300,
        select: {
          id: true,
          comandaId: true,
          cantidad: true,
          notas: true,
          estado: true,
          horaEnviada: true,
          producto: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        comandaId: f.comandaId,
        productoNombre: f.producto.nombre,
        cantidad: f.cantidad,
        notas: f.notas,
        estado: f.estado,
        horaEnviada: f.horaEnviada,
      }));
    },
  },
  {
    slug: "tickets",
    etiqueta: "Tickets",
    grupo: "Servicio y caja",
    descripcion: "Cobros ya emitidos, cada uno de una comanda.",
    seccionUrl: "ventas",
    columnas: ["id", "mesaNumero", "total", "metodoPago", "fecha", "cierreCajaId"],
    cargar: async (localId) => {
      const filas = await prisma.ticket.findMany({
        where: { comanda: { mesa: { localId } } },
        orderBy: { fecha: "desc" },
        take: 300,
        select: {
          id: true,
          total: true,
          metodoPago: true,
          fecha: true,
          cierreCajaId: true,
          comanda: { select: { mesa: { select: { numero: true } } } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        mesaNumero: f.comanda.mesa.numero,
        total: Number(f.total),
        metodoPago: f.metodoPago,
        fecha: f.fecha,
        cierreCajaId: f.cierreCajaId,
      }));
    },
  },
  {
    slug: "cierres-caja",
    etiqueta: "Cierres de caja",
    grupo: "Servicio y caja",
    descripcion: "Arqueos ya hechos: esperado, contado y diferencia.",
    seccionUrl: "caja",
    columnas: ["id", "fecha", "totalEsperado", "totalContado", "diferencia"],
    cargar: async (localId) => {
      const filas = await prisma.cierreCaja.findMany({
        where: { localId },
        orderBy: { fecha: "desc" },
      });
      return filas.map((f) => ({
        id: f.id,
        fecha: f.fecha,
        totalEsperado: Number(f.totalEsperado),
        totalContado: Number(f.totalContado),
        diferencia: Number(f.diferencia),
      }));
    },
  },
  {
    slug: "reservas",
    etiqueta: "Reservas",
    grupo: "Servicio y caja",
    descripcion: "Reservas de mesa, pasadas y futuras.",
    seccionUrl: "plano",
    columnas: ["id", "nombre", "telefono", "personas", "hora", "mesaNumero", "notas", "createdAt"],
    cargar: async (localId) => {
      const filas = await prisma.reserva.findMany({
        where: { localId },
        orderBy: { hora: "desc" },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          personas: true,
          hora: true,
          notas: true,
          createdAt: true,
          mesa: { select: { numero: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        telefono: f.telefono,
        personas: f.personas,
        hora: f.hora,
        mesaNumero: f.mesa?.numero ?? null,
        notas: f.notas,
        createdAt: f.createdAt,
      }));
    },
  },
  {
    slug: "categorias-carta",
    etiqueta: "Categorías de carta",
    grupo: "Carta y escandallo",
    descripcion: "Agrupación de productos en la carta.",
    columnas: ["id", "nombre", "orden"],
    cargar: (localId) =>
      prisma.categoriaCarta.findMany({
        where: { localId },
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true, orden: true },
      }),
  },
  {
    slug: "productos",
    etiqueta: "Productos",
    grupo: "Carta y escandallo",
    descripcion: "La carta: lo que se vende, con su precio y tipo.",
    seccionUrl: "productos",
    columnas: ["id", "nombre", "categoriaNombre", "tipo", "precioVenta", "visibleEnCarta", "alergenos"],
    cargar: async (localId) => {
      const filas = await prisma.producto.findMany({
        where: { localId },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          tipo: true,
          precioVenta: true,
          visibleEnCarta: true,
          alergenos: true,
          categoria: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        categoriaNombre: f.categoria.nombre,
        tipo: f.tipo,
        precioVenta: Number(f.precioVenta),
        visibleEnCarta: f.visibleEnCarta,
        alergenos: f.alergenos,
      }));
    },
  },
  {
    slug: "receta-lineas",
    etiqueta: "Líneas de escandallo",
    grupo: "Carta y escandallo",
    descripcion: "Qué referencias de inventario consume cada producto.",
    seccionUrl: "productos",
    columnas: ["id", "productoNombre", "ingredienteNombre", "cantidad"],
    cargar: async (localId) => {
      const filas = await prisma.recetaLinea.findMany({
        where: { producto: { localId } },
        select: {
          id: true,
          cantidad: true,
          producto: { select: { nombre: true } },
          ingrediente: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        productoNombre: f.producto.nombre,
        ingredienteNombre: f.ingrediente.nombre,
        cantidad: Number(f.cantidad),
      }));
    },
  },
  {
    slug: "ingredientes",
    etiqueta: "Ingredientes",
    grupo: "Inventario y proveedores",
    descripcion: "Referencias de inventario: stock, mínimos/máximos y coste.",
    seccionUrl: "inventario",
    columnas: [
      "id",
      "nombre",
      "tipo",
      "unidadMedida",
      "stockAlmacen",
      "stockBarra",
      "stockMinimoBarra",
      "stockMaximoBarra",
      "costeUnitario",
    ],
    cargar: async (localId) => {
      const filas = await prisma.ingrediente.findMany({
        where: { localId },
        orderBy: { nombre: "asc" },
      });
      return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        tipo: f.tipo,
        unidadMedida: f.unidadMedida,
        stockAlmacen: Number(f.stockAlmacen),
        stockBarra: Number(f.stockBarra),
        stockMinimoBarra: Number(f.stockMinimoBarra),
        stockMaximoBarra: Number(f.stockMaximoBarra),
        costeUnitario: Number(f.costeUnitario),
      }));
    },
  },
  {
    slug: "movimientos-stock",
    etiqueta: "Movimientos de stock",
    grupo: "Inventario y proveedores",
    descripcion: "Historial de entradas, salidas, mermas y traspasos.",
    columnas: ["id", "ingredienteNombre", "tipo", "cantidad", "fecha", "referencia"],
    cargar: async (localId) => {
      const filas = await prisma.movimientoStock.findMany({
        where: { ingrediente: { localId } },
        orderBy: { fecha: "desc" },
        take: 300,
        select: {
          id: true,
          tipo: true,
          cantidad: true,
          fecha: true,
          referencia: true,
          ingrediente: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        ingredienteNombre: f.ingrediente.nombre,
        tipo: f.tipo,
        cantidad: Number(f.cantidad),
        fecha: f.fecha,
        referencia: f.referencia,
      }));
    },
  },
  {
    slug: "proveedores",
    etiqueta: "Proveedores",
    grupo: "Inventario y proveedores",
    descripcion: "Altas de proveedor y sus datos de contacto.",
    seccionUrl: "proveedores",
    columnas: ["id", "nombre", "contacto", "productosHabituales"],
    cargar: (localId) =>
      prisma.proveedor.findMany({
        where: { localId },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, contacto: true, productosHabituales: true },
      }),
  },
  {
    slug: "pedidos-proveedor",
    etiqueta: "Pedidos a proveedor",
    grupo: "Inventario y proveedores",
    descripcion: "Cada pedido lanzado, su proveedor y estado.",
    seccionUrl: "inventario/pedidos",
    columnas: ["id", "proveedorNombre", "fecha", "estado"],
    cargar: async (localId) => {
      const filas = await prisma.pedidoProveedor.findMany({
        where: { proveedor: { localId } },
        orderBy: { fecha: "desc" },
        select: { id: true, fecha: true, estado: true, proveedor: { select: { nombre: true } } },
      });
      return filas.map((f) => ({ id: f.id, proveedorNombre: f.proveedor.nombre, fecha: f.fecha, estado: f.estado }));
    },
  },
  {
    slug: "pedidos-proveedor-lineas",
    etiqueta: "Líneas de pedido",
    grupo: "Inventario y proveedores",
    descripcion: "Qué referencia y cuánta cantidad lleva cada pedido.",
    seccionUrl: "inventario/pedidos",
    columnas: ["id", "pedidoId", "ingredienteNombre", "cantidad", "precioUnitario"],
    cargar: async (localId) => {
      const filas = await prisma.pedidoProveedorLinea.findMany({
        where: { pedido: { proveedor: { localId } } },
        select: {
          id: true,
          pedidoId: true,
          cantidad: true,
          precioUnitario: true,
          ingrediente: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        pedidoId: f.pedidoId,
        ingredienteNombre: f.ingrediente.nombre,
        cantidad: Number(f.cantidad),
        precioUnitario: Number(f.precioUnitario),
      }));
    },
  },
  {
    slug: "recepciones",
    etiqueta: "Recepciones",
    grupo: "Inventario y proveedores",
    descripcion: "Albaranes recibidos de cada pedido.",
    seccionUrl: "inventario/pedidos",
    columnas: ["id", "pedidoId", "proveedorNombre", "fecha", "numeroAlbaran", "incidencias"],
    cargar: async (localId) => {
      const filas = await prisma.recepcion.findMany({
        where: { pedido: { proveedor: { localId } } },
        orderBy: { fecha: "desc" },
        select: {
          id: true,
          pedidoId: true,
          fecha: true,
          numeroAlbaran: true,
          incidencias: true,
          pedido: { select: { proveedor: { select: { nombre: true } } } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        pedidoId: f.pedidoId,
        proveedorNombre: f.pedido.proveedor.nombre,
        fecha: f.fecha,
        numeroAlbaran: f.numeroAlbaran,
        incidencias: f.incidencias,
      }));
    },
  },
  {
    slug: "recepcion-lineas",
    etiqueta: "Líneas de recepción",
    grupo: "Inventario y proveedores",
    descripcion: "Cantidad y precio real de cada referencia recibida.",
    seccionUrl: "inventario/pedidos",
    columnas: ["id", "recepcionId", "ingredienteNombre", "cantidadRecibida", "precioUnitario"],
    cargar: async (localId) => {
      const filas = await prisma.recepcionLinea.findMany({
        where: { recepcion: { pedido: { proveedor: { localId } } } },
        select: {
          id: true,
          recepcionId: true,
          cantidadRecibida: true,
          precioUnitario: true,
          ingrediente: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        recepcionId: f.recepcionId,
        ingredienteNombre: f.ingrediente.nombre,
        cantidadRecibida: Number(f.cantidadRecibida),
        precioUnitario: Number(f.precioUnitario),
      }));
    },
  },
  {
    slug: "reposiciones",
    etiqueta: "Reposiciones",
    grupo: "Inventario y proveedores",
    descripcion: "Cada tanda de reposición diaria almacén -> barra.",
    seccionUrl: "inventario/reposicion",
    columnas: ["id", "fecha", "estado"],
    cargar: (localId) =>
      prisma.reposicion.findMany({
        where: { localId },
        orderBy: { fecha: "desc" },
        select: { id: true, fecha: true, estado: true },
      }),
  },
  {
    slug: "reposicion-lineas",
    etiqueta: "Líneas de reposición",
    grupo: "Inventario y proveedores",
    descripcion: "Qué referencia y cuánto se llevó a barra en cada reposición.",
    seccionUrl: "inventario/reposicion",
    columnas: ["id", "reposicionId", "ingredienteNombre", "cantidadSugerida", "cantidadLlevada", "completada"],
    cargar: async (localId) => {
      const filas = await prisma.reposicionLinea.findMany({
        where: { reposicion: { localId } },
        select: {
          id: true,
          reposicionId: true,
          cantidadSugerida: true,
          cantidadLlevada: true,
          completada: true,
          ingrediente: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        reposicionId: f.reposicionId,
        ingredienteNombre: f.ingrediente.nombre,
        cantidadSugerida: Number(f.cantidadSugerida),
        cantidadLlevada: Number(f.cantidadLlevada),
        completada: f.completada,
      }));
    },
  },
  {
    slug: "empleados",
    etiqueta: "Empleados",
    grupo: "Equipo y gestoría",
    descripcion: "Ficha laboral básica de cada empleado.",
    columnas: ["id", "usuarioNombre", "dniNie", "iban", "tipoContrato", "salarioBase"],
    cargar: async (localId) => {
      const filas = await prisma.empleado.findMany({
        where: { localId },
        select: {
          id: true,
          dniNie: true,
          iban: true,
          tipoContrato: true,
          salarioBase: true,
          usuario: { select: { nombre: true } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        usuarioNombre: f.usuario.nombre,
        dniNie: f.dniNie,
        iban: f.iban,
        tipoContrato: f.tipoContrato,
        salarioBase: Number(f.salarioBase),
      }));
    },
  },
  {
    slug: "turnos",
    etiqueta: "Turnos",
    grupo: "Equipo y gestoría",
    descripcion: "Fichajes de entrada y salida de cada empleado.",
    columnas: ["id", "empleadoNombre", "horaEntrada", "horaSalida"],
    cargar: async (localId) => {
      const filas = await prisma.turno.findMany({
        where: { empleado: { localId } },
        orderBy: { horaEntrada: "desc" },
        take: 300,
        select: { id: true, horaEntrada: true, horaSalida: true, empleado: { select: { usuario: { select: { nombre: true } } } } },
      });
      return filas.map((f) => ({
        id: f.id,
        empleadoNombre: f.empleado.usuario.nombre,
        horaEntrada: f.horaEntrada,
        horaSalida: f.horaSalida,
      }));
    },
  },
  {
    slug: "nominas",
    etiqueta: "Nóminas",
    grupo: "Equipo y gestoría",
    descripcion: "Nómina mensual de cada empleado.",
    columnas: ["id", "empleadoNombre", "periodo", "bruto", "deducciones", "neto", "estado"],
    cargar: async (localId) => {
      const filas = await prisma.nomina.findMany({
        where: { empleado: { localId } },
        orderBy: { periodo: "desc" },
        select: {
          id: true,
          periodo: true,
          bruto: true,
          deducciones: true,
          neto: true,
          estado: true,
          empleado: { select: { usuario: { select: { nombre: true } } } },
        },
      });
      return filas.map((f) => ({
        id: f.id,
        empleadoNombre: f.empleado.usuario.nombre,
        periodo: f.periodo,
        bruto: Number(f.bruto),
        deducciones: Number(f.deducciones),
        neto: Number(f.neto),
        estado: f.estado,
      }));
    },
  },
];

export function buscarTabla(slug: string): DefinicionTabla | undefined {
  return TABLAS.find((t) => t.slug === slug);
}
