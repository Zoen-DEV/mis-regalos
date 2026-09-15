export type Cuerpo = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Grados, siempre entre -180 y 180 */
  angulo: number;
  /** Grados por segundo */
  giro: number;
  /** Radio del círculo de choque (la mitad del ancho de la caja) */
  r: number;
  /** Velocidad a la que tiende a flotar (px/s) */
  crucero: number;
  /** Giro al que tiende (grados/s) */
  giroCrucero: number;
  /** Se frena y se endereza: mouse encima, caja abierta o sostenida */
  quieto: boolean;
  /** Su posición la controla el puntero */
  arrastrado: boolean;
};

const PASO = 1 / 120;
const MAX_PASOS = 8;
const REBOTE = 0.9;
const REBOTE_PARED = 0.85;
const VELOCIDAD_MAX = 1600;
const GIRO_MAX = 220;
/** Máximo que se separan dos cajas encimadas en un paso, para que no salten (px) */
const SEPARACION_MAX = 4;
/** Fracción de la pantalla que pueden ocupar las cajas */
const OCUPACION = 0.26;

export function limitar(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max);
}

function aleatorio(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function normalizarAngulo(angulo: number) {
  return ((((angulo + 180) % 360) + 360) % 360) - 180;
}

/** Fracción del camino que recorre en `dt` algo que se acerca a su objetivo a `tasa` por segundo */
function suavizado(tasa: number, dt: number) {
  return 1 - Math.exp(-tasa * dt);
}

function masaInversa(c: Cuerpo) {
  return c.quieto || c.arrastrado ? 0 : 1 / (c.r * c.r);
}

/** Ancho (px) de la caja más chica, para que todas quepan con espacio de sobra para flotar */
export function medirBase(ancho: number, alto: number, factores: number[]) {
  const sumaCuadrados = factores.reduce((suma, f) => suma + f * f, 0);
  const mayor = Math.max(1, ...factores);
  // El círculo de choque de cada caja ocupa π·(ancho/2)²
  const porArea = Math.sqrt((OCUPACION * ancho * alto) / ((Math.PI / 4) * Math.max(sumaCuadrados, 1)));
  const porLado = (Math.min(ancho, alto) * 0.42) / mayor;
  return limitar(Math.min(porArea, porLado), 36, 110);
}

export function crearCuerpos(
  factores: number[],
  base: number,
  ancho: number,
  alto: number,
  sinMovimiento: boolean,
): Cuerpo[] {
  const velocidadBase = limitar(Math.min(ancho, alto) * 0.09, 30, 85);

  const cuerpos = factores.map((f): Cuerpo => {
    // Las cajas grandes flotan y giran más lento, como si pesaran más
    const crucero = (velocidadBase * aleatorio(0.85, 1.15)) / Math.sqrt(f);
    const giroCrucero = ((Math.random() < 0.5 ? -1 : 1) * aleatorio(12, 36)) / Math.sqrt(f);
    const direccion = Math.random() * Math.PI * 2;
    const rapidez = sinMovimiento ? 0 : crucero;
    return {
      x: 0,
      y: 0,
      vx: Math.cos(direccion) * rapidez,
      vy: Math.sin(direccion) * rapidez,
      angulo: sinMovimiento ? 0 : aleatorio(-180, 180),
      giro: sinMovimiento ? 0 : giroCrucero,
      r: (f * base) / 2,
      crucero,
      giroCrucero,
      quieto: false,
      arrastrado: false,
    };
  });

  // Coloca primero las más grandes, buscando lugares donde no se encimen
  const colocados: Cuerpo[] = [];
  for (const c of [...cuerpos].sort((a, b) => b.r - a.r)) {
    for (let intento = 0; intento < 300; intento++) {
      c.x = aleatorio(c.r, Math.max(c.r, ancho - c.r));
      c.y = aleatorio(c.r, Math.max(c.r, alto - c.r));
      if (colocados.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > o.r + c.r + 12)) break;
    }
    colocados.push(c);
  }

  return cuerpos;
}

export class Simulacion {
  cuerpos: Cuerpo[] = [];
  ancho = 0;
  alto = 0;
  sinMovimiento = false;
  private acumulado = 0;

  /** Avanza la simulación con pasos fijos: el resultado no depende de los FPS */
  avanzar(dt: number) {
    // Al volver de otra pestaña dt puede ser enorme: se limita para que nada salga disparado
    this.acumulado += limitar(dt, 0, 0.1);
    let pasos = 0;
    while (this.acumulado >= PASO && pasos < MAX_PASOS) {
      this.paso(PASO);
      this.acumulado -= PASO;
      pasos++;
    }
    if (pasos === MAX_PASOS) this.acumulado = 0;
  }

  private paso(dt: number) {
    for (const c of this.cuerpos) this.mover(c, dt);
    this.chocar();
    for (const c of this.cuerpos) this.contener(c);
  }

