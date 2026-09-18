import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as EventoPuntero } from 'react';
import type { Regalo } from '../data/regalos';
import { colorPorIndice } from '../lib/colores';
import {
  acomodar,
  cargarEstantes,
  cargarPlegado,
  curvaPliegue,
  DURACION_PLIEGUE,
  estanteEn,
  guardarEstantes,
  guardarPlegado,
  medirEstantes,
  obstaculos,
  posicionEn,
  recorridoPliegue,
  type Estante,
} from '../lib/estantes';
import { crearCuerpos, limitar, medirBase, Simulacion, type Cuerpo } from '../lib/fisica';
import { factorDeRegalo, tamanoPorPrecio } from '../lib/precio';
import GiftBox, { type Patron } from './GiftBox';
import GiftCard from './GiftCard';
import Manivela from './Manivela';
import TablaEstante from './TablaEstante';

const PATRONES: Patron[] = ['liso', 'lunares', 'liso', 'rayas', 'liso', 'lunares'];
const ESPERA_TAPA_MS = 380;
const TITULO_ID = 'tarjeta-titulo';
/** Altura del centro de la caja respecto a su ancho: el SVG mide 100×110 y la caja está centrada en y=58 */
const CENTRO_Y = 0.58;
/** Cuánto hay que mover el puntero (px) para que deje de ser un click y pase a ser un arrastre */
const UMBRAL_ARRASTRE = 6;
/** Velocidad máxima al lanzar una caja (px/s) */
const LANZAMIENTO_MAX = 1400;
/** Si se suelta más rápido que esto, el mouse no frena la caja mientras sale disparada (px/s) */
const LANZAMIENTO_MIN = 150;

type Props = {
  regalos: Regalo[];
};

type Muestra = { t: number; x: number; y: number };

/** Viaje de la estantería: 0 = extendida, 1 = plegada contra la pared */
type Pliegue = { desde: number; hasta: number; inicio: number; duracion: number };

function fraccionPlegada(p: Pliegue, ahora: number) {
  const t = p.duracion > 0 ? limitar((ahora - p.inicio) / p.duracion, 0, 1) : 1;
  return p.desde + (p.hasta - p.desde) * curvaPliegue(t);
}

type Arrastre = {
  indice: number;
  puntero: number;
  inicioX: number;
  inicioY: number;
  desfaseX: number;
  desfaseY: number;
  moviendo: boolean;
  muestras: Muestra[];
};

function pintar(nodo: HTMLElement, c: Cuerpo) {
  // El nodo mide siempre el tamaño libre; en los estantes se achica con scale desde su centro
  const escala = c.r / c.rLibre;
  nodo.style.transform =
    `translate3d(${c.x - c.rLibre}px, ${c.y - c.rLibre * 2 * CENTRO_Y}px, 0) ` +
    `rotate(${c.angulo}deg) scale(${escala})`;
  nodo.classList.toggle('arriba', c.quieto || c.arrastrado);
  nodo.classList.toggle('arrastrando', c.arrastrado);
  // La animación del hover arranca cuando la caja ya se enderezó
  nodo.classList.toggle('enfocado', c.quieto && Math.abs(c.angulo) < 4);
}

function velocidad(muestras: Muestra[]) {
  const a = muestras[0];
  const b = muestras[muestras.length - 1];
  const dt = (b.t - a.t) / 1000;
  if (dt < 0.01) return { x: 0, y: 0 };
  const x = (b.x - a.x) / dt;
  const y = (b.y - a.y) / dt;
  const rapidez = Math.hypot(x, y);
  const escala = rapidez > LANZAMIENTO_MAX ? LANZAMIENTO_MAX / rapidez : 1;
  return { x: x * escala, y: y * escala };
}

