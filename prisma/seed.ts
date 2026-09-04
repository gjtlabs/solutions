import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Catálogo de ejemplo: un bar de tapas típico de Zaragoza — inventado por
// completo para tener con qué probar la app, no el catálogo real de ningún
// establecimiento. Cada Ingrediente es una referencia de inventario (lo que
// se compra y se almacena); cada Producto es lo que se vende en la carta.
// Son cosas distintas a propósito — un cubalibre consume ron Y refresco de
// cola en cantidades distintas — pero quedan ligadas por su escandallo
// (RecetaLinea), editable también desde Productos → Escandallo en la app.
// ---------------------------------------------------------------------------

type IngredienteSeed = {
  id: string;
  nombre: string;
  tipo: "COMIDA" | "BEBIDA" | "CONSUMIBLE";
  unidadMedida: string;
  stockAlmacen: number;
  stockBarra: number;
  stockMinimoBarra: number;
  stockMaximoBarra: number;
  costeUnitario: number;
};

const INGREDIENTES: IngredienteSeed[] = [
  // Bebidas
  { id: "ing-cerveza-barril", nombre: "Cerveza barril", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 60, stockBarra: 15, stockMinimoBarra: 5, stockMaximoBarra: 20, costeUnitario: 1.2 },
  { id: "ing-cerveza-sin-alcohol", nombre: "Cerveza sin alcohol (botellín)", tipo: "BEBIDA", unidadMedida: "unidad", stockAlmacen: 48, stockBarra: 12, stockMinimoBarra: 6, stockMaximoBarra: 24, costeUnitario: 0.65 },
  { id: "ing-vino-tinto", nombre: "Vino tinto", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 20, stockBarra: 4, stockMinimoBarra: 3, stockMaximoBarra: 8, costeUnitario: 3.5 },
  { id: "ing-vino-blanco", nombre: "Vino blanco", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 15, stockBarra: 3, stockMinimoBarra: 2, stockMaximoBarra: 6, costeUnitario: 3.5 },
  { id: "ing-vino-rosado", nombre: "Vino rosado", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 5, costeUnitario: 3.5 },
  { id: "ing-cava", nombre: "Cava", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 9, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 6 },
  { id: "ing-vermut", nombre: "Vermut de grifo", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 12, stockBarra: 3, stockMinimoBarra: 2, stockMaximoBarra: 6, costeUnitario: 2.8 },
  { id: "ing-ron", nombre: "Ron", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 10, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 12 },
  { id: "ing-ginebra", nombre: "Ginebra", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 10, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 14 },
  { id: "ing-whisky", nombre: "Whisky", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 7, stockBarra: 1, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 16 },
  { id: "ing-refresco-cola", nombre: "Refresco de cola", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 15, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 6, costeUnitario: 0.9 },
  { id: "ing-refresco-naranja", nombre: "Refresco de naranja", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 12, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 5, costeUnitario: 0.9 },
  { id: "ing-refresco-limon", nombre: "Refresco de limón", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 12, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 5, costeUnitario: 0.9 },
  { id: "ing-tonica", nombre: "Tónica (botellín)", tipo: "BEBIDA", unidadMedida: "unidad", stockAlmacen: 36, stockBarra: 8, stockMinimoBarra: 4, stockMaximoBarra: 15, costeUnitario: 0.75 },
  { id: "ing-agua-mineral", nombre: "Agua mineral (botella 50cl)", tipo: "BEBIDA", unidadMedida: "unidad", stockAlmacen: 48, stockBarra: 12, stockMinimoBarra: 6, stockMaximoBarra: 24, costeUnitario: 0.4 },
  { id: "ing-cafe-grano", nombre: "Café en grano", tipo: "BEBIDA", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1, costeUnitario: 18 },
  { id: "ing-leche", nombre: "Leche", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 1, stockMaximoBarra: 4, costeUnitario: 0.95 },
  { id: "ing-zumo-naranja", nombre: "Zumo de naranja natural", tipo: "BEBIDA", unidadMedida: "l", stockAlmacen: 8, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 1.8 },
  { id: "ing-sidra", nombre: "Sidra (botella)", tipo: "BEBIDA", unidadMedida: "unidad", stockAlmacen: 24, stockBarra: 6, stockMinimoBarra: 3, stockMaximoBarra: 12, costeUnitario: 2.5 },
  // Comida
  { id: "ing-patatas", nombre: "Patatas", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 25, stockBarra: 5, stockMinimoBarra: 3, stockMaximoBarra: 10, costeUnitario: 0.9 },
  { id: "ing-aceite-oliva", nombre: "Aceite de oliva", tipo: "COMIDA", unidadMedida: "l", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 1, stockMaximoBarra: 4, costeUnitario: 4.5 },
  { id: "ing-huevos", nombre: "Huevos", tipo: "COMIDA", unidadMedida: "unidad", stockAlmacen: 120, stockBarra: 24, stockMinimoBarra: 12, stockMaximoBarra: 48, costeUnitario: 0.22 },
  { id: "ing-jamon-serrano", nombre: "Jamón serrano", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 22 },
  { id: "ing-queso-curado", nombre: "Queso curado", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 14 },
  { id: "ing-pan", nombre: "Pan (pieza)", tipo: "COMIDA", unidadMedida: "unidad", stockAlmacen: 60, stockBarra: 12, stockMinimoBarra: 6, stockMaximoBarra: 24, costeUnitario: 0.35 },
  { id: "ing-tomate", nombre: "Tomate", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 1, stockMaximoBarra: 4, costeUnitario: 1.8 },
  { id: "ing-pimiento-verde", nombre: "Pimiento verde", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.5, stockMinimoBarra: 0.5, stockMaximoBarra: 3, costeUnitario: 2 },
  { id: "ing-calamar", nombre: "Calamar (congelado)", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 8, stockBarra: 1.5, stockMinimoBarra: 0.5, stockMaximoBarra: 3, costeUnitario: 9.5 },
  { id: "ing-boqueron", nombre: "Boquerón en vinagre", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 11 },
  { id: "ing-croqueta", nombre: "Croqueta (unidad)", tipo: "COMIDA", unidadMedida: "unidad", stockAlmacen: 200, stockBarra: 40, stockMinimoBarra: 20, stockMaximoBarra: 80, costeUnitario: 0.28 },
  { id: "ing-chorizo", nombre: "Chorizo", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 9 },
  { id: "ing-morcilla", nombre: "Morcilla", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 8.5 },
  { id: "ing-lomo", nombre: "Lomo embuchado", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 16 },
  { id: "ing-pulpo", nombre: "Pulpo cocido", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 3, stockBarra: 0.6, stockMinimoBarra: 0.2, stockMaximoBarra: 1, costeUnitario: 28 },
  { id: "ing-champinon", nombre: "Champiñón", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2.5, costeUnitario: 3.2 },
  { id: "ing-salsa-brava", nombre: "Salsa brava", tipo: "COMIDA", unidadMedida: "l", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2.5, costeUnitario: 3.5 },
  { id: "ing-alioli", nombre: "Alioli", tipo: "COMIDA", unidadMedida: "l", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 4 },
  { id: "ing-aceitunas", nombre: "Aceitunas", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2.5, costeUnitario: 3.8 },
  { id: "ing-anchoa", nombre: "Anchoa en aceite", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 2, stockBarra: 0.4, stockMinimoBarra: 0.2, stockMaximoBarra: 0.8, costeUnitario: 24 },
  { id: "ing-lechuga", nombre: "Lechuga", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 1.5 },
  { id: "ing-atun-lata", nombre: "Atún en lata", tipo: "COMIDA", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 7.5 },
  { id: "ing-mahonesa", nombre: "Mahonesa", tipo: "COMIDA", unidadMedida: "l", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 3.2 },
];

