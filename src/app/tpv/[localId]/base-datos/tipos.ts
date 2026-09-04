export type FilaTabla = Record<string, unknown>;

export type TipoCampo =
  | "id"
  | "texto"
  | "textoLargo"
  | "numero"
  | "decimal"
  | "booleano"
  | "fecha"
  | "enum"
  | "relacion"
  | "json"
  | "lista"
  | "password";

export type OpcionRelacion = { id: string; etiqueta: string };

export type CampoTabla = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  // Para tipo "enum": las opciones fijas del enum de Prisma.
  opciones?: string[];
  // Para tipo "relacion": de dónde saca las opciones válidas para ESTE local.
  cargarOpciones?: (localId: string) => Promise<OpcionRelacion[]>;
  requerido?: boolean;
  // No se pide al crear ni se deja tocar al editar — id, columnas calculadas
  // (nombres de relación) o con valor automático (createdAt).
  soloLectura?: boolean;
  // Ni se muestra ni se pide al crear — el id de cada fila (ya se usa por
  // debajo para guardar/borrar, no hace falta verlo) y los detalles de
  // maquetación del plano (color, ancho, alto, posición, rotación) que
  // solo tienen sentido en el editor visual, no como columna de una tabla.
  oculto?: boolean;
};

export type ResultadoMutacion = { error?: string };

export type DefinicionTabla = {
  slug: string;
  etiqueta: string;
  grupo: string;
  descripcion: string;
  // Ruta (relativa al local) de la sección donde se gestiona esta tabla con
  // una pantalla a medida, si existe una — aquí se puede editar igualmente,
  // pero esa sección explica mejor el porqué de cada dato.
  seccionUrl?: string;
  campos: CampoTabla[];
  cargar: (localId: string) => Promise<FilaTabla[]>;
  // Ausentes cuando la tabla no admite esa operación (p. ej. Local no se
  // puede crear ni borrar, es el propio local).
  crear?: (localId: string, datos: FilaTabla) => Promise<ResultadoMutacion>;
  actualizar?: (localId: string, id: string, datos: FilaTabla) => Promise<ResultadoMutacion>;
  borrar?: (localId: string, id: string) => Promise<ResultadoMutacion>;
};
