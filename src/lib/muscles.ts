import type { Exercise, MuscleGroup, SessionExercise } from "@/lib/types";

export type Region =
  | "pecho"
  | "hombros"
  | "biceps"
  | "triceps"
  | "antebrazos"
  | "abdomen"
  | "oblicuos"
  | "trapecio"
  | "dorsales"
  | "lumbar"
  | "gluteos"
  | "cuadriceps"
  | "isquios"
  | "aductores"
  | "gemelos";

export const REGION_LABEL: Record<Region, string> = {
  pecho: "Pecho",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebrazos: "Antebrazos",
  abdomen: "Abdomen",
  oblicuos: "Oblicuos",
  trapecio: "Trapecio",
  dorsales: "Dorsales",
  lumbar: "Zona lumbar",
  gluteos: "Glúteos",
  cuadriceps: "Cuádriceps",
  isquios: "Isquiotibiales",
  aductores: "Aductores",
  gemelos: "Gemelos",
};

type Split = { primary: Region[]; secondary: Region[] };

const press: Split = { primary: ["pecho"], secondary: ["hombros", "triceps"] };
const fly: Split = { primary: ["pecho"], secondary: ["hombros"] };
const pulldown: Split = { primary: ["dorsales"], secondary: ["biceps", "antebrazos"] };
const row: Split = { primary: ["dorsales", "trapecio"], secondary: ["biceps", "hombros"] };
const overhead: Split = { primary: ["hombros"], secondary: ["triceps", "trapecio"] };
const curl: Split = { primary: ["biceps"], secondary: ["antebrazos"] };
const triceps: Split = { primary: ["triceps"], secondary: [] };
const squat: Split = { primary: ["cuadriceps", "gluteos"], secondary: ["aductores", "isquios"] };
const hinge: Split = { primary: ["isquios", "gluteos"], secondary: ["lumbar"] };
const glute: Split = { primary: ["gluteos"], secondary: ["isquios"] };
const calf: Split = { primary: ["gemelos"], secondary: [] };
const crunch: Split = { primary: ["abdomen"], secondary: ["oblicuos"] };
const twist: Split = { primary: ["oblicuos"], secondary: ["abdomen"] };

const BY_SLUG: Record<string, Split> = {
  "press-banca": press,
  "press-banca-mancuernas": press,
  "press-inclinado-barra": { primary: ["pecho", "hombros"], secondary: ["triceps"] },
  "press-inclinado-mancuernas": { primary: ["pecho", "hombros"], secondary: ["triceps"] },
  "press-inclinado-maquina": { primary: ["pecho", "hombros"], secondary: ["triceps"] },
  "press-pecho-maquina": press,
  "fondos-pecho": { primary: ["pecho", "triceps"], secondary: ["hombros"] },
  "peck-deck": fly,
  "aperturas-mancuernas": fly,
  "aperturas-inclinadas": fly,
  "cruce-poleas": fly,
  "pullover-mancuerna": { primary: ["pecho", "dorsales"], secondary: ["triceps"] },
  "jalon-pecho": pulldown,
  "jalon-agarre-cerrado": pulldown,
  dominadas: pulldown,
  "dominadas-asistidas": pulldown,
  "remo-sentado": row,
  "remo-maquina": row,
  "remo-mancuerna": row,
  "remo-pecho-apoyado": row,
  "remo-barra": { primary: ["dorsales", "trapecio"], secondary: ["biceps", "lumbar", "isquios"] },
  "pullover-polea": { primary: ["dorsales"], secondary: ["pecho", "triceps"] },
  hiperextensiones: { primary: ["lumbar"], secondary: ["gluteos", "isquios"] },
  "press-militar": overhead,
  "press-hombros": overhead,
  "press-hombros-maquina": overhead,
  "elevaciones-laterales": { primary: ["hombros"], secondary: ["trapecio"] },
  "elevaciones-frontales": { primary: ["hombros"], secondary: ["pecho"] },
  pajaros: { primary: ["hombros", "trapecio"], secondary: ["dorsales"] },
  "face-pulls": { primary: ["hombros", "trapecio"], secondary: ["dorsales"] },
  "curl-biceps": curl,
  "curl-mancuernas": curl,
  "curl-barra": curl,
  "curl-martillo": { primary: ["biceps", "antebrazos"], secondary: [] },
  "curl-polea": curl,
  "curl-predicador": curl,
  "curl-inclinado": curl,
  "extension-polea": triceps,
  "extension-triceps": triceps,
  "extension-overhead": triceps,
  "extension-polea-overhead": triceps,
  "triceps-sentado": triceps,
  "press-frances": triceps,
  "fondos-asistidos": { primary: ["triceps"], secondary: ["pecho", "hombros"] },
  sentadillas: squat,
  "sentadilla-goblet": squat,
  "prensa-piernas": squat,
  "prensa-45": squat,
  "prensa-horizontal": squat,
  "hack-squat": squat,
  zancadas: squat,
  "extension-cuadriceps": { primary: ["cuadriceps"], secondary: [] },
  "curl-femoral-sentado": { primary: ["isquios"], secondary: ["gemelos"] },
  "curl-femoral-acostado": { primary: ["isquios"], secondary: ["gemelos"] },
  "peso-muerto-rumano": hinge,
  "peso-muerto-rumano-mancuernas": hinge,
  "peso-muerto": { primary: ["gluteos", "isquios", "lumbar"], secondary: ["cuadriceps", "trapecio", "antebrazos"] },
  "hip-thrust": glute,
  "puente-gluteo": glute,
  abductores: { primary: ["gluteos"], secondary: [] },
  "elevaciones-pantorrillas": calf,
  "gemelos-sentado": calf,
  plancha: { primary: ["abdomen"], secondary: ["oblicuos", "hombros"] },
  crunch,
  "crunch-maquina": crunch,
  "crunch-polea": crunch,
  "crunch-declinado": crunch,
  "crunch-balon": crunch,
  "crunch-inverso": crunch,
  "crunch-inverso-declinado": crunch,
  "elevaciones-piernas": crunch,
  "elevaciones-rodillas": crunch,
  "elevaciones-colgado": { primary: ["abdomen"], secondary: ["oblicuos", "antebrazos"] },
  navaja: crunch,
  "dead-bug": crunch,
  "rueda-abdominal": { primary: ["abdomen"], secondary: ["hombros", "dorsales", "lumbar"] },
  "giro-ruso": twist,
  "crunch-oblicuo": twist,
  "crunch-oblicuo-polea": twist,
  pallof: twist,
  "inclinacion-lateral": twist,
  "plancha-lateral": { primary: ["oblicuos"], secondary: ["abdomen", "gluteos"] },
  escaladores: { primary: ["abdomen"], secondary: ["hombros", "cuadriceps"] },
  caminadora: { primary: [], secondary: ["cuadriceps", "gemelos", "gluteos"] },
  bicicleta: { primary: [], secondary: ["cuadriceps", "gemelos"] },
  eliptica: { primary: [], secondary: ["cuadriceps", "gluteos"] },
  escaladora: { primary: [], secondary: ["gluteos", "cuadriceps", "gemelos"] },
};

