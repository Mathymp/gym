# FORMA

Registro de entrenamiento para el celular. La app guarda series, peso, medidas, fotos privadas y el calendario en tu cuenta de Supabase. La interfaz está en español y usa la zona horaria de Chile.

## Qué necesitas

- Node.js 22 o superior
- Un proyecto de [Supabase](https://supabase.com)
- Una cuenta de [Vercel](https://vercel.com) si vas a publicarla

## Instalación local

```bash
npm install
cp .env.example .env.local
```

En Windows puedes copiar el archivo con:

```powershell
Copy-Item .env.example .env.local
```

Completa `.env.local` solo con estos valores, tomados de Supabase → Project Settings → API:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
```

No pongas la clave `service_role` en el frontend ni en variables `VITE_`.

```bash
npm run dev
```

Abre la dirección que muestra Vite. En el teléfono, usa la misma red o el despliegue de Vercel.

## Supabase

En el SQL Editor ejecuta, en este orden:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_exercises.sql`
3. `supabase/migrations/003_storage.sql`
4. `supabase/migrations/004_swap_days.sql`

Eso crea las tablas, la biblioteca de ejercicios, el bucket privado `progress-photos` y las políticas para que cada persona vea solo sus registros.

En Authentication → Providers deja activo el correo y contraseña. Si exiges confirmar el correo, la app avisa para revisar la bandeja antes de entrar.

La app no inventa entrenamientos ni puntos del gráfico. Hasta que registres datos, las pantallas quedan vacías.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

`npm run build` revisa TypeScript y genera la carpeta `dist`, con el service worker de la PWA.

Para regenerar la biblioteca si editas `scripts/build-exercises.mjs`:

```bash
node scripts/build-exercises.mjs
```

Vuelve a ejecutar `002_exercises.sql` en Supabase.

## Instalar en el teléfono

La app es una PWA.

- Android o escritorio: en Chrome, abre el menú del navegador y elige instalar. Dentro de Perfil también aparece el botón cuando el navegador lo permite.
- iPhone: en Safari, Compartir → Agregar a inicio.

En el gimnasio, si se corta internet, las series quedan en el teléfono. El pie de la app dice «Guardado en el teléfono», «Sincronizando», «Sincronizado» o «Error de sincronización». «Sincronizado» aparece solo después de la confirmación del servidor. Un reintento usa el mismo identificador y no duplica la serie. Si el servidor ya tiene un cambio más nuevo, se conserva ese.

## Vercel

1. Importa el repositorio.
2. Framework: Vite.
3. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

`vercel.json` reescribe las rutas de la SPA y manda cabeceras básicas. En Supabase → Authentication → URL Configuration agrega el dominio de Vercel a las URLs permitidas.

## Rutina inicial

Al terminar el alta se crea una rutina de cuatro días de fuerza: lunes tren superior A, martes piernas A, jueves tren superior B y viernes piernas B, si dejas esos días. Miércoles, sábado y domingo quedan libres para cardio o descanso. Puedes cambiar días, ejercicios, series, repeticiones y descansos sin borrar el historial.