  private mover(c: Cuerpo, dt: number) {
    if (c.arrastrado) {
      // Se inclina un poco hacia donde lo lleva el puntero
      const inclinacion = limitar(c.vx * 0.02, -20, 20);
      c.angulo = normalizarAngulo(c.angulo + normalizarAngulo(inclinacion - c.angulo) * suavizado(12, dt));
      c.giro = 0;
      return;
    }

    if (c.quieto) {
      const frenado = suavizado(14, dt);
      c.vx -= c.vx * frenado;
      c.vy -= c.vy * frenado;
      c.angulo = normalizarAngulo(c.angulo - c.angulo * suavizado(10, dt));
      c.giro = 0;
    } else {
      this.gobernar(c, dt);
      c.angulo = normalizarAngulo(c.angulo + c.giro * dt);
    }

    c.x += c.vx * dt;
    c.y += c.vy * dt;
  }

  /** Mantiene cada caja a su velocidad de crucero: las lanzadas se calman y las frenadas retoman */
  private gobernar(c: Cuerpo, dt: number) {
    const objetivo = this.sinMovimiento ? 0 : c.crucero;
    const rapidez = Math.hypot(c.vx, c.vy);
    const tasa = rapidez > objetivo ? (this.sinMovimiento ? 3 : 1.2) : 0.8;
    const nueva = Math.min(rapidez + (objetivo - rapidez) * suavizado(tasa, dt), VELOCIDAD_MAX);

    if (rapidez > 0.001) {
      c.vx *= nueva / rapidez;
      c.vy *= nueva / rapidez;
    } else if (nueva > 0) {
      const direccion = Math.random() * Math.PI * 2;
      c.vx = Math.cos(direccion) * nueva;
      c.vy = Math.sin(direccion) * nueva;
    }

    const giroObjetivo = this.sinMovimiento ? 0 : c.giroCrucero;
    c.giro = limitar(c.giro + (giroObjetivo - c.giro) * suavizado(0.8, dt), -GIRO_MAX, GIRO_MAX);
  }

  private chocar() {
    const cuerpos = this.cuerpos;
    for (let i = 0; i < cuerpos.length; i++) {
      const a = cuerpos[i];
      const invA = masaInversa(a);

      for (let j = i + 1; j < cuerpos.length; j++) {
        const b = cuerpos[j];
        const invB = masaInversa(b);
        const inv = invA + invB;
        if (inv === 0) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minima = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minima * minima) continue;

        const dist = Math.sqrt(d2);
        const nx = dist > 0.0001 ? dx / dist : 1;
        const ny = dist > 0.0001 ? dy / dist : 0;

        // Separa las cajas encimadas: la más liviana se mueve más, las quietas no se mueven
        const separacion = Math.min(minima - dist, SEPARACION_MAX);
        a.x -= nx * separacion * (invA / inv);
        a.y -= ny * separacion * (invA / inv);
        b.x += nx * separacion * (invB / inv);
        b.y += ny * separacion * (invB / inv);

        // Rebote, solo si se están acercando
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const normal = rvx * nx + rvy * ny;
        if (normal >= 0) continue;

        const impulso = (-(1 + REBOTE) * normal) / inv;
        a.vx -= impulso * invA * nx;
        a.vy -= impulso * invA * ny;
        b.vx += impulso * invB * nx;
        b.vy += impulso * invB * ny;

        // El roce al chocar de costado les cambia un poco el giro
        const tangencial = -rvx * ny + rvy * nx;
        a.giro += tangencial * 0.25 * (invA / inv);
        b.giro += tangencial * 0.25 * (invB / inv);
      }
    }
  }

  private contener(c: Cuerpo) {
    const maxX = Math.max(c.r, this.ancho - c.r);
    const maxY = Math.max(c.r, this.alto - c.r);
    const rebotar = (v: number) => (c.arrastrado ? v : c.quieto ? 0 : -v * REBOTE_PARED);

    if (c.x < c.r) {
      c.x = c.r;
      if (c.vx < 0) c.vx = rebotar(c.vx);
    } else if (c.x > maxX) {
      c.x = maxX;
      if (c.vx > 0) c.vx = rebotar(c.vx);
    }

    if (c.y < c.r) {
      c.y = c.r;
      if (c.vy < 0) c.vy = rebotar(c.vy);
    } else if (c.y > maxY) {
      c.y = maxY;
      if (c.vy > 0) c.vy = rebotar(c.vy);
    }

    // Red de seguridad: si algo se volvió NaN, la caja vuelve al centro en vez de desaparecer
    if (!Number.isFinite(c.x + c.y + c.vx + c.vy + c.angulo + c.giro)) {
      c.x = this.ancho / 2;
      c.y = this.alto / 2;
      c.vx = 0;
      c.vy = 0;
      c.angulo = 0;
      c.giro = 0;
    }
  }
}
