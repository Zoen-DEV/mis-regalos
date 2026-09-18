import { useId } from 'react';
import { TINTA } from '../lib/colores';
import { GROSOR } from '../lib/estantes';

type Props = {
  largo: number;
  /** Cada estante tiene las vetas en otro lugar para que no parezcan copiados */
  variante: number;
};

const MADERA = {
  cara: '#F6C98F',
  frente: '#DB9A5B',
  frenteOscuro: '#BF7C41',
  veta: '#8A4F24',
  mensula: '#B87438',
};
/** Alto de la cara de arriba de la tabla, donde se apoyan las cajas */
const CARA = 7;
/** Ancho y alto de la ménsula que la sostiene contra la pared */
const MENSULA = 24;
const RADIO = 5;
/** La tabla empieza fuera de la pantalla: el borde izquierdo es la pared */
const X0 = -8;
/** Dónde se corta la veta de arriba (fracción del largo); ahí mismo queda el nudo */
const CORTES = [0.52, 0.34, 0.6, 0.44];

export default function TablaEstante({ largo, variante }: Props) {
  const frenteId = 'frente' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const trazo = { stroke: TINTA, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  const veta = { fill: 'none', stroke: MADERA.veta, strokeWidth: 1.3, strokeLinecap: 'round' as const, opacity: 0.5 };

  const w = largo;
  const corte = w * CORTES[variante % CORTES.length];
  const arriba = CARA + (GROSOR - CARA) * 0.36;
  const abajo = CARA + (GROSOR - CARA) * 0.72;
  const desde = corte * 0.7;
  const hasta = w - 10;

  return (
    <svg
      className="estante-svg"
      width={w}
      height={GROSOR + MENSULA}
      viewBox={`0 0 ${w} ${GROSOR + MENSULA}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={frenteId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MADERA.frente} />
          <stop offset="1" stopColor={MADERA.frenteOscuro} />
        </linearGradient>
      </defs>

      {/* Ménsula: va detrás de la tabla, con la diagonal apenas curvada hacia la esquina */}
      <path
        d={`M${X0} ${GROSOR - 3} H${MENSULA} Q${MENSULA * 0.42} ${GROSOR + MENSULA * 0.36} 0 ${GROSOR + MENSULA} H${X0} Z`}
        fill={MADERA.mensula}
        {...trazo}
      />
      <circle cx="5" cy={GROSOR + 6} r="1.8" fill={TINTA} opacity="0.55" />

      <rect x={X0} y="0" width={w - X0} height={GROSOR} rx={RADIO} fill={`url(#${frenteId})`} />
      <path d={`M${X0} ${CARA} V0 H${w - RADIO} A${RADIO} ${RADIO} 0 0 1 ${w} ${RADIO} V${CARA} Z`} fill={MADERA.cara} />

      {/* Vetas del frente: una se corta en un nudo y la otra sigue desde un poco antes */}
      <path d={`M6 ${arriba} C${corte * 0.35} ${arriba - 1.4} ${corte * 0.65} ${arriba + 1.4} ${corte} ${arriba}`} {...veta} />
      <ellipse cx={corte + 9} cy={arriba + 0.6} rx="4" ry="1.9" {...veta} />
      <path
        d={`M${desde} ${abajo} C${desde + (hasta - desde) * 0.4} ${abajo + 1.4} ${desde + (hasta - desde) * 0.7} ${abajo - 1.2} ${hasta} ${abajo}`}
        {...veta}
      />

      {/* Brillo como el de la tapa de las cajas */}
      <rect x="8" y="2" width={Math.min(40, w * 0.25)} height="2.5" rx="1.25" fill="#fff" opacity="0.55" />

      <path d={`M${X0} ${CARA} H${w}`} stroke={TINTA} strokeWidth="2" />
      <rect x={X0} y="0" width={w - X0} height={GROSOR} rx={RADIO} fill="none" {...trazo} />
    </svg>
  );
}
