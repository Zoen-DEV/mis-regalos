import { useState, type CSSProperties } from 'react';
import type { Regalo } from '../data/regalos';
import { PALETA, type ColorCaja } from '../lib/colores';
import { TAMANOS, formatearPrecio, type Tamano } from '../lib/precio';

type Props = {
  regalo: Regalo;
  color: ColorCaja;
  tamano: Tamano;
  tituloId: string;
  onCerrar: () => void;
};

export default function GiftCard({ regalo, color, tamano, tituloId, onCerrar }: Props) {
  const [imagenOk, setImagenOk] = useState(true);
  const tonos = PALETA[color];
  const estilo = { '--c-caja': tonos.caja, '--c-cinta': tonos.cinta } as CSSProperties;

  return (
    <article className="tarjeta" style={estilo}>
      <div className="tarjeta-media">
        {regalo.imagen && imagenOk ? (
          <img src={regalo.imagen} alt="" referrerPolicy="no-referrer" onError={() => setImagenOk(false)} />
        ) : (
          <span className="tarjeta-emoji" aria-hidden="true">
            🎁
          </span>
        )}
      </div>

      <div className="tarjeta-cuerpo">
        <span className="tarjeta-badge">{TAMANOS[tamano].nombre}</span>
        <h2 id={tituloId}>{regalo.nombre}</h2>
        {regalo.nota && <p className="tarjeta-nota">{regalo.nota}</p>}
        <p className="tarjeta-precio">
          {formatearPrecio(regalo.precio)} <small>aprox.</small>
        </p>
        <a className="tarjeta-link" href={regalo.link} target="_blank" rel="noopener noreferrer">
          Ver regalo →
        </a>
      </div>

      <button type="button" className="tarjeta-cerrar" onClick={onCerrar} aria-label="Cerrar">
        ✕
      </button>
    </article>
  );
}
