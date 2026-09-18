import { limitar, type Rect } from './fisica';

export type Estante = {
  /** Borde derecho de la tabla (la izquierda está pegada a la pared) */
  largo: number;
  /** Cara de arriba de la tabla */
  y: number;
  /** Alto libre sobre la tabla, hasta el estante de arriba (px) */
  espacio: number;
};

export type Lugar = { x: number; y: number; r: number };

export const CANTIDAD_ESTANTES = 4;
/** Alto de la tabla (px), con la cara de arriba incluida */
export const GROSOR = 20;
/** Dónde está el primer estante y cuánto los separa, como fracción del alto de la pantalla */
const PRIMERO = 0.27;
const SEPARACION = 0.175;
/** Largo de cada estante respecto al más largo: no todos miden lo mismo */
const LARGOS = [1, 0.74, 0.6, 0.82];
/** Las cajas se apoyan sobre la cara de arriba de la tabla, no en su borde (px) */
const HUNDIDO = 5;
/** El dibujo de la caja ocupa de x=5 a x=95 y de y=12 a y=104 en un SVG de 100×110 */
const ANCHO_VISIBLE = 0.9;
const ALTO_VISIBLE = 0.92;
/** Distancia del centro de la caja (y=58) a su base (y=104), en anchos */
const BASE_Y = 0.46;
const HUECO = 6;
const MARGEN = 12;

const CLAVE = 'regalos:estantes:v1';
const CLAVE_PLEGADO = 'regalos:estantes-plegados:v1';

/** Manivela que pliega la estantería, arriba del primer estante: centro de la rueda y radio (px) */
export const MANIVELA = { x: 80, y: 58, radio: 40 };
/** Cuánto dura el giro de la manivela, y con él el viaje de la estantería (ms) */
export const DURACION_PLIEGUE = 1400;
/** La misma curva en CSS (para la rueda) y en JS (para la estantería), así se mueven sincronizadas */
export const CURVA_PLIEGUE = 'cubic-bezier(0.65, 0, 0.35, 1)';
export function curvaPliegue(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function medirEstantes(ancho: number, alto: number): Estante[] {
  const largoMax = limitar(ancho * 0.2, 120, 280);
  const separacion = alto * SEPARACION;
  return LARGOS.map((f, i) => ({
    largo: largoMax * f,
    y: alto * (PRIMERO + SEPARACION * i),
    // Margen para la ménsula de la tabla de arriba y para que la tapa se levante al pasar el mouse
    espacio: Math.max(separacion - GROSOR - 22, 20),
  }));
}

/** Cuánto se corre la estantería hacia la pared para quedar oculta, cajas incluidas */
export function recorridoPliegue(estantes: Estante[]) {
  return Math.max(0, ...estantes.map((e) => e.largo)) + 40;
}

/** Paredes para la física: las tablas (corridas si la estantería se está plegando) y la manivela */
export function obstaculos(estantes: Estante[], corrimiento: number): Rect[] {
  const m = MANIVELA;
  return [
    ...estantes.map((e) => ({ x0: -GROSOR, y0: e.y, x1: e.largo + corrimiento, y1: e.y + GROSOR })),
    { x0: -GROSOR, y0: m.y - m.radio, x1: m.x + m.radio, y1: m.y + m.radio },
  ];
}

/** El estante sobre el que está un punto (el centro de la caja arrastrada), o null */
export function estanteEn(estantes: Estante[], x: number, y: number): number | null {
  for (let i = 0; i < estantes.length; i++) {
    const e = estantes[i];
    if (x <= e.largo + 16 && y >= e.y - e.espacio - GROSOR && y <= e.y + GROSOR * 1.5) return i;
  }
  return null;
}

/**
 * Pone las cajas en fila de izquierda a derecha, apoyadas en la tabla.
 * Si no caben a lo alto se achican, y si no caben a lo largo se achican todas por igual.
 */
export function acomodar(estante: Estante, anchos: number[]): Lugar[] {
  if (anchos.length === 0) return [];
  const huecos = HUECO * (anchos.length - 1);
  const disponible = estante.largo - MARGEN * 2;
  let medidas = anchos.map((w) => Math.min(w, estante.espacio / ALTO_VISIBLE));
  const total = medidas.reduce((suma, w) => suma + w * ANCHO_VISIBLE, 0);
  if (total + huecos > disponible) {
    const escala = Math.max(disponible - huecos, 10) / total;
    medidas = medidas.map((w) => w * escala);
  }

  const piso = estante.y + HUNDIDO;
  let x = MARGEN;
  return medidas.map((w) => {
    const visible = w * ANCHO_VISIBLE;
    const lugar = { x: x + visible / 2, y: piso - w * BASE_Y, r: w / 2 };
    x += visible + HUECO;
    return lugar;
  });
}

/** En qué posición de la fila cae una caja soltada en `x` */
export function posicionEn(lugares: Lugar[], x: number) {
  return lugares.filter((l) => l.x < x).length;
}

// Se guardan los links (no los índices) para que agregar o quitar regalos de la lista no mezcle los estantes

export function cargarEstantes(links: string[]): number[][] {
  const listas: number[][] = Array.from({ length: CANTIDAD_ESTANTES }, () => []);
  try {
    const guardado: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    if (!Array.isArray(guardado)) return listas;
    const usados = new Set<number>();
    guardado.slice(0, CANTIDAD_ESTANTES).forEach((lista, i) => {
      if (!Array.isArray(lista)) return;
      for (const link of lista) {
        const indice = links.indexOf(link);
        if (indice >= 0 && !usados.has(indice)) {
          usados.add(indice);
          listas[i].push(indice);
        }
      }
    });
  } catch {
    // Sin localStorage (modo privado, bloqueado) los estantes simplemente arrancan vacíos
  }
  return listas;
}

export function guardarEstantes(listas: number[][], links: string[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(listas.map((lista) => lista.map((i) => links[i]))));
  } catch {
    // Si no se puede guardar, los estantes duran hasta recargar la página
  }
}

export function cargarPlegado(): boolean {
  try {
    return localStorage.getItem(CLAVE_PLEGADO) === '1';
  } catch {
    return false;
  }
}

export function guardarPlegado(plegado: boolean) {
  try {
    localStorage.setItem(CLAVE_PLEGADO, plegado ? '1' : '0');
  } catch {
    // Sin localStorage la estantería vuelve a aparecer extendida al recargar
  }
}
