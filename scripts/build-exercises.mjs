import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const exercises = [
  ["press-banca", "Press banca", "pecho", ["Hombros", "Tríceps"], "Barra y banco", "weight_reps", "Acuéstate con los pies firmes y la barra sobre los hombros. Baja hasta el pecho y empuja sin rebotar.", "Rebotar la barra o despegar la pelvis del banco.", ["press-pecho-maquina", "press-inclinado-barra"]],
  ["press-inclinado-barra", "Press inclinado con barra", "pecho", ["Hombros", "Tríceps"], "Barra y banco inclinado", "weight_reps", "Inclina el banco unos 30 grados. Baja la barra a la parte alta del pecho y empuja hacia arriba.", "Subir el banco de más y convertir el movimiento en press de hombros.", ["press-inclinado-mancuernas", "press-banca"]],
  ["press-inclinado-mancuernas", "Press inclinado con mancuernas", "pecho", ["Hombros", "Tríceps"], "Mancuernas y banco", "weight_reps", "Con el banco inclinado, baja las mancuernas hasta la línea del pecho y empuja sin chocarlas arriba.", "Abrir demasiado los codos o arquear la zona lumbar.", ["press-inclinado-barra", "press-pecho-maquina"]],
  ["press-pecho-maquina", "Press de pecho en máquina", "pecho", ["Hombros", "Tríceps"], "Máquina de press", "weight_reps", "Ajusta el asiento para que las empuñaduras queden a la altura del pecho. Empuja y vuelve con control.", "Dejar que los hombros se vayan hacia adelante en cada repetición.", ["press-banca", "press-inclinado-mancuernas"]],
  ["peck-deck", "Peck deck", "pecho", ["Hombros"], "Máquina pec deck", "weight_reps", "Siéntate con la espalda apoyada. Junta los brazos delante del pecho y ábrelos hasta sentir el estiramiento.", "Encoger los hombros o usar impulso del tronco.", ["aperturas-mancuernas", "cruce-poleas"]],
  ["aperturas-mancuernas", "Aperturas con mancuernas", "pecho", ["Hombros"], "Mancuernas y banco", "weight_reps", "Con una leve flexión de codos, abre los brazos hasta la altura del pecho y ciérralos sin doblar de más.", "Bajar las mancuernas más allá de lo cómodo.", ["peck-deck", "cruce-poleas"]],
  ["cruce-poleas", "Cruce de poleas", "pecho", ["Hombros"], "Poleas", "weight_reps", "Da un paso adelante y cruza las manos frente al pecho con los codos levemente flexionados.", "Balancear el cuerpo para mover el peso.", ["peck-deck", "aperturas-mancuernas"]],
  ["fondos-pecho", "Fondos en paralelas", "pecho", ["Tríceps", "Hombros"], "Paralelas", "reps", "Inclina un poco el torso, baja hasta que el hombro lo permita y empuja hasta extender los codos.", "Encogerse y dejar caer el cuerpo sin control.", ["press-pecho-maquina", "fondos-asistidos"]],
  ["jalon-pecho", "Jalón al pecho", "espalda", ["Bíceps"], "Polea alta", "weight_reps", "Tira la barra hacia la parte alta del pecho, llevando los codos hacia abajo y atrás.", "Tirar por detrás de la nuca o balancear el torso.", ["dominadas", "remo-sentado"]],
  ["dominadas", "Dominadas", "espalda", ["Bíceps"], "Barra fija", "reps", "Cuelga con los hombros activos y sube hasta que la barbilla pase la barra.", "Balancear las piernas o acortar el recorrido.", ["jalon-pecho", "dominadas-asistidas"]],
  ["dominadas-asistidas", "Dominadas asistidas", "espalda", ["Bíceps"], "Máquina asistida", "weight_reps", "Apoya las rodillas o los pies en el apoyo y sube igual que en una dominada.", "Dejar que la máquina haga todo el recorrido.", ["dominadas", "jalon-pecho"]],
  ["remo-sentado", "Remo sentado en polea", "espalda", ["Bíceps"], "Polea baja", "weight_reps", "Siéntate alto, lleva la empuñadura al abdomen y aprieta las escápulas.", "Redondear la espalda o tirar con el impulso.", ["remo-maquina", "remo-barra"]],
  ["remo-maquina", "Remo en máquina", "espalda", ["Bíceps"], "Máquina de remo", "weight_reps", "Ajusta el pecho al apoyo. Tira los codos hacia atrás sin despegar el pecho.", "Encoger los hombros hacia las orejas.", ["remo-sentado", "remo-mancuerna"]],
  ["remo-mancuerna", "Remo con mancuerna", "espalda", ["Bíceps"], "Mancuerna y banco", "weight_reps", "Apoya una mano y una rodilla. Lleva la mancuerna hacia la cadera, no hacia el cuello.", "Girar el tronco para subir el peso.", ["remo-barra", "remo-maquina"]],
  ["remo-barra", "Remo con barra", "espalda", ["Bíceps", "Isquios"], "Barra", "weight_reps", "Inclina el torso con la espalda neutra y lleva la barra hacia el abdomen.", "Redondear la zona lumbar para llegar al peso.", ["remo-sentado", "remo-mancuerna"]],
  ["pullover-polea", "Pullover en polea", "espalda", ["Pecho"], "Polea alta", "weight_reps", "Con los brazos casi extendidos, lleva la barra desde arriba hasta las caderas.", "Doblar mucho los codos y convertirlo en jalón.", ["jalon-pecho", "press-pecho-maquina"]],
  ["press-militar", "Press militar", "hombros", ["Tríceps"], "Barra", "weight_reps", "De pie o sentado, empuja la barra desde la clavícula hasta arriba sin arquear la espalda.", "Empujar la cabeza hacia adelante en cada repetición.", ["press-hombros", "press-hombros-maquina"]],
  ["press-hombros", "Press de hombros", "hombros", ["Tríceps"], "Mancuernas", "weight_reps", "Empuja las mancuernas desde la altura de las orejas hasta extender los codos.", "Arquear la lumbar para terminar la repetición.", ["press-hombros-maquina", "press-militar"]],
  ["press-hombros-maquina", "Press de hombros en máquina", "hombros", ["Tríceps"], "Máquina de hombros", "weight_reps", "Ajusta el asiento para que las manos partan a la altura de los hombros. Empuja sin despegar la espalda.", "Subir el asiento y cargar el cuello.", ["press-hombros", "press-militar"]],
  ["elevaciones-laterales", "Elevaciones laterales", "hombros", [], "Mancuernas", "weight_reps", "Eleva los brazos hacia los lados hasta la altura de los hombros, con una leve flexión de codos.", "Subir los hombros o balancear el cuerpo.", ["face-pulls", "press-hombros"]],
  ["elevaciones-frontales", "Elevaciones frontales", "hombros", ["Pecho"], "Mancuernas", "weight_reps", "Sube una o ambas mancuernas al frente hasta la altura de los hombros.", "Usar impulso de las piernas.", ["elevaciones-laterales", "press-hombros"]],
  ["pajaros", "Pájaros", "hombros", ["Espalda"], "Mancuernas", "weight_reps", "Inclina el torso y abre los brazos hacia los lados, como si exprimieras las escápulas.", "Subir el torso en cada repetición.", ["face-pulls", "remo-mancuerna"]],
  ["face-pulls", "Face pulls", "hombros", ["Espalda"], "Polea alta", "weight_reps", "Tira la cuerda hacia la cara, separando las manos y llevando los codos altos.", "Tirar hacia el cuello con los codos bajos.", ["pajaros", "elevaciones-laterales"]],
  ["curl-biceps", "Curl de bíceps", "biceps", [], "Mancuernas", "weight_reps", "Con los codos quietos al costado, flexiona y baja controlando el peso.", "Balancear el tronco o adelantar los codos.", ["curl-mancuernas", "curl-barra"]],
  ["curl-mancuernas", "Curl con mancuernas", "biceps", [], "Mancuernas", "weight_reps", "Alterna o sube ambas mancuernas sin mover los hombros.", "Dejar caer las mancuernas en la bajada.", ["curl-biceps", "curl-martillo"]],
  ["curl-barra", "Curl con barra", "biceps", [], "Barra", "weight_reps", "Toma la barra al ancho de los hombros y flexiona sin despegar los codos del torso.", "Acortar el recorrido abajo.", ["curl-biceps", "curl-predicador"]],
  ["curl-martillo", "Curl martillo", "biceps", ["Antebrazo"], "Mancuernas", "weight_reps", "Mantén las palmas enfrentadas durante todo el recorrido.", "Girar las muñecas a mitad del movimiento.", ["curl-mancuernas", "curl-polea"]],
  ["curl-polea", "Curl en polea", "biceps", [], "Polea baja", "weight_reps", "Da un paso atrás y flexiona con el codo fijo.", "Acercar el codo al cuerpo para acortar el ejercicio.", ["curl-biceps", "curl-martillo"]],
  ["curl-predicador", "Curl predicador", "biceps", [], "Banco predicador", "weight_reps", "Apoya el brazo en el banco y flexiona sin despegar el codo.", "Estirar del todo el codo con mucho peso.", ["curl-barra", "curl-mancuernas"]],
  ["extension-polea", "Extensión de tríceps en polea", "triceps", [], "Polea alta", "weight_reps", "Con los codos al costado, extiende los antebrazos hacia abajo y vuelve sin subir los codos.", "Separar los codos del torso.", ["extension-triceps", "press-frances"]],
  ["extension-triceps", "Extensión de tríceps", "triceps", [], "Polea o mancuerna", "weight_reps", "Extiende el codo sin mover el hombro. Elige la polea o la mancuerna y anota cuál usaste.", "Balancear el cuerpo para bajar el peso.", ["extension-polea", "extension-overhead"]],
  ["extension-overhead", "Extensión sobre la cabeza", "triceps", [], "Mancuerna", "weight_reps", "Con la mancuerna detrás de la cabeza, extiende los codos hacia arriba.", "Abrir los codos hacia los lados.", ["extension-polea", "press-frances"]],
  ["fondos-asistidos", "Fondos asistidos", "triceps", ["Pecho"], "Máquina asistida", "weight_reps", "Baja hasta que el codo flexione cerca de 90 grados y empuja hasta extender.", "Dejar que el apoyo te lance hacia arriba.", ["extension-polea", "fondos-pecho"]],
  ["press-frances", "Press francés", "triceps", [], "Barra o mancuernas", "weight_reps", "Acostado, baja la barra hacia la frente o detrás de la cabeza y extiende los codos.", "Abrir los codos en cada bajada.", ["extension-overhead", "extension-polea"]],
  ["sentadillas", "Sentadillas", "piernas", ["Glúteos"], "Barra y rack", "weight_reps", "Baja como si te sentaras, con las rodillas siguiendo la punta de los pies, y sube empujando el piso.", "Juntar las rodillas o redondear la espalda abajo.", ["sentadilla-goblet", "prensa-piernas"]],
  ["sentadilla-goblet", "Sentadilla goblet", "piernas", ["Glúteos"], "Mancuerna", "weight_reps", "Sostén la mancuerna contra el pecho y baja entre las caderas.", "Dejar que la mancuerna se aleje del cuerpo.", ["sentadillas", "prensa-horizontal"]],
  ["prensa-piernas", "Prensa de piernas", "piernas", ["Glúteos"], "Prensa", "weight_reps", "Baja la plataforma hasta una flexión cómoda de rodilla y empújala sin bloquearlas de golpe.", "Despegar la pelvis del asiento al bajar.", ["prensa-45", "prensa-horizontal"]],
  ["prensa-45", "Prensa 45 grados", "piernas", ["Glúteos"], "Prensa a 45°", "weight_reps", "Coloca los pies al ancho de los hombros y no dejes que la plataforma baje más de lo que tu lumbar puede sostener.", "Rebotar abajo.", ["prensa-piernas", "hack-squat"]],
  ["prensa-horizontal", "Prensa horizontal", "piernas", ["Glúteos"], "Prensa horizontal", "weight_reps", "Empuja en línea recta y controla la vuelta. No es la misma máquina que la prensa a 45°.", "Levantar la cadera del asiento.", ["prensa-piernas", "prensa-45"]],
  ["hack-squat", "Hack squat", "piernas", ["Glúteos"], "Máquina hack", "weight_reps", "Apoya espalda y hombros. Baja y sube con los pies completos en la plataforma.", "Ir de puntas para mover más peso.", ["prensa-45", "sentadillas"]],
  ["extension-cuadriceps", "Extensión de cuádriceps", "piernas", [], "Máquina de extensión", "weight_reps", "Ajusta el rodillo sobre los tobillos y extiende las rodillas sin despegar la espalda.", "Tirar con la cadera para terminar.", ["sentadilla-goblet", "prensa-piernas"]],
  ["curl-femoral-sentado", "Curl femoral en máquina", "piernas", [], "Máquina sentada", "weight_reps", "Siéntate, ajusta el rodillo detrás de los tobillos y flexiona las rodillas.", "Levantar la pelvis del asiento.", ["curl-femoral-acostado", "peso-muerto-rumano-mancuernas"]],
  ["curl-femoral-acostado", "Curl femoral", "piernas", [], "Máquina acostada", "weight_reps", "Acostado boca abajo, lleva los talones hacia los glúteos sin despegar la pelvis.", "Arquear la zona lumbar para ayudar.", ["curl-femoral-sentado", "peso-muerto-rumano"]],
  ["peso-muerto-rumano", "Peso muerto rumano", "piernas", ["Espalda", "Glúteos"], "Barra", "weight_reps", "Con las rodillas levemente flexionadas, lleva la barra por los muslos hasta sentir los isquios.", "Redondear la espalda para bajar más.", ["peso-muerto-rumano-mancuernas", "hip-thrust"]],
  ["peso-muerto-rumano-mancuernas", "Peso muerto rumano con mancuernas", "piernas", ["Espalda", "Glúteos"], "Mancuernas", "weight_reps", "Baja las mancuernas pegadas a las piernas y sube apretando los glúteos.", "Doblar mucho las rodillas y convertirlo en sentadilla.", ["peso-muerto-rumano", "hip-thrust"]],
  ["hip-thrust", "Hip thrust", "piernas", ["Isquios"], "Barra y banco", "weight_reps", "Apoya la parte alta de la espalda en el banco y empuja la cadera hasta que el torso quede paralelo al piso.", "Empujar con la zona lumbar en vez de con los glúteos.", ["peso-muerto-rumano", "puente-gluteo"]],
  ["puente-gluteo", "Puente de glúteo", "piernas", [], "Piso", "reps", "Acostado, apoya los pies y eleva la cadera hasta alinear rodillas y hombros.", "Arquear el cuello para subir más.", ["hip-thrust", "peso-muerto-rumano-mancuernas"]],
  ["zancadas", "Zancadas", "piernas", ["Glúteos"], "Mancuernas", "weight_reps", "Da un paso largo, baja la rodilla de atrás y empuja con la pierna de adelante.", "Juntar la rodilla de adelante hacia adentro.", ["sentadilla-goblet", "prensa-piernas"]],
  ["elevaciones-pantorrillas", "Elevaciones de pantorrillas", "piernas", [], "Máquina o escalón", "weight_reps", "Sube sobre las puntas y baja el talón con control.", "Rebotar abajo.", ["gemelos-sentado", "prensa-piernas"]],
  ["gemelos-sentado", "Gemelos sentado", "piernas", [], "Máquina sentada", "weight_reps", "Con las rodillas en 90 grados, eleva los talones y pausa un momento arriba.", "Acortar el recorrido.", ["elevaciones-pantorrillas"]],
  ["peso-muerto", "Peso muerto convencional", "piernas", ["Espalda", "Glúteos"], "Barra", "weight_reps", "Empuja el piso con la barra pegada a las piernas y termina de pie, sin echarte hacia atrás.", "Separar la barra del cuerpo.", ["peso-muerto-rumano", "hip-thrust"]],
  ["abductores", "Abductores en máquina", "piernas", ["Glúteos"], "Máquina de abductores", "weight_reps", "Abre las piernas con la espalda apoyada y vuelve despacio.", "Usar impulso.", ["zancadas", "puente-gluteo"]],
  ["plancha", "Plancha abdominal", "abdomen", [], "Piso", "time", "Apoya antebrazos y puntas de los pies. Mantén una línea entre cabeza y talones.", "Dejar caer la cadera o subir el trasero.", ["crunch", "elevaciones-rodillas"]],
  ["crunch", "Crunch abdominal", "abdomen", [], "Piso", "reps", "Acostado, despega las escápulas del piso contrayendo el abdomen. No tires del cuello.", "Tirar de la nuca con las manos.", ["crunch-maquina", "plancha"]],
  ["crunch-maquina", "Crunch en máquina", "abdomen", [], "Máquina abdominal", "weight_reps", "Ajusta el apoyo del pecho y flexiona el tronco sin tirar con los brazos.", "Bajar el peso con la cadera.", ["crunch", "elevaciones-rodillas"]],
  ["elevaciones-piernas", "Elevaciones de piernas", "abdomen", [], "Barra o suelo", "reps", "Sube las piernas con el abdomen firme y bájalas sin arquear la lumbar.", "Balancear las piernas.", ["elevaciones-rodillas", "plancha"]],
  ["elevaciones-rodillas", "Elevación de rodillas", "abdomen", [], "Torre o suelo", "reps", "Lleva las rodillas hacia el pecho y bájalas sin soltar el abdomen.", "Balancearte en la barra.", ["elevaciones-piernas", "crunch"]],
  ["caminadora", "Caminadora", "cardio", [], "Caminadora", "distance", "Camina o trota con el torso alto. Anota minutos y distancia.", "Agarrarte de los costados y encorvarte.", ["eliptica", "bicicleta"]],
  ["bicicleta", "Bicicleta estática", "cardio", [], "Bicicleta", "distance", "Ajusta el asiento para que la rodilla quede levemente flexionada abajo.", "Sentarte demasiado bajo.", ["caminadora", "eliptica"]],
  ["eliptica", "Elíptica", "cardio", [], "Elíptica", "distance", "Empuja con todo el pie y mantén un ritmo que puedas sostener.", "Ir de puntas todo el tiempo.", ["caminadora", "bicicleta"]],
  ["escaladora", "Escaladora", "cardio", [], "Escaladora", "time", "Sube con el torso levemente inclinado y pasos completos.", "Apoyarte con todo el peso en los brazos.", ["eliptica", "caminadora"]],
];

