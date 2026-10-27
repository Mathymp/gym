# FORMA

Registro de entrenamiento para el celular. Todo parte de `public/data/forma.json`: perfil, rutina, ejercicios y el peso inicial. Lo que anotes después se guarda en ese mismo teléfono. No hay cuenta, servidor ni conexión externa.

La dirección pública es [https://mathymp.github.io/gym/](https://mathymp.github.io/gym/).

## Abrirla

En el computador:

```bash
npm install
npm run dev
```

En el teléfono abre la dirección de GitHub Pages y, si el navegador lo ofrece, instálala desde Perfil.

## Qué trae el archivo

- Nombre Mathy, 170 cm, peso inicial 83 kg y meta 76 kg
- Rutina de lunes tren superior A, martes piernas A, jueves tren superior B y viernes piernas B
- Miércoles, sábado y domingo libres
- Biblioteca de ejercicios, cada uno con una foto de la máquina en fondo blanco y un consejo de ejecución

Los gráficos usan solo registros reales. Hasta que completes una serie, no hay puntos inventados.

## Tus registros

El teléfono guarda una copia de `forma.json` en el navegador. Un teléfono nuevo vuelve a leer el archivo del repositorio.

En Perfil puedes descargar `forma.json`. Si reemplazas `public/data/forma.json` con esa descarga y subes el cambio, el siguiente teléfono que entre por primera vez verá esa copia. Las fotos de progreso no viajan en el archivo: se quedan en el teléfono donde las tomaste.

«Volver al archivo inicial» borra la copia de ese teléfono y las fotos guardadas ahí.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

Para regenerar la biblioteca y el archivo inicial después de editar `scripts/build-exercises.mjs`:

```bash
node scripts/build-exercises.mjs
```

Eso vuelve a escribir `public/data/forma.json`. Hazlo solo si quieres partir de cero: reemplaza el archivo con los datos de inicio.
