import { useRef } from 'react';
import { TINTA } from '../lib/colores';
import { CURVA_PLIEGUE, DURACION_PLIEGUE, MANIVELA } from '../lib/estantes';

type Props = {
  plegado: boolean;
  onAlternar: () => void;
};

// Hierro oscuro como el del boceto, pero no negro: tiene que despegarse del cielo
const HIERRO = {
  aro: '#5B5580',
  rayo: '#4A4469',
  claro: '#8C85B8',
  oscuro: '#353049',
  buje: '#9A95B2',
  bujeClaro: '#C4BFD9',
};
const METAL = '#CDD2E0';

/** Vueltas completas por giro: la rueda termina igual que empezó */
const VUELTAS = 2;
/** Radios del aro en el viewBox de 100×100 de la rueda */
const ARO_EXTERIOR = 38;
const ARO_INTERIOR = 29;
const RAYOS = [90, 210, 330];
/** El mango sale del aro arriba a la derecha (grados) */
const MANGO = -50;

/** Distancia entre eslabones y largo de cada uno (se enganchan unos con otros) */
const PASO = 10;
const LARGO = 13.5;
/** Alto de los eslabones planos y grosor de su contorno: definen qué tan fina es la cadena */
const ALTO_ESLABON = 6.4;
const CONTORNO = 3.4;
/**
 * Distancia de cada tramo de cadena al centro de la rueda (px): justo adentro del aro, así el final
 * de la cadena queda escondido detrás de la rueda en vez de verse cortado.
 */
const SEPARACION = Math.round((ARO_EXTERIOR / 100) * MANIVELA.radio * 2 - (ALTO_ESLABON + CONTORNO) / 2 - 0.5);
/**
 * Lo que avanza la cadena en un giro: lo que recorre el borde de la rueda, redondeado a un par de
 * eslabones (uno plano y uno de canto) para que al terminar la cadena también se vea igual que antes.
 */
const RECORRIDO = Math.round((SEPARACION * 2 * Math.PI * VUELTAS) / (2 * PASO)) * 2 * PASO;
const MARGEN_CADENA = 8;

function polar(radio: number, grados: number) {
  const a = (grados * Math.PI) / 180;
  return { x: 50 + radio * Math.cos(a), y: 50 + radio * Math.sin(a) };
}

