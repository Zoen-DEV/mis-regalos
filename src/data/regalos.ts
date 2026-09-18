import type { ColorCaja } from '../lib/colores';

export const config = {
  titulo: '¡Mi lista de regalos!',
  subtitulo: 'Cosas que me harían muy feliz. Mientras más grande la caja, más cuesta el regalo.',
  /** Fin de la cuenta regresiva, en la hora local de quien visita la página */
  fecha: '2026-10-24T00:00:00',
};

export type Regalo = {
  nombre: string;
  link: string;
  /** Precio aproximado en pesos colombianos, ej. 250000 */
  precio: number;
  /** URL de una foto del producto (opcional) */
  imagen?: string;
  /** Detalle extra: talla, color, modelo… (opcional) */
  nota?: string;
  /** Color de la caja (opcional, si no se pone se asigna solo) */
  color?: ColorCaja;
  /** El más deseado: su caja es diminuta sin importar el precio, para despistar (opcional) */
  imposible?: boolean;
};

export const regalos: Regalo[] = [
  {
    nombre: 'Puente para la guitarra',
    link: 'https://www.mercadolibre.com.co/telecaster-bridge-axegrinderz-wtb-brass-saddle-chrome/p/MCO2101350436',
    imagen: '/regalos/puente-de-guitarra.png',
    precio: 250_000,
  },
  {
    nombre: 'Kit de herramientas para guitarra #1',
    link: 'https://www.mercadolibre.com.co/guitar-maintenance-tool-kit-universal-guitar-setup-tool-kits/p/MCO2026119387',
    imagen: '/regalos/kit-de-herramientas-1.png',
    precio: 140_000,
  },
  {
    nombre: 'Kit de herramientas para guitarra #2',
    link: 'https://www.mercadolibre.com.co/herramienta-de-mantenimiento-para-la-reparacion-de-guitarras/p/MCO2058539765',
    imagen: '/regalos/kit-de-herramientas-2.png',
    precio: 110_000,
  },
  {
    nombre: 'Micrófono para la guitarra 1/2',
    link: 'https://gfpickups.com.ar/producto/hi-mass-tele-bridge/',
    precio: 170_000,
    imagen: 'https://gfpickups.com.ar/wp-content/uploads/2022/10/IMG_7022r.jpg',
    nota: 'Marca argentina',
  },
  {
    nombre: 'Micrófono para la guitarra 2/2',
    link: 'https://gfpickups.com.ar/producto/hi-mass-tele-neck/',
    precio: 180_000,
    imagen: 'https://gfpickups.com.ar/wp-content/uploads/2022/10/IMG_7024r.jpg',
    nota: 'Marca argentina',
  },
  {
    nombre: 'Pedal multiefectos',
    link: 'https://ortizo.com.co/collections/pedales-para-guitarra/products/pedal-multi-efecto-para-guitarra-electrica-zoom-g1xfour',
    precio: 500_000,
    imagen: 'https://ortizo.com.co/cdn/shop/files/GP4086.jpg?v=1767737886',
  },
  {
    nombre: 'Audífonos',
    link: 'https://audio-technica.com.co/products/ath-m20x-audifonos-de-monitoreo-profesional',
    precio: 230_000,
    imagen: 'https://audio-technica.com.co/cdn/shop/files/ATH-M20X_1.webp?v=1736954938',
  },
  {
    nombre: 'Guitarra',
    link: 'https://ortizo.com.co/collections/guitarras-electricas-fender/products/guitarra-electrica-fender-telecaster-squier-debutrojo-dakota',
    precio: 800_000,
    imagen: 'https://ortizo.com.co/cdn/shop/files/01_6d3821f0-ae43-46a0-968c-89ce08b5496a.jpg?v=1774018151',
    imposible: true,
  },
  {
    nombre: 'Amplificador para guitarra',
    link: 'https://tiendadelmusico.com/amplificadores-para-guitarra-electrica/311-vox-pathfinder-pf10-amplificador-para-guitarra-electrica-4959112022423.html',
    imagen: '/regalos/amplificador.png',
    precio: 500_000,
  },
  {
    nombre: 'Libro El Silmarillion',
    link: 'https://www.panamericana.com.co/el-silmarillion-394461/p',
    imagen: '/regalos/silmarillion.png',
    precio: 55_000,
  },
  {
    nombre: 'Libro El Hobbit',
    link: 'https://www.panamericana.com.co/el-hobbit-683368/p',
    imagen: '/regalos/hobbit.png',
    precio: 49_000,
  },
  {
    nombre: 'Florcitas',
    link: 'https://api.whatsapp.com/send/?phone=%2B573124798849&text&type=phone_number&app_absent=0',
    imagen: '/regalos/florcita.png',
    precio: 8_000,
  },
];