function idFor(slug) {
  const hex = createHash("sha256").update(`forma-exercise:${slug}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function textArray(values) {
  if (values.length === 0) return "array[]::text[]";
  return `array[${values.map(quote).join(", ")}]`;
}

const rows = exercises.map((item) => {
  const [slug, name, group, secondary, equipment, tracking, instructions, mistakes, alternatives] = item;
  const id = idFor(slug);
  return `  (${quote(id)}, null, ${quote(id)}, ${quote(slug)}, ${quote(name)}, ${quote(group)}, ${textArray(secondary)}, ${quote(equipment)}, null, ${quote(instructions)}, ${quote(mistakes)}, ${textArray(alternatives)}, ${quote(tracking)})`;
});

const sql = `-- Biblioteca global de ejercicios. Se puede volver a ejecutar.
insert into public.exercises (
  id, user_id, client_id, slug, name, muscle_group, secondary_muscles, equipment,
  machine_name, instructions, common_mistakes, alternative_slugs, tracking_type
)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  instructions = excluded.instructions,
  common_mistakes = excluded.common_mistakes,
  alternative_slugs = excluded.alternative_slugs,
  tracking_type = excluded.tracking_type,
  slug = excluded.slug;
`;

writeFileSync(new URL("../supabase/migrations/002_exercises.sql", import.meta.url), sql);

const now = "2026-10-27T15:00:00.000Z";
const userId = "mathy";
const planId = idFor("plan-base");
const catalog = exercises.map((item) => {
  const [slug, name, group, secondary, equipment, tracking, instructions, mistakes, alternatives] = item;
  const id = idFor(slug);
  return {
    id,
    user_id: null,
    client_id: id,
    slug,
    name,
    muscle_group: group,
    secondary_muscles: secondary,
    equipment,
    machine_name: null,
    instructions,
    common_mistakes: mistakes,
    alternative_slugs: alternatives,
    tracking_type: tracking,
    created_at: now,
    updated_at: now,
  };
});
const bySlug = new Map(catalog.map((item) => [item.slug, item]));
const routine = [
  ["tren-superior-a", 1, "Tren superior A", "strength", [
    ["press-pecho-maquina", 3, 10, 10, null, 90],
    ["jalon-pecho", 3, 10, 12, null, 90],
    ["remo-sentado", 3, 10, 12, null, 90],
    ["elevaciones-laterales", 3, 12, 15, null, 60],
    ["curl-biceps", 2, 12, 12, null, 60],
    ["extension-polea", 2, 12, 12, null, 60],
  ]],
  ["piernas-a", 2, "Piernas A", "strength", [
    ["prensa-piernas", 3, 12, 12, null, 90],
    ["peso-muerto-rumano-mancuernas", 3, 10, 10, null, 90],
    ["curl-femoral-sentado", 3, 12, 12, null, 75],
    ["elevaciones-pantorrillas", 3, 15, 15, null, 45],
    ["plancha", 3, null, null, 30, 45],
  ]],
  ["libre-mie", 3, "Actividad libre", "free", []],
  ["tren-superior-b", 4, "Tren superior B", "strength", [
    ["press-inclinado-mancuernas", 3, 10, 10, null, 90],
    ["remo-maquina", 3, 10, 10, null, 90],
    ["jalon-pecho", 3, 10, 10, null, 90],
    ["press-hombros", 2, 10, 10, null, 75],
    ["curl-biceps", 2, 12, 12, null, 60],
    ["extension-triceps", 2, 12, 12, null, 60],
  ]],
  ["piernas-b", 5, "Piernas B", "strength", [
    ["sentadilla-goblet", 3, 10, 10, null, 90],
    ["hip-thrust", 3, 12, 12, null, 90],
    ["extension-cuadriceps", 3, 12, 12, null, 75],
    ["curl-femoral-acostado", 3, 12, 12, null, 75],
    ["elevaciones-rodillas", 3, 12, 12, null, 45],
  ]],
  ["libre-sab", 6, "Actividad libre", "free", []],
  ["libre-dom", 7, "Actividad libre", "free", []],
];
const days = routine.map((day, index) => {
  const [key, weekday, label, dayKind, items] = day;
  const dayId = idFor(`day-${key}`);
  return {
    id: dayId,
    user_id: userId,
    plan_id: planId,
    client_id: dayId,
    weekday,
    label,
    day_kind: dayKind,
    sort_order: index,
    created_at: now,
    updated_at: now,
    exercises: items.map((item, exerciseIndex) => {
      const [slug, sets, repsMin, repsMax, seconds, rest] = item;
      const exercise = bySlug.get(slug);
      if (!exercise) throw new Error(`Falta el ejercicio ${slug}`);
      const rowId = idFor(`plan-ex-${key}-${slug}`);
      return {
        id: rowId,
        user_id: userId,
        plan_day_id: dayId,
        exercise_id: exercise.id,
        client_id: rowId,
        sort_order: exerciseIndex,
        target_sets: sets,
        target_reps_min: repsMin,
        target_reps_max: repsMax,
        target_seconds: seconds,
        rest_seconds: rest,
        notes: "",
        created_at: now,
        updated_at: now,
        exercise,
      };
    }),
  };
});
const weightId = idFor("weight-inicial");
const goalWeightId = idFor("goal-weight");
const goalWeekId = idFor("goal-week");
const database = {
  updatedAt: now,
  profile: {
    id: userId,
    display_name: "Mathy",
    height_cm: 170,
    timezone: "America/Santiago",
    onboarding_completed: true,
    active_plan_id: planId,
    preferred_rest_seconds: 90,
    rest_timer_enabled: true,
    sound_enabled: false,
    created_at: now,
    updated_at: now,
  },
  exercises: catalog,
  plans: [{
    id: planId,
    user_id: userId,
    client_id: planId,
    name: "Mi rutina",
    is_active: true,
    created_at: now,
    updated_at: now,
    days,
  }],
  sessions: [],
  weights: [{
    id: weightId,
    user_id: userId,
    client_id: weightId,
    logged_at: now,
    weight_kg: 83,
    notes: "Peso inicial",
    created_at: now,
    updated_at: now,
  }],
  measurements: [],
  cardio: [],
  goals: [
    {
      id: goalWeightId,
      user_id: userId,
      client_id: goalWeightId,
      goal_type: "body_weight",
      target_value: 76,
      exercise_id: null,
      measurement_key: null,
      label: "Peso",
      deadline: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: goalWeekId,
      user_id: userId,
      client_id: goalWeekId,
      goal_type: "weekly_workouts",
      target_value: 4,
      exercise_id: null,
      measurement_key: null,
      label: "Entrenamientos por semana",
      deadline: null,
      created_at: now,
      updated_at: now,
    },
  ],
  overrides: [],
  photos: [],
};
mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/data/forma.json", import.meta.url), JSON.stringify(database));
console.log(`wrote ${exercises.length} exercises`);