const BY_GROUP: Record<MuscleGroup, Split> = {
  pecho: press,
  espalda: pulldown,
  hombros: overhead,
  biceps: curl,
  triceps,
  piernas: squat,
  abdomen: crunch,
  cardio: { primary: [], secondary: ["cuadriceps", "gemelos"] },
};

const FROM_LABEL: Record<string, Region> = {
  pecho: "pecho",
  hombros: "hombros",
  "tríceps": "triceps",
  triceps: "triceps",
  "bíceps": "biceps",
  biceps: "biceps",
  isquios: "isquios",
  isquiotibiales: "isquios",
  espalda: "dorsales",
  "espalda baja": "lumbar",
  antebrazo: "antebrazos",
  "glúteos": "gluteos",
  "glúteo medio": "gluteos",
  oblicuos: "oblicuos",
};

export function musclesFor(exercise: Pick<Exercise, "slug" | "muscle_group" | "secondary_muscles">): Split {
  const known = exercise.slug ? BY_SLUG[exercise.slug] : undefined;
  if (known) return known;
  const base = BY_GROUP[exercise.muscle_group];
  const extra = exercise.secondary_muscles
    .map((label) => FROM_LABEL[label.toLowerCase()])
    .filter((region): region is Region => Boolean(region) && !base.primary.includes(region));
  return { primary: base.primary, secondary: [...new Set([...base.secondary, ...extra])] };
}

export type MuscleLevels = Partial<Record<Region, number>>;

export function exerciseLevels(exercise: Pick<Exercise, "slug" | "muscle_group" | "secondary_muscles">): MuscleLevels {
  const split = musclesFor(exercise);
  const levels: MuscleLevels = {};
  for (const region of split.secondary) levels[region] = 1;
  for (const region of split.primary) levels[region] = 3;
  return levels;
}

export type MuscleLoad = { region: Region; direct: number; support: number };

export function sessionMuscleLoad(blocks: SessionExercise[]): MuscleLoad[] {
  const load = new Map<Region, MuscleLoad>();
  for (const block of blocks) {
    const sets = block.sets.filter((set) => set.completed_at && !set.is_warmup).length;
    if (sets === 0) continue;
    const split = musclesFor(block.exercise);
    for (const region of split.primary) {
      const entry = load.get(region) ?? { region, direct: 0, support: 0 };
      entry.direct += sets;
      load.set(region, entry);
    }
    for (const region of split.secondary) {
      const entry = load.get(region) ?? { region, direct: 0, support: 0 };
      entry.support += sets;
      load.set(region, entry);
    }
  }
  return [...load.values()].sort((a, b) => b.direct - a.direct || b.support - a.support);
}

export function loadLevels(load: MuscleLoad[]): MuscleLevels {
  const top = Math.max(1, ...load.map((item) => item.direct + item.support / 2));
  const levels: MuscleLevels = {};
  for (const item of load) {
    const score = (item.direct + item.support / 2) / top;
    levels[item.region] = item.direct === 0 ? 1 : score > 0.66 ? 3 : score > 0.33 ? 2 : 1;
  }
  return levels;
}
