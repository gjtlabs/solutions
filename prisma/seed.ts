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
  unidadMedida: string;
  stockAlmacen: number;
  stockBarra: number;
  stockMinimoBarra: number;
  stockMaximoBarra: number;
  costeUnitario: number;
};

const INGREDIENTES: IngredienteSeed[] = [
  // Bebidas
  { id: "ing-cerveza-barril", nombre: "Cerveza barril", unidadMedida: "l", stockAlmacen: 60, stockBarra: 15, stockMinimoBarra: 5, stockMaximoBarra: 20, costeUnitario: 1.2 },
  { id: "ing-cerveza-sin-alcohol", nombre: "Cerveza sin alcohol (botellín)", unidadMedida: "unidad", stockAlmacen: 48, stockBarra: 12, stockMinimoBarra: 6, stockMaximoBarra: 24, costeUnitario: 0.65 },
  { id: "ing-vino-tinto", nombre: "Vino tinto", unidadMedida: "l", stockAlmacen: 20, stockBarra: 4, stockMinimoBarra: 3, stockMaximoBarra: 8, costeUnitario: 3.5 },
  { id: "ing-vino-blanco", nombre: "Vino blanco", unidadMedida: "l", stockAlmacen: 15, stockBarra: 3, stockMinimoBarra: 2, stockMaximoBarra: 6, costeUnitario: 3.5 },
  { id: "ing-vino-rosado", nombre: "Vino rosado", unidadMedida: "l", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 5, costeUnitario: 3.5 },
  { id: "ing-cava", nombre: "Cava", unidadMedida: "l", stockAlmacen: 9, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 6 },
  { id: "ing-vermut", nombre: "Vermut de grifo", unidadMedida: "l", stockAlmacen: 12, stockBarra: 3, stockMinimoBarra: 2, stockMaximoBarra: 6, costeUnitario: 2.8 },
  { id: "ing-ron", nombre: "Ron", unidadMedida: "l", stockAlmacen: 10, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 12 },
  { id: "ing-ginebra", nombre: "Ginebra", unidadMedida: "l", stockAlmacen: 10, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 14 },
  { id: "ing-whisky", nombre: "Whisky", unidadMedida: "l", stockAlmacen: 7, stockBarra: 1, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 16 },
  { id: "ing-refresco-cola", nombre: "Refresco de cola", unidadMedida: "l", stockAlmacen: 15, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 6, costeUnitario: 0.9 },
  { id: "ing-refresco-naranja", nombre: "Refresco de naranja", unidadMedida: "l", stockAlmacen: 12, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 5, costeUnitario: 0.9 },
  { id: "ing-refresco-limon", nombre: "Refresco de limón", unidadMedida: "l", stockAlmacen: 12, stockBarra: 2, stockMinimoBarra: 2, stockMaximoBarra: 5, costeUnitario: 0.9 },
  { id: "ing-tonica", nombre: "Tónica (botellín)", unidadMedida: "unidad", stockAlmacen: 36, stockBarra: 8, stockMinimoBarra: 4, stockMaximoBarra: 15, costeUnitario: 0.75 },
  { id: "ing-agua-mineral", nombre: "Agua mineral (botella 50cl)", unidadMedida: "unidad", stockAlmacen: 48, stockBarra: 12, stockMinimoBarra: 6, stockMaximoBarra: 24, costeUnitario: 0.4 },
  { id: "ing-cafe-grano", nombre: "Café en grano", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1, costeUnitario: 18 },
  { id: "ing-leche", nombre: "Leche", unidadMedida: "l", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 1, stockMaximoBarra: 4, costeUnitario: 0.95 },
  { id: "ing-zumo-naranja", nombre: "Zumo de naranja natural", unidadMedida: "l", stockAlmacen: 8, stockBarra: 1.5, stockMinimoBarra: 1, stockMaximoBarra: 3, costeUnitario: 1.8 },
  { id: "ing-sidra", nombre: "Sidra (botella)", unidadMedida: "unidad", stockAlmacen: 24, stockBarra: 6, stockMinimoBarra: 3, stockMaximoBarra: 12, costeUnitario: 2.5 },
  // Comida
  { id: "ing-patatas", nombre: "Patatas", unidadMedida: "kg", stockAlmacen: 25, stockBarra: 5, stockMinimoBarra: 3, stockMaximoBarra: 10, costeUnitario: 0.9 },
  { id: "ing-aceite-oliva", nombre: "Aceite de oliva", unidadMedida: "l", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 1, stockMaximoBarra: 4, costeUnitario: 4.5 },
  { id: "ing-huevos", nombre: "Huevos", unidadMedida: "unidad", stockAlmacen: 120, stockBarra: 24, stockMinimoBarra: 12, stockMaximoBarra: 48, costeUnitario: 0.22 },
  { id: "ing-jamon-serrano", nombre: "Jamón serrano", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 22 },
  { id: "ing-queso-curado", nombre: "Queso curado", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 14 },
  { id: "ing-pan", nombre: "Pan (pieza)", unidadMedida: "unidad", stockAlmacen: 60, stockBarra: 12, stockMinimoBarra: 6, stockMaximoBarra: 24, costeUnitario: 0.35 },
  { id: "ing-tomate", nombre: "Tomate", unidadMedida: "kg", stockAlmacen: 10, stockBarra: 2, stockMinimoBarra: 1, stockMaximoBarra: 4, costeUnitario: 1.8 },
  { id: "ing-pimiento-verde", nombre: "Pimiento verde", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.5, stockMinimoBarra: 0.5, stockMaximoBarra: 3, costeUnitario: 2 },
  { id: "ing-calamar", nombre: "Calamar (congelado)", unidadMedida: "kg", stockAlmacen: 8, stockBarra: 1.5, stockMinimoBarra: 0.5, stockMaximoBarra: 3, costeUnitario: 9.5 },
  { id: "ing-boqueron", nombre: "Boquerón en vinagre", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 11 },
  { id: "ing-croqueta", nombre: "Croqueta (unidad)", unidadMedida: "unidad", stockAlmacen: 200, stockBarra: 40, stockMinimoBarra: 20, stockMaximoBarra: 80, costeUnitario: 0.28 },
  { id: "ing-chorizo", nombre: "Chorizo", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 9 },
  { id: "ing-morcilla", nombre: "Morcilla", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 8.5 },
  { id: "ing-lomo", nombre: "Lomo embuchado", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 16 },
  { id: "ing-pulpo", nombre: "Pulpo cocido", unidadMedida: "kg", stockAlmacen: 3, stockBarra: 0.6, stockMinimoBarra: 0.2, stockMaximoBarra: 1, costeUnitario: 28 },
  { id: "ing-champinon", nombre: "Champiñón", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2.5, costeUnitario: 3.2 },
  { id: "ing-salsa-brava", nombre: "Salsa brava", unidadMedida: "l", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2.5, costeUnitario: 3.5 },
  { id: "ing-alioli", nombre: "Alioli", unidadMedida: "l", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 4 },
  { id: "ing-aceitunas", nombre: "Aceitunas", unidadMedida: "kg", stockAlmacen: 6, stockBarra: 1.2, stockMinimoBarra: 0.5, stockMaximoBarra: 2.5, costeUnitario: 3.8 },
  { id: "ing-anchoa", nombre: "Anchoa en aceite", unidadMedida: "kg", stockAlmacen: 2, stockBarra: 0.4, stockMinimoBarra: 0.2, stockMaximoBarra: 0.8, costeUnitario: 24 },
  { id: "ing-lechuga", nombre: "Lechuga", unidadMedida: "kg", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 1.5 },
  { id: "ing-atun-lata", nombre: "Atún en lata", unidadMedida: "kg", stockAlmacen: 4, stockBarra: 0.8, stockMinimoBarra: 0.3, stockMaximoBarra: 1.5, costeUnitario: 7.5 },
  { id: "ing-mahonesa", nombre: "Mahonesa", unidadMedida: "l", stockAlmacen: 5, stockBarra: 1, stockMinimoBarra: 0.5, stockMaximoBarra: 2, costeUnitario: 3.2 },
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
  "Tapas Frías",
  "Tapas Calientes",
  "Montaditos y Bocadillos",
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
  // Tapas Frías
  { id: "prod-jamon-racion", nombre: "Jamón serrano (ración)", precioVenta: 9.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-jamon-serrano", cantidad: 0.08 }] },
  { id: "prod-tabla-quesos", nombre: "Tabla de quesos", precioVenta: 8.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-queso-curado", cantidad: 0.1 }] },
  { id: "prod-tabla-iberica", nombre: "Tabla ibérica", precioVenta: 12, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-jamon-serrano", cantidad: 0.05 }, { ingredienteId: "ing-chorizo", cantidad: 0.05 }, { ingredienteId: "ing-morcilla", cantidad: 0.05 }, { ingredienteId: "ing-queso-curado", cantidad: 0.05 }] },
  { id: "prod-aceitunas", nombre: "Aceitunas aliñadas", precioVenta: 3, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-aceitunas", cantidad: 0.1 }] },
  { id: "prod-banderillas", nombre: "Banderillas", precioVenta: 3.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-anchoa", cantidad: 0.03 }, { ingredienteId: "ing-aceitunas", cantidad: 0.05 }] },
  { id: "prod-boquerones", nombre: "Boquerones en vinagre", precioVenta: 6.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-boqueron", cantidad: 0.12 }] },
  { id: "prod-ensaladilla", nombre: "Ensaladilla rusa", precioVenta: 5.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-patatas", cantidad: 0.15 }, { ingredienteId: "ing-atun-lata", cantidad: 0.05 }, { ingredienteId: "ing-mahonesa", cantidad: 0.05 }, { ingredienteId: "ing-huevos", cantidad: 0.5 }] },
  { id: "prod-pan-tomate", nombre: "Pan con tomate", precioVenta: 3.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 1 }, { ingredienteId: "ing-tomate", cantidad: 0.1 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.02 }] },
  { id: "prod-ensalada-mixta", nombre: "Ensalada mixta", precioVenta: 6.5, categoria: "Tapas Frías", tipo: "COMIDA", receta: [{ ingredienteId: "ing-lechuga", cantidad: 0.15 }, { ingredienteId: "ing-tomate", cantidad: 0.1 }, { ingredienteId: "ing-atun-lata", cantidad: 0.05 }, { ingredienteId: "ing-huevos", cantidad: 1 }] },
  // Tapas Calientes
  { id: "prod-bravas", nombre: "Patatas bravas", precioVenta: 5.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-patatas", cantidad: 0.25 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }, { ingredienteId: "ing-salsa-brava", cantidad: 0.04 }] },
  { id: "prod-alioli-patatas", nombre: "Patatas alioli", precioVenta: 5.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-patatas", cantidad: 0.25 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }, { ingredienteId: "ing-alioli", cantidad: 0.04 }] },
  { id: "prod-patatas-mixtas", nombre: "Patatas mixtas", precioVenta: 6, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-patatas", cantidad: 0.25 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }, { ingredienteId: "ing-salsa-brava", cantidad: 0.02 }, { ingredienteId: "ing-alioli", cantidad: 0.02 }] },
  { id: "prod-tortilla-racion", nombre: "Tortilla de patatas (ración)", precioVenta: 6.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-patatas", cantidad: 0.2 }, { ingredienteId: "ing-huevos", cantidad: 2 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.05 }] },
  { id: "prod-pincho-tortilla", nombre: "Pincho de tortilla", precioVenta: 2.8, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-patatas", cantidad: 0.08 }, { ingredienteId: "ing-huevos", cantidad: 0.8 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.02 }] },
  { id: "prod-calamares", nombre: "Calamares a la romana", precioVenta: 9.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-calamar", cantidad: 0.2 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.04 }] },
  { id: "prod-croquetas", nombre: "Croquetas de jamón (6u)", precioVenta: 7, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-croqueta", cantidad: 6 }] },
  { id: "prod-pulpo", nombre: "Pulpo a la gallega", precioVenta: 14, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pulpo", cantidad: 0.15 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.02 }] },
  { id: "prod-champinones", nombre: "Champiñones al ajillo", precioVenta: 6.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-champinon", cantidad: 0.2 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }] },
  { id: "prod-huevos-rotos", nombre: "Huevos rotos con jamón", precioVenta: 8.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-huevos", cantidad: 2 }, { ingredienteId: "ing-patatas", cantidad: 0.2 }, { ingredienteId: "ing-jamon-serrano", cantidad: 0.06 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }] },
  { id: "prod-pisto", nombre: "Pisto con huevo", precioVenta: 6.5, categoria: "Tapas Calientes", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pimiento-verde", cantidad: 0.1 }, { ingredienteId: "ing-tomate", cantidad: 0.15 }, { ingredienteId: "ing-huevos", cantidad: 1 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }] },
  // Montaditos y Bocadillos
  { id: "prod-mont-jamon", nombre: "Montadito de jamón", precioVenta: 2.2, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 0.5 }, { ingredienteId: "ing-jamon-serrano", cantidad: 0.03 }] },
  { id: "prod-mont-chorizo", nombre: "Montadito de chorizo", precioVenta: 2.2, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 0.5 }, { ingredienteId: "ing-chorizo", cantidad: 0.03 }] },
  { id: "prod-mont-morcilla", nombre: "Montadito de morcilla", precioVenta: 2.2, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 0.5 }, { ingredienteId: "ing-morcilla", cantidad: 0.03 }] },
  { id: "prod-mont-queso", nombre: "Montadito de queso", precioVenta: 2.2, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 0.5 }, { ingredienteId: "ing-queso-curado", cantidad: 0.03 }] },
  { id: "prod-mont-lomo", nombre: "Montadito de lomo", precioVenta: 2.3, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 0.5 }, { ingredienteId: "ing-lomo", cantidad: 0.03 }] },
  { id: "prod-boc-jamon", nombre: "Bocadillo de jamón", precioVenta: 5.5, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 1 }, { ingredienteId: "ing-jamon-serrano", cantidad: 0.08 }] },
  { id: "prod-boc-calamares", nombre: "Bocadillo de calamares", precioVenta: 6.5, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 1 }, { ingredienteId: "ing-calamar", cantidad: 0.15 }, { ingredienteId: "ing-aceite-oliva", cantidad: 0.03 }] },
  { id: "prod-boc-lomo", nombre: "Bocadillo de lomo", precioVenta: 5.8, categoria: "Montaditos y Bocadillos", tipo: "COMIDA", receta: [{ ingredienteId: "ing-pan", cantidad: 1 }, { ingredienteId: "ing-lomo", cantidad: 0.08 }] },
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
          { ingredienteId: "ing-cerveza-barril", cantidad: 30 },
          { ingredienteId: "ing-vino-tinto", cantidad: 10 },
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