export default function GiftGrid({ regalos }: Props) {
  const [tapaAbierta, setTapaAbierta] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [base, setBase] = useState<number | null>(null);
  const [estantes, setEstantes] = useState<Estante[]>([]);
  const [plegado, setPlegado] = useState(cargarPlegado);
  const [sim] = useState(() => new Simulacion());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const campoRef = useRef<HTMLUListElement>(null);
  const nodosRef = useRef<(HTMLLIElement | null)[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  // Estado de la interacción que lee el bucle de animación (en refs para no re-renderizar cada cuadro)
  const abiertoRef = useRef<number | null>(null);
  const focoRef = useRef<number | null>(null);
  const tecladoRef = useRef(false);
  const arrastreRef = useRef<Arrastre | null>(null);
  const clickAnuladoRef = useRef(false);
  const ignorarHoverRef = useRef(new Set<number>());
  // Qué regalos hay en cada estante, en orden de izquierda a derecha (índices de `regalos`)
  const listasRef = useRef<number[][]>([]);
  const estantesRef = useRef<Estante[]>([]);
  const tablasRef = useRef<(HTMLDivElement | null)[]>([]);
  const estanteriaRef = useRef<HTMLDivElement>(null);
  const plegadoRef = useRef(plegado);
  const pliegueRef = useRef<Pliegue>({ desde: plegado ? 1 : 0, hasta: plegado ? 1 : 0, inicio: 0, duracion: 0 });

  const items = regalos.map((regalo, i) => {
    const tamano = tamanoPorPrecio(regalo.precio);
    return {
      regalo,
      tamano,
      factor: factorDeRegalo(regalo),
      color: regalo.color ?? colorPorIndice(i),
      patron: PATRONES[i % PATRONES.length],
    };
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (seleccion !== null && dialog && !dialog.open) dialog.showModal();
  }, [seleccion]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    const campo = campoRef.current;
    if (!campo || regalos.length === 0) return;

    const factores = regalos.map(factorDeRegalo);
    const links = regalos.map((r) => r.link);
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

    sim.sinMovimiento = sinMovimiento.matches;
    sim.cuerpos = [];
    listasRef.current = cargarEstantes(links);

    let corrimientoAnterior = 0;

    /**
     * Calcula el lugar de cada caja en los estantes. Si se está arrastrando una caja sobre un estante,
     * las demás le hacen lugar donde caería y ella se achica al tamaño que tendría ahí.
     * También mueve la estantería mientras se pliega o se extiende.
     */
    function acomodarEstantes(ahora: number) {
      const arrastre = arrastreRef.current;
      const movido = arrastre?.moviendo ? arrastre.indice : null;
      const geo = estantesRef.current;
      const corrimiento = -recorridoPliegue(geo) * fraccionPlegada(pliegueRef.current, ahora);
      const estanteria = estanteriaRef.current;
      if (estanteria) estanteria.style.transform = corrimiento ? `translate3d(${corrimiento}px, 0, 0)` : '';
      sim.obstaculos = obstaculos(geo, corrimiento);

      // Solo se puede dejar un regalo con la estantería extendida del todo
      const destino =
        movido !== null && corrimiento === 0 ? estanteEn(geo, sim.cuerpos[movido].x, sim.cuerpos[movido].y) : null;

      for (const c of sim.cuerpos) {
        c.ancla = null;
        c.rObjetivo = c.rLibre;
      }

      geo.forEach((estante, e) => {
        const fila = (listasRef.current[e] ?? []).filter((i) => i !== movido);
        const anchos = () => fila.map((i) => sim.cuerpos[i].rLibre * 2);
        if (e === destino && movido !== null) {
          fila.splice(posicionEn(acomodar(estante, anchos()), sim.cuerpos[movido].x), 0, movido);
        }
        acomodar(estante, anchos()).forEach((lugar, k) => {
          const c = sim.cuerpos[fila[k]];
          c.rObjetivo = lugar.r;
          if (fila[k] !== movido) c.ancla = { x: lugar.x + corrimiento, y: lugar.y };
        });
      });

      // Las cajas viajan pegadas a la estantería: si solo siguieran a su ancla quedarían atrás
      const delta = corrimiento - corrimientoAnterior;
      corrimientoAnterior = corrimiento;
      if (delta !== 0) for (const c of sim.cuerpos) if (c.ancla && !c.arrastrado) c.x += delta;

      tablasRef.current.forEach((nodo, e) => nodo?.classList.toggle('destino', e === destino));
    }

    /** Pone las cajas de los estantes directo en su lugar, sin animar */
    function asentar() {
      acomodarEstantes(performance.now());
      for (const c of sim.cuerpos) {
        if (!c.ancla) continue;
        c.x = c.ancla.x;
        c.y = c.ancla.y;
        c.r = c.rObjetivo;
        c.vx = 0;
        c.vy = 0;
        c.angulo = 0;
        c.giro = 0;
      }
    }

    // Se mide con ResizeObserver: el CSS puede aplicarse después de montar y el campo mediría 0.
    // También cubre cambios de tamaño de la ventana y de la barra del navegador en el celular.
    const observador = new ResizeObserver(() => {
      const ancho = campo.clientWidth;
      const alto = campo.clientHeight;
      if (ancho === 0 || alto === 0) return;
      sim.ancho = ancho;
      sim.alto = alto;
      const geo = medirEstantes(ancho, alto);
      estantesRef.current = geo;
      const nuevaBase = medirBase(ancho, alto, factores);
      if (sim.cuerpos.length === 0) {
        sim.cuerpos = crearCuerpos(factores, nuevaBase, ancho, alto, sim.sinMovimiento);
      } else {
        sim.cuerpos.forEach((c, i) => {
          c.rLibre = (factores[i] * nuevaBase) / 2;
          c.r = c.rLibre;
        });
      }
      asentar();
      setEstantes(geo);
      setBase(nuevaBase);
    });
    observador.observe(campo);

    let mouse: { x: number; y: number } | null = null;
    let hover: number | null = null;

    function dentro(i: number, x: number, y: number, escala: number) {
      const c = sim.cuerpos[i];
      return Math.hypot(x - c.x, y - c.y) < c.r * escala;
    }

    function actualizarInteraccion(ahora: number) {
      const arrastre = arrastreRef.current;
      const ignorar = ignorarHoverRef.current;

      if (!mouse) ignorar.clear();
      else for (const i of ignorar) if (!dentro(i, mouse.x, mouse.y, 1)) ignorar.delete(i);

      if (!mouse || abiertoRef.current !== null || arrastre?.moviendo) {
        hover = null;
      } else {
        if (hover !== null && !dentro(hover, mouse.x, mouse.y, 1)) hover = null;
        // Hit test propio en vez de :hover, así también se frenan las cajas que llegan solas al cursor
        for (let i = sim.cuerpos.length - 1; hover === null && i >= 0; i--) {
          if (!ignorar.has(i) && dentro(i, mouse.x, mouse.y, 0.85)) hover = i;
        }
      }

      sim.cuerpos.forEach((c, i) => {
        const sujeto = arrastre !== null && arrastre.indice === i;
        c.arrastrado = sujeto && arrastre.moviendo;
        c.quieto =
          !c.arrastrado && (sujeto || i === hover || i === abiertoRef.current || i === focoRef.current);
      });

      // Si el puntero se detiene mientras arrastra, la caja deja de empujar a las demás
      if (arrastre?.moviendo && ahora - arrastre.muestras[arrastre.muestras.length - 1].t > 50) {
        const c = sim.cuerpos[arrastre.indice];
        c.vx = 0;
        c.vy = 0;
      }
    }

    let raf = 0;
    let anterior = performance.now();
    function cuadro(ahora: number) {
      actualizarInteraccion(ahora);
      acomodarEstantes(ahora);
      sim.avanzar((ahora - anterior) / 1000);
      anterior = ahora;
      sim.cuerpos.forEach((c, i) => {
        const nodo = nodosRef.current[i];
        if (nodo) pintar(nodo, c);
      });
      raf = requestAnimationFrame(cuadro);
    }
    raf = requestAnimationFrame(cuadro);

    function alMoverPuntero(e: PointerEvent) {
      if (e.pointerType === 'mouse') mouse = { x: e.clientX, y: e.clientY };
    }
    function alSalirDeLaVentana(e: MouseEvent) {
      if (!e.relatedTarget) mouse = null;
    }
    function alPresionarTecla(e: KeyboardEvent) {
      // Solo navegar con Tab frena la caja enfocada: cerrar con Esc usando el mouse no debe dejarla quieta
      if (e.key === 'Tab') tecladoRef.current = true;
    }
    function alPresionarPuntero() {
      tecladoRef.current = false;
    }
    function alCambiarPreferencia(e: MediaQueryListEvent) {
      sim.sinMovimiento = e.matches;
    }

    window.addEventListener('pointermove', alMoverPuntero);
    document.addEventListener('mouseout', alSalirDeLaVentana);
    window.addEventListener('keydown', alPresionarTecla, true);
    window.addEventListener('pointerdown', alPresionarPuntero, true);
    sinMovimiento.addEventListener('change', alCambiarPreferencia);

    return () => {
      cancelAnimationFrame(raf);
      observador.disconnect();
      window.removeEventListener('pointermove', alMoverPuntero);
      document.removeEventListener('mouseout', alSalirDeLaVentana);
      window.removeEventListener('keydown', alPresionarTecla, true);
      window.removeEventListener('pointerdown', alPresionarPuntero, true);
      sinMovimiento.removeEventListener('change', alCambiarPreferencia);
    };
  }, [regalos, sim]);

  function abrir(i: number) {
    if (tapaAbierta !== null) return;
    abiertoRef.current = i;
    setTapaAbierta(i);
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timerRef.current = window.setTimeout(() => setSeleccion(i), sinMovimiento ? 0 : ESPERA_TAPA_MS);
  }

  function alCerrar() {
    window.clearTimeout(timerRef.current);
    abiertoRef.current = null;
    setSeleccion(null);
    setTapaAbierta(null);
  }

  function cerrar() {
    dialogRef.current?.close();
    alCerrar();
  }

  function alPresionar(e: EventoPuntero<HTMLButtonElement>, i: number) {
    clickAnuladoRef.current = false;
    if (e.button !== 0 || arrastreRef.current || abiertoRef.current !== null) return;
    const c = sim.cuerpos[i];
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = {
      indice: i,
      puntero: e.pointerId,
      inicioX: e.clientX,
      inicioY: e.clientY,
      desfaseX: e.clientX - c.x,
      desfaseY: e.clientY - c.y,
      moviendo: false,
      muestras: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
    };
  }

  function alArrastrar(e: EventoPuntero<HTMLButtonElement>) {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.puntero !== e.pointerId) return;
    if (!arrastre.moviendo) {
      if (Math.hypot(e.clientX - arrastre.inicioX, e.clientY - arrastre.inicioY) < UMBRAL_ARRASTRE) return;
      arrastre.moviendo = true;
    }

    const muestras = arrastre.muestras;
    muestras.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    // Solo los últimos ~80 ms cuentan para la velocidad del lanzamiento
    while (muestras.length > 2 && e.timeStamp - muestras[0].t > 80) muestras.shift();

    const c = sim.cuerpos[arrastre.indice];
    const v = velocidad(muestras);
    c.x = e.clientX - arrastre.desfaseX;
    c.y = e.clientY - arrastre.desfaseY;
    c.vx = v.x;
    c.vy = v.y;
  }

  function alSoltar(e: EventoPuntero<HTMLButtonElement>, lanzar: boolean) {
    const arrastre = arrastreRef.current;
    if (!arrastre || arrastre.puntero !== e.pointerId) return;
    arrastreRef.current = null;
    if (!arrastre.moviendo) return;

    // Fue un arrastre: el click que viene después no debe abrir la caja
    clickAnuladoRef.current = true;
    const c = sim.cuerpos[arrastre.indice];

    // Si cae sobre un estante queda reservado ahí; si no, vuelve a flotar
    const listas = listasRef.current.map((fila) => fila.filter((i) => i !== arrastre.indice));
    const geo = estantesRef.current;
    const extendida = fraccionPlegada(pliegueRef.current, performance.now()) === 0;
    const destino = extendida ? estanteEn(geo, c.x, c.y) : null;
    if (destino !== null) {
      const fila = listas[destino];
      const lugares = acomodar(geo[destino], fila.map((i) => sim.cuerpos[i].rLibre * 2));
      fila.splice(posicionEn(lugares, c.x), 0, arrastre.indice);
    }
    listasRef.current = listas;
    guardarEstantes(listas, regalos.map((r) => r.link));

    if (destino !== null) {
      c.vx = 0;
      c.vy = 0;
      c.giro = 0;
      return;
    }

    const ultima = arrastre.muestras[arrastre.muestras.length - 1];
    const v = lanzar && e.timeStamp - ultima.t < 60 ? velocidad(arrastre.muestras) : { x: 0, y: 0 };
    c.vx = v.x;
    c.vy = v.y;
    c.giro = limitar(v.x * 0.15, -200, 200);
    if (Math.hypot(v.x, v.y) > LANZAMIENTO_MIN) ignorarHoverRef.current.add(arrastre.indice);
  }

  function alternarEstantes() {
    const ahora = performance.now();
    const nuevo = !plegadoRef.current;
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pliegueRef.current = {
      desde: fraccionPlegada(pliegueRef.current, ahora),
      hasta: nuevo ? 1 : 0,
      inicio: ahora,
      duracion: sinMovimiento ? 0 : DURACION_PLIEGUE,
    };
    plegadoRef.current = nuevo;
    setPlegado(nuevo);
    guardarPlegado(nuevo);
  }

  if (items.length === 0) {
    return <p className="vacio">Todavía no hay regalos en la lista… ¡vuelve pronto! 🎈</p>;
  }

  const actual = seleccion !== null ? items[seleccion] : null;

  return (
    <>
      <div className="estanteria" ref={estanteriaRef} aria-hidden="true">
        {estantes.map((estante, i) => (
          <div
            key={i}
            ref={(nodo) => {
              tablasRef.current[i] = nodo;
            }}
            className="estante"
            style={{ top: `${estante.y}px` }}
          >
            <TablaEstante largo={estante.largo} variante={i} />
          </div>
        ))}
      </div>

      <ul className="campo" ref={campoRef}>
        {base !== null &&
          items.map(({ regalo, factor, color, patron }, i) => (
            <li
              key={`${i}-${regalo.link}`}
              ref={(nodo) => {
                nodosRef.current[i] = nodo;
                const cuerpo = sim.cuerpos[i];
                if (nodo && cuerpo) pintar(nodo, cuerpo);
              }}
              className="regalo"
              style={{ '--ancho': `${factor * base}px`, '--retraso': `${i * 60}ms` } as CSSProperties}
            >
              <button
                type="button"
                className="regalo-btn"
                aria-label={`Abrir regalo: ${regalo.nombre}`}
                aria-haspopup="dialog"
                onPointerDown={(e) => alPresionar(e, i)}
                onPointerMove={alArrastrar}
                onPointerUp={(e) => alSoltar(e, true)}
                onPointerCancel={(e) => alSoltar(e, false)}
                onClick={() => {
                  if (clickAnuladoRef.current) {
                    clickAnuladoRef.current = false;
                    return;
                  }
                  abrir(i);
                }}
                onFocus={() => {
                  // Con teclado la caja se detiene para poder elegirla
                  if (tecladoRef.current) focoRef.current = i;
                }}
                onBlur={() => {
                  if (focoRef.current === i) focoRef.current = null;
                }}
              >
                <GiftBox color={color} patron={patron} abierta={tapaAbierta === i} />
              </button>
            </li>
          ))}
      </ul>

      <Manivela plegado={plegado} onAlternar={alternarEstantes} />

      <dialog
        ref={dialogRef}
        className="tarjeta-dialog"
        aria-labelledby={TITULO_ID}
        onClose={alCerrar}
        onKeyDown={(e) => {
          // No todos los navegadores cierran el <dialog> con Esc de forma confiable
          if (e.key === 'Escape') {
            e.preventDefault();
            cerrar();
          }
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
      >
        {actual && (
          <GiftCard
            key={seleccion}
            regalo={actual.regalo}
            color={actual.color}
            tamano={actual.tamano}
            tituloId={TITULO_ID}
            onCerrar={cerrar}
          />
        )}
      </dialog>
    </>
  );
}
