/** Contorno de todos los dibujos (cajas y estantes) */
export const TINTA = '#2B2140';

export type ColorCaja = 'rojo' | 'turquesa' | 'amarillo' | 'morado' | 'verde' | 'rosa' | 'azul';

type Tonos = {
  caja: string;
  sombra: string;
  cinta: string;
};

// Colores claros a propósito: el texto oscuro (--tinta) se lee bien encima de todos.
export const PALETA: Record<ColorCaja, Tonos> = {
  rojo: { caja: '#FF6B6B', sombra: '#D94F4F', cinta: '#FFD23F' },
  turquesa: { caja: '#3CCFC0', sombra: '#25A396', cinta: '#FF8FC0' },
  amarillo: { caja: '#FFC93C', sombra: '#E0A91F', cinta: '#FF6B6B' },
  morado: { caja: '#A98BFF', sombra: '#8467E0', cinta: '#7BE0AD' },
  verde: { caja: '#5FD68A', sombra: '#3FB26A', cinta: '#FFF6E0' },
  rosa: { caja: '#FF8FC0', sombra: '#E46BA2', cinta: '#3CCFC0' },
  azul: { caja: '#5AB8FF', sombra: '#3A95DB', cinta: '#FFD23F' },
};

const ORDEN: ColorCaja[] = ['rojo', 'turquesa', 'amarillo', 'morado', 'verde', 'rosa', 'azul'];

export function colorPorIndice(i: number): ColorCaja {
  return ORDEN[i % ORDEN.length];
}
