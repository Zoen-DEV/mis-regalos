import { useId } from 'react';
import { PALETA, TINTA, type ColorCaja } from '../lib/colores';

export type Patron = 'liso' | 'lunares' | 'rayas';

type Props = {
  color: ColorCaja;
  patron?: Patron;
  abierta?: boolean;
};

export default function GiftBox({ color, patron = 'liso', abierta = false }: Props) {
  const tonos = PALETA[color];
  const patronId = 'patron' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const relleno = patron === 'liso' ? tonos.caja : `url(#${patronId})`;
  const trazo = { stroke: TINTA, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

  return (
    <svg
      viewBox="0 0 100 110"
      className={abierta ? 'caja-svg abierta' : 'caja-svg'}
      aria-hidden="true"
      focusable="false"
    >
      {patron !== 'liso' && (
        <defs>
          <pattern
            id={patronId}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform={patron === 'rayas' ? 'rotate(45)' : undefined}
          >
            <rect width="12" height="12" fill={tonos.caja} />
            {patron === 'lunares' ? (
              <circle cx="6" cy="6" r="2.2" fill="#fff" opacity="0.5" />
            ) : (
              <rect width="5" height="12" fill="#fff" opacity="0.25" />
            )}
          </pattern>
        </defs>
      )}

      <g className="caja-cuerpo">
        <rect x="11" y="46" width="78" height="58" rx="4" fill={relleno} {...trazo} />
        <rect x="12.5" y="47.5" width="75" height="7" fill={tonos.sombra} opacity="0.6" />
        <rect x="43" y="46" width="14" height="58" fill={tonos.cinta} {...trazo} />
      </g>

      <g className="caja-tapa">
        <path d="M50 33 C42 14 18 12 25 28 C28 35 42 36 50 33 Z" fill={tonos.cinta} {...trazo} />
        <path d="M50 33 C58 14 82 12 75 28 C72 35 58 36 50 33 Z" fill={tonos.cinta} {...trazo} />
        <rect x="5" y="32" width="90" height="16" rx="4" fill={relleno} {...trazo} />
        <rect x="43" y="32" width="14" height="16" fill={tonos.cinta} {...trazo} />
        <rect x="10" y="35.5" width="22" height="3.5" rx="1.75" fill="#fff" opacity="0.55" />
        <rect x="43.5" y="25" width="13" height="11" rx="4" fill={tonos.cinta} {...trazo} />
      </g>
    </svg>
  );
}
