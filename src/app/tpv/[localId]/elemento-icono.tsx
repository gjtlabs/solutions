export type TipoElemento = "PUERTA" | "ESCALERA" | "PARED";

export const NOMBRE_ELEMENTO: Record<TipoElemento, string> = {
  PUERTA: "Puerta",
  ESCALERA: "Escalera",
  PARED: "Pared",
};

// Símbolos sencillos tipo "plano de arquitecto" — solo trazo, sin color de
// marca ni semántico (son elementos estructurales, no estados de negocio).
export function ElementoIcono({ tipo }: { tipo: TipoElemento }) {
  if (tipo === "PARED") {
    // La pared no lleva icono: es la propia barra sólida quien la representa.
    return null;
  }

  if (tipo === "PUERTA") {
    // Solo la hoja y el arco de barrido — el símbolo mínimo que cualquier
    // plano de arquitecto usa para una puerta, sin línea de suelo de más.
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full text-text-faint" fill="none">
        <line x1="8" y1="92" x2="8" y2="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M8,10 A82,82 0 0 1 90,92" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    );
  }

  // ESCALERA — perfil de peldaños ascendentes en un solo trazo, con una
  // pequeña flecha final indicando el sentido de subida. Igual que la
  // puerta, monocromo: es un elemento estructural, no lleva color de marca.
  return (
    <svg viewBox="0 0 60 100" className="h-full w-full text-text-faint" fill="none">
      <path
        d="M8,92 V78 H22 V64 H36 V50 H50 V24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M43,32 L50,22 L57,32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
