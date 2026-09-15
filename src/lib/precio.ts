export type Tamano = 'chiquito' | 'mediano' | 'grande' | 'gigante';

// Precios en pesos colombianos. Cambia estos valores para ajustar los tamaños.
export const UMBRALES = {
  mediano: 100_000,
  grande: 400_000,
  gigante: 1_500_000,
} as const;

const formato = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatearPrecio(precio: number): string {
  return formato.format(precio);
}

export function tamanoPorPrecio(precio: number): Tamano {
  if (precio >= UMBRALES.gigante) return 'gigante';
  if (precio >= UMBRALES.grande) return 'grande';
  if (precio >= UMBRALES.mediano) return 'mediano';
  return 'chiquito';
}

export const ORDEN_TAMANOS: Tamano[] = ['chiquito', 'mediano', 'grande', 'gigante'];

/** Ancho relativo de cada caja (la más chica mide 1) */
export const FACTOR_TAMANO: Record<Tamano, number> = {
  chiquito: 1,
  mediano: 1.36,
  grande: 1.82,
  gigante: 2.36,
};

export const TAMANOS: Record<Tamano, { nombre: string; rango: string }> = {
  chiquito: {
    nombre: 'Detallito',
    rango: `menos de ${formatearPrecio(UMBRALES.mediano)}`,
  },
  mediano: {
    nombre: 'Regalo mediano',
    rango: `${formatearPrecio(UMBRALES.mediano)} – ${formatearPrecio(UMBRALES.grande)}`,
  },
  grande: {
    nombre: 'Regalo grande',
    rango: `${formatearPrecio(UMBRALES.grande)} – ${formatearPrecio(UMBRALES.gigante)}`,
  },
  gigante: {
    nombre: '¡Regalazo!',
    rango: `más de ${formatearPrecio(UMBRALES.gigante)}`,
  },
};