/** Aro con el borde de adentro ondulado, para agarrarlo con los dedos */
function trazarAro() {
  const e = ARO_EXTERIOR;
  const exterior = `M${50 - e} 50 A${e} ${e} 0 1 0 ${50 + e} 50 A${e} ${e} 0 1 0 ${50 - e} 50 Z`;
  const puntos: string[] = [];
  for (let i = 0; i < 90; i++) {
    const grados = (i / 90) * 360;
    const p = polar(ARO_INTERIOR + 1.6 * Math.cos((grados * 9 * Math.PI) / 180), grados);
    puntos.push(`${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
  }
  return `${exterior} M${puntos.join(' L')} Z`;
}

const ARO = trazarAro();
const BASE_MANGO = polar(33, MANGO);
const PUNTA_MANGO = { x: BASE_MANGO.x + 10, y: BASE_MANGO.y - 10.5 };
const BRILLO_DESDE = polar(35, 200);
const BRILLO_HASTA = polar(35, 250);

function Tramo({ y }: { y: number }) {
  const desde = Math.floor(-(RECORRIDO + 2 * PASO) / PASO);
  const hasta = Math.ceil((MANIVELA.x + RECORRIDO + 2 * PASO) / PASO);
  const planos: number[] = [];
  const cantos: number[] = [];
  for (let k = desde; k <= hasta; k++) (k % 2 === 0 ? planos : cantos).push(k * PASO);

  // Primero los eslabones planos y encima los de canto, que pasan por adentro de los planos
  return (
    <>
      {planos.map((x) => {
        const eslabon = {
          x: x - LARGO / 2,
          y: y - ALTO_ESLABON / 2,
          width: LARGO,
          height: ALTO_ESLABON,
          rx: ALTO_ESLABON / 2,
          fill: 'none',
        };
        return (
          <g key={x}>
            <rect {...eslabon} stroke={TINTA} strokeWidth={CONTORNO} />
            <rect {...eslabon} stroke={METAL} strokeWidth={CONTORNO / 2} />
          </g>
        );
      })}
      {cantos.map((x) => (
        <g key={x} strokeLinecap="round">
          <line x1={x - LARGO / 2} y1={y} x2={x + LARGO / 2} y2={y} stroke={TINTA} strokeWidth={CONTORNO + 0.8} />
          <line x1={x - LARGO / 2} y1={y} x2={x + LARGO / 2} y2={y} stroke={METAL} strokeWidth={CONTORNO / 2 + 0.5} />
          <line x1={x - LARGO / 2 + 2} y1={y - 0.4} x2={x + 1} y2={y - 0.4} stroke="#fff" strokeWidth="0.8" opacity="0.8" />
        </g>
      ))}
    </>
  );
}

export default function Manivela({ plegado, onAlternar }: Props) {
  const ruedaRef = useRef<SVGGElement>(null);
  const centroRef = useRef<SVGGElement>(null);
  const arribaRef = useRef<SVGGElement>(null);
  const abajoRef = useRef<SVGGElement>(null);
  const girandoRef = useRef(false);
  const m = MANIVELA;

  function girar() {
    if (girandoRef.current) return;
    onAlternar();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rueda = ruedaRef.current;
    const centro = centroRef.current;
    const arriba = arribaRef.current;
    const abajo = abajoRef.current;
    if (!rueda || !centro || !arriba || !abajo) return;

    // Plegar gira en contra de las agujas del reloj: la cadena de arriba tira hacia la pared
    const sentido = plegado ? 1 : -1;
    const giro = 360 * VUELTAS * sentido;
    const chevron = plegado ? 180 : 0;
    const opciones = { duration: DURACION_PLIEGUE, easing: CURVA_PLIEGUE };

    // Sin `fill`: al terminar cada animación vuelve a su estilo de base, que se ve igual que el final.
    // El centro da media vuelta de más, así el chevron es lo único que queda distinto.
    girandoRef.current = true;
    const animacion = rueda.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${giro}deg)` }], opciones);
    centro.animate(
      [{ transform: `rotate(${chevron}deg)` }, { transform: `rotate(${chevron + giro + 180 * sentido}deg)` }],
      opciones,
    );
    arriba.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${RECORRIDO * sentido}px)` }], opciones);
    abajo.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-RECORRIDO * sentido}px)` }], opciones);
    animacion.onfinish = animacion.oncancel = () => {
      girandoRef.current = false;
    };
  }

  return (
    <div className="manivela" style={{ top: `${m.y - m.radio}px` }}>
      <svg
        className="manivela-cadena"
        width={m.x}
        height={SEPARACION * 2 + MARGEN_CADENA * 2}
        style={{ top: `${m.radio - SEPARACION - MARGEN_CADENA}px` }}
        aria-hidden="true"
        focusable="false"
      >
        <g ref={arribaRef}>
          <Tramo y={MARGEN_CADENA} />
        </g>
        <g ref={abajoRef}>
          <Tramo y={MARGEN_CADENA + SEPARACION * 2} />
        </g>
      </svg>

      <button
        type="button"
        className="manivela-btn"
        style={{ left: `${m.x - m.radio}px`, width: `${m.radio * 2}px`, height: `${m.radio * 2}px` }}
        aria-label={plegado ? 'Mostrar los estantes' : 'Ocultar los estantes'}
        aria-expanded={!plegado}
        onClick={girar}
      >
        <svg className="manivela-rueda" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <g ref={ruedaRef} style={{ transformOrigin: '50px 50px' }} strokeLinejoin="round">
            {/* Tambor de atrás, donde se enrolla la cadena: tapa el final de la cadena que se vería por los huecos */}
            <circle cx="50" cy="50" r={ARO_INTERIOR + 2} fill={HIERRO.oscuro} />
            <circle cx="50" cy="50" r="22" fill="none" stroke={HIERRO.rayo} strokeWidth="2.4" strokeDasharray="3.5 3.4" />
            {RAYOS.map((grados) => (
              <path
                key={grados}
                d="M8 -5.4 L32 -3.8 L32 3.8 L8 5.4 Z"
                transform={`translate(50 50) rotate(${grados})`}
                fill={HIERRO.rayo}
                stroke={TINTA}
                strokeWidth="2.5"
              />
            ))}
            <path d={ARO} fillRule="evenodd" fill={HIERRO.aro} stroke={TINTA} strokeWidth="2.5" />

            <g strokeLinecap="round">
              <line x1={BASE_MANGO.x} y1={BASE_MANGO.y} x2={PUNTA_MANGO.x} y2={PUNTA_MANGO.y} stroke={TINTA} strokeWidth="12" />
              <line x1={BASE_MANGO.x} y1={BASE_MANGO.y} x2={PUNTA_MANGO.x} y2={PUNTA_MANGO.y} stroke={HIERRO.oscuro} strokeWidth="7.5" />
              <line
                x1={BASE_MANGO.x - 1.8}
                y1={BASE_MANGO.y - 3.5}
                x2={PUNTA_MANGO.x - 3.2}
                y2={PUNTA_MANGO.y + 0.5}
                stroke="#fff"
                strokeWidth="1.6"
                opacity="0.3"
              />
            </g>
            <circle cx={BASE_MANGO.x} cy={BASE_MANGO.y} r="3" fill={HIERRO.claro} stroke={TINTA} strokeWidth="1.8" />
            <circle cx={PUNTA_MANGO.x} cy={PUNTA_MANGO.y} r="5.4" fill={HIERRO.claro} stroke={TINTA} strokeWidth="2.2" />
          </g>

          {/* El brillo no gira: la luz viene siempre del mismo lado */}
          <path
            d={`M${BRILLO_DESDE.x} ${BRILLO_DESDE.y} A35 35 0 0 1 ${BRILLO_HASTA.x} ${BRILLO_HASTA.y}`}
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.25"
          />

          <g ref={centroRef} style={{ transformOrigin: '50px 50px', transform: `rotate(${plegado ? 180 : 0}deg)` }}>
            <circle cx="50" cy="50" r="12.5" fill={HIERRO.buje} stroke={TINTA} strokeWidth="2.5" />
            <circle cx="50" cy="50" r="9.5" fill="none" stroke={HIERRO.bujeClaro} strokeWidth="1.5" opacity="0.8" />
            {/* Apunta a la pared mientras la estantería está afuera: indica hacia dónde se va a mover */}
            <path
              d="M53.2 42.8 L46 50 L53.2 57.2"
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </button>
    </div>
  );
}