type ProductoSeed = {
  id: string;
  nombre: string;
  precioVenta: number;
  categoria: string;
  tipo: "COMIDA" | "BEBIDA";
  receta: { ingredienteId: string; cantidad: number }[];
};

const CATEGORIAS = [
  "Cervezas",
  "Vinos y Vermut",
  "Copas y Combinados",
  "Refrescos y Aguas",
  "Cafés e Infusiones",
  "Picoteo",
  "Ensaladas",
  "Tostadas",
  "Marisco",
  "Raciones",
  "Carnes",
] as const;

const PRODUCTOS: ProductoSeed[] = [
  // Cervezas
  { id: "prod-cana", nombre: "Caña", precioVenta: 2.2, categoria: "Cervezas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cerveza-barril", cantidad: 0.2 }] },
  { id: "prod-tubo", nombre: "Tubo", precioVenta: 2.6, categoria: "Cervezas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cerveza-barril", cantidad: 0.33 }] },
  { id: "prod-jarra", nombre: "Jarra", precioVenta: 4.5, categoria: "Cervezas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cerveza-barril", cantidad: 0.5 }] },
  { id: "prod-cerveza-sin", nombre: "Cerveza sin alcohol", precioVenta: 2.4, categoria: "Cervezas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cerveza-sin-alcohol", cantidad: 1 }] },
  // Vinos y Vermut
  { id: "prod-vino-tinto", nombre: "Copa de vino tinto", precioVenta: 2.2, categoria: "Vinos y Vermut", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-vino-tinto", cantidad: 0.15 }] },
  { id: "prod-vino-blanco", nombre: "Copa de vino blanco", precioVenta: 2.2, categoria: "Vinos y Vermut", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-vino-blanco", cantidad: 0.15 }] },
  { id: "prod-vino-rosado", nombre: "Copa de vino rosado", precioVenta: 2.2, categoria: "Vinos y Vermut", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-vino-rosado", cantidad: 0.15 }] },
  { id: "prod-cava", nombre: "Copa de cava", precioVenta: 2.8, categoria: "Vinos y Vermut", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cava", cantidad: 0.1 }] },
  { id: "prod-vermut", nombre: "Vermut", precioVenta: 2.5, categoria: "Vinos y Vermut", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-vermut", cantidad: 0.15 }] },
  { id: "prod-tinto-verano", nombre: "Tinto de verano", precioVenta: 2.5, categoria: "Vinos y Vermut", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-vino-tinto", cantidad: 0.15 }, { ingredienteId: "ing-refresco-limon", cantidad: 0.15 }] },
  // Copas y Combinados
  { id: "prod-cubalibre", nombre: "Cubalibre", precioVenta: 6, categoria: "Copas y Combinados", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-ron", cantidad: 0.05 }, { ingredienteId: "ing-refresco-cola", cantidad: 0.2 }] },
  { id: "prod-gintonic", nombre: "Gin tonic", precioVenta: 7, categoria: "Copas y Combinados", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-ginebra", cantidad: 0.05 }, { ingredienteId: "ing-tonica", cantidad: 1 }] },
  { id: "prod-whisky-cola", nombre: "Whisky con cola", precioVenta: 6.5, categoria: "Copas y Combinados", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-whisky", cantidad: 0.05 }, { ingredienteId: "ing-refresco-cola", cantidad: 0.2 }] },
  // Refrescos y Aguas
  { id: "prod-refresco-cola", nombre: "Refresco de cola", precioVenta: 2.2, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-refresco-cola", cantidad: 0.2 }] },
  { id: "prod-refresco-naranja", nombre: "Refresco de naranja", precioVenta: 2.2, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-refresco-naranja", cantidad: 0.2 }] },
  { id: "prod-refresco-limon", nombre: "Refresco de limón", precioVenta: 2.2, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-refresco-limon", cantidad: 0.2 }] },
  { id: "prod-tonica", nombre: "Tónica", precioVenta: 2.3, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-tonica", cantidad: 1 }] },
  { id: "prod-agua", nombre: "Agua mineral", precioVenta: 1.6, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-agua-mineral", cantidad: 1 }] },
  { id: "prod-zumo-naranja", nombre: "Zumo de naranja natural", precioVenta: 2.8, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-zumo-naranja", cantidad: 0.2 }] },
  { id: "prod-sidra", nombre: "Sidra", precioVenta: 3.5, categoria: "Refrescos y Aguas", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-sidra", cantidad: 1 }] },
  // Cafés e Infusiones
  { id: "prod-cafe-solo", nombre: "Café solo", precioVenta: 1.4, categoria: "Cafés e Infusiones", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cafe-grano", cantidad: 0.007 }] },
  { id: "prod-cafe-cortado", nombre: "Café cortado", precioVenta: 1.5, categoria: "Cafés e Infusiones", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cafe-grano", cantidad: 0.007 }, { ingredienteId: "ing-leche", cantidad: 0.05 }] },
  { id: "prod-cafe-leche", nombre: "Café con leche", precioVenta: 1.6, categoria: "Cafés e Infusiones", tipo: "BEBIDA", receta: [{ ingredienteId: "ing-cafe-grano", cantidad: 0.007 }, { ingredienteId: "ing-leche", cantidad: 0.15 }] },
  // Picoteo — carta real del bar, sin escandallo todavía (se añade desde
  // Productos → Escandallo en la app cuando haga falta).
  { id: "prod-salmuera-hielo", nombre: "Salmuera con hielo pilé", precioVenta: 1.95, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-vinagrillos", nombre: "Vinagrillos", precioVenta: 1.85, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-banderilla-rejo", nombre: "Banderilla de rejo", precioVenta: 3, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-alcachofas-parrilla", nombre: "Alcachofas a la parrilla aliñadas en vinagre y espárragos", precioVenta: 4.2, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-boqueron-ajillo", nombre: "Boquerón al ajillo", precioVenta: 1.95, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-guardia-civil", nombre: "Guardia civil", precioVenta: 3.5, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-taco-escabeche", nombre: "Taco escabeche", precioVenta: 5, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-torrezno", nombre: "Torrezno", precioVenta: 3.9, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-bunuelitos-bacalao", nombre: "Buñuelitos de bacalao (10 uds)", precioVenta: 3.6, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-carioca", nombre: "Carioca", precioVenta: 3, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-croqueton", nombre: "Croquetón", precioVenta: 3, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  { id: "prod-empanadilla-picante", nombre: "Empanadilla carne picante", precioVenta: 3, categoria: "Picoteo", tipo: "COMIDA", receta: [] },
  // Ensaladas
  { id: "prod-ensaladilla-med", nombre: "Ensaladilla rusa (mediana)", precioVenta: 3.4, categoria: "Ensaladas", tipo: "COMIDA", receta: [] },
  { id: "prod-ensaladilla-grande", nombre: "Ensaladilla rusa (grande)", precioVenta: 5.9, categoria: "Ensaladas", tipo: "COMIDA", receta: [] },
  { id: "prod-tomate-preparado", nombre: "Tomate preparado", precioVenta: 6.9, categoria: "Ensaladas", tipo: "COMIDA", receta: [] },
  { id: "prod-bacalao-guacamole-ensalada", nombre: "Bacalao ahumado con guacamole (ensalada)", precioVenta: 12.5, categoria: "Ensaladas", tipo: "COMIDA", receta: [] },
  { id: "prod-trujalico", nombre: "Trujalico: tomate, jamón y ventresca", precioVenta: 15.5, categoria: "Ensaladas", tipo: "COMIDA", receta: [] },
  // Tostadas (con pan con tomate)
  { id: "prod-tostada-anchoas", nombre: "Tostada de anchoas, boquerones y piquillo", precioVenta: 9.5, categoria: "Tostadas", tipo: "COMIDA", receta: [] },
  { id: "prod-tostada-bacalao-guacamole", nombre: "Tostada de bacalao ahumado con guacamole", precioVenta: 9.5, categoria: "Tostadas", tipo: "COMIDA", receta: [] },
  { id: "prod-tostada-ventresca", nombre: "Tostada de ventresca con piquillo", precioVenta: 9.5, categoria: "Tostadas", tipo: "COMIDA", receta: [] },
  { id: "prod-tostada-solomillo-px", nombre: "Tostada de solomillo al Pedro Ximénez", precioVenta: 9.5, categoria: "Tostadas", tipo: "COMIDA", receta: [] },
  // Marisco
  { id: "prod-crujiente-langostino", nombre: "Crujiente de langostino", precioVenta: 2.6, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  { id: "prod-ostra", nombre: "Ostra", precioVenta: 3.1, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  { id: "prod-zamburina-plancha", nombre: "Zamburiña plancha (salsa especial)", precioVenta: 2.3, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  { id: "prod-salpicon-marisco", nombre: "Salpicón de marisco", precioVenta: 7.8, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  { id: "prod-navajitas-plancha", nombre: "Navajitas plancha (6 uds, salsa especial)", precioVenta: 9.95, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  { id: "prod-chipirones-plancha", nombre: "Chipirones plancha", precioVenta: 13.7, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  { id: "prod-gamba-roja-plancha", nombre: "Gamba roja plancha (8 uds)", precioVenta: 16, categoria: "Marisco", tipo: "COMIDA", receta: [] },
  // Raciones
  { id: "prod-papas-bravas-real", nombre: "Papas bravas", precioVenta: 6.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-rabas-calamar", nombre: "Rabas de calamar", precioVenta: 10.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-gambardinas", nombre: "Gambardinas (10 uds)", precioVenta: 7, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-migas-huevo-uva", nombre: "Migas con huevo frito y uva", precioVenta: 6.3, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-verduritas-tempura", nombre: "Verduritas en tempura", precioVenta: 11.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-fritura-mixta", nombre: "Fritura mixta", precioVenta: 12.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-garbanzos-bogavante", nombre: "Garbanzos con bogavante", precioVenta: 9.95, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-bacalao-tomate-huevo", nombre: "Bacalao con tomate y huevo", precioVenta: 12.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-huevos-rotos-jamon-real", nombre: "Huevos rotos con jamón", precioVenta: 15.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-huevos-rotos-gulas", nombre: "Huevos rotos con gulas", precioVenta: 15.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  { id: "prod-huevos-rotos-picadillo-soria", nombre: "Huevos rotos con picadillo Soria", precioVenta: 15.5, categoria: "Raciones", tipo: "COMIDA", receta: [] },
  // Carnes
  { id: "prod-madeja-patatas", nombre: "Madeja con patatas", precioVenta: 12.5, categoria: "Carnes", tipo: "COMIDA", receta: [] },
  { id: "prod-pollo-cajun-patatas", nombre: "Pollo cajún con patatas", precioVenta: 12.5, categoria: "Carnes", tipo: "COMIDA", receta: [] },
  { id: "prod-solomillo-roquefort", nombre: "Solomillo con roquefort", precioVenta: 12.5, categoria: "Carnes", tipo: "COMIDA", receta: [] },
  { id: "prod-churrasco-ternera", nombre: "Churrasco de ternera", precioVenta: 12.5, categoria: "Carnes", tipo: "COMIDA", receta: [] },
];

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
  // Carta + inventario de ejemplo. Se limpia primero todo lo de rondas
  // anteriores (en orden de dependencias) para que el seed sea idempotente
  // sin arrastrar catálogos antiguos ni movimientos de stock huérfanos.
  // ---------------------------------------------------------------------

  await prisma.movimientoStock.deleteMany({ where: { ingrediente: { localId: local.id } } });
  await prisma.recepcion.deleteMany({ where: { pedido: { proveedor: { localId: local.id } } } });
  await prisma.pedidoProveedor.deleteMany({ where: { proveedor: { localId: local.id } } });
  await prisma.proveedor.deleteMany({ where: { localId: local.id } });
  await prisma.reposicion.deleteMany({ where: { localId: local.id } });
  // Líneas de comanda de pruebas anteriores que apunten al catálogo viejo
  // — si no, el producto queda "en uso" y no se puede reemplazar.
  await prisma.lineaComanda.deleteMany({ where: { producto: { localId: local.id } } });
  await prisma.producto.deleteMany({ where: { localId: local.id } });
  await prisma.categoriaCarta.deleteMany({ where: { localId: local.id } });
  await prisma.ingrediente.deleteMany({ where: { localId: local.id } });

  const categoriasPorNombre = new Map<string, string>();
  for (const [orden, nombre] of CATEGORIAS.entries()) {
    const categoria = await prisma.categoriaCarta.create({
      data: { localId: local.id, nombre, orden },
    });
    categoriasPorNombre.set(nombre, categoria.id);
  }

  await Promise.all(
    INGREDIENTES.map((ing) => prisma.ingrediente.create({ data: { ...ing, localId: local.id } })),
  );

  for (const prod of PRODUCTOS) {
    await prisma.producto.create({
      data: {
        id: prod.id,
        localId: local.id,
        categoriaId: categoriasPorNombre.get(prod.categoria)!,
        nombre: prod.nombre,
        precioVenta: prod.precioVenta,
        tipo: prod.tipo,
        receta: { create: prod.receta },
      },
    });
  }

  const proveedor = await prisma.proveedor.create({
    data: {
      localId: local.id,
      nombre: "Distribuciones Ebro",
      contacto: "976 123 456",
      productosHabituales: "Cerveza, vino, refrescos",
    },
  });

  // Un pedido ya "enviado" al proveedor, listo para probar el flujo de
  // Recibir albarán sin tener que crearlo a mano primero.
  await prisma.pedidoProveedor.create({
    data: {
      proveedorId: proveedor.id,
      estado: "ENVIADO",
      lineas: {
        create: [
          { ingredienteId: "ing-cerveza-barril", cantidad: 30, precioUnitario: 1.2 },
          { ingredienteId: "ing-vino-tinto", cantidad: 10, precioUnitario: 3.5 },
        ],
      },
    },
  });

  console.log(
    `Seed listo. Local: "${local.nombre}" — ${INGREDIENTES.length} referencias, ${PRODUCTOS.length} productos. Login: admin@soluciones.local / cambiar-esta-contrasena`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
