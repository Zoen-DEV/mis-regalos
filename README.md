# 🎁 Lista de regalos

Página de una sola vista con los regalos que me gustaría recibir. Cada regalo es una caja: mientras más grande, más cuesta.

Hecha con [Astro](https://astro.build) + React.

## Agregar o quitar regalos

Todo se edita en [`src/data/regalos.ts`](src/data/regalos.ts):

```ts
{
  nombre: 'Audífonos inalámbricos',
  link: 'https://…',
  precio: 350_000,          // pesos colombianos
  imagen: 'https://…',      // opcional
  nota: 'Negros o blancos', // opcional
  color: 'morado',          // opcional: rojo | turquesa | amarillo | morado | verde | rosa | azul
}
```

Los rangos de tamaño se ajustan en `UMBRALES` dentro de [`src/lib/precio.ts`](src/lib/precio.ts).

## Comandos

| Comando           | Qué hace                                  |
| :---------------- | :---------------------------------------- |
| `npm install`     | Instala dependencias                      |
| `npm run dev`     | Servidor local en `http://localhost:4321` |
| `npm run build`   | Genera el sitio estático en `./dist/`     |
| `npm run preview` | Sirve `./dist/` localmente                |

## Publicar en Vercel

1. Sube el repo a GitHub.
2. En Vercel: **Add New → Project**, importa el repo. Detecta Astro solo (build `npm run build`, salida `dist`).
3. Cada `git push` vuelve a desplegar la página.
