import type { RoutineExercise } from "@/data/routine";

export type DayPack = {
  id: string;
  zone: string;
  label: string;
  summary: string;
  exercises: RoutineExercise[];
};

export type WeekPack = {
  id: string;
  name: string;
  focus: string;
  summary: string;
  days: Array<{ weekday: number; packId: string }>;
};

function move(slug: string, sets: number, reps: number | [number, number] | null, rest: number, seconds: number | null = null): RoutineExercise {
  const repsMin = Array.isArray(reps) ? reps[0] : reps;
  const repsMax = Array.isArray(reps) ? reps[1] : reps;
  return { slug, sets, repsMin, repsMax, seconds, rest };
}

export const DAY_PACKS: DayPack[] = [
  {
    id: "atletico-lunes",
    zone: "Cuerpo completo",
    label: "Cuerpo completo A",
    summary: "Prensa, inclinado, jalón, remo, hombros, bíceps, tríceps y crunch. Al final, 20 min de caminadora si puedes.",
    exercises: [
      move("prensa-piernas", 3, [10, 12], 120),
      move("press-inclinado-mancuernas", 3, [8, 12], 90),
      move("jalon-pecho", 3, [10, 12], 90),
      move("remo-sentado", 2, [10, 12], 90),
      move("press-hombros-maquina", 2, 10, 75),
      move("curl-biceps", 2, 12, 60),
      move("extension-polea", 2, 12, 60),
      move("crunch", 2, 15, 45),
    ],
  },
  {
    id: "atletico-martes",
    zone: "Tren superior",
    label: "Torso y brazos",
    summary: "Pecho, espalda y más bíceps, tríceps y hombros. Al final, 20 min de caminadora o elíptica si puedes.",
    exercises: [
      move("press-pecho-maquina", 2, [10, 12], 90),
      move("remo-maquina", 2, [10, 12], 90),
      move("elevaciones-laterales", 3, [12, 15], 60),
      move("curl-mancuernas", 3, [10, 12], 60),
      move("curl-martillo", 2, 12, 60),
      move("extension-polea", 3, [10, 12], 60),
      move("extension-overhead", 2, 12, 60),
      move("plancha", 2, null, 45, 40),
    ],
  },
  {
    id: "atletico-miercoles",
    zone: "Piernas",
    label: "Piernas y glúteos",
    summary: "Prensa, hip thrust, rumano, femoral, cuádriceps, abductores y pantorrillas. Al final, 10 min de caminata si te sientes bien.",
    exercises: [
      move("prensa-piernas", 3, [10, 12], 120),
      move("hip-thrust", 3, [10, 12], 90),
      move("peso-muerto-rumano", 2, 10, 90),
      move("curl-femoral-acostado", 2, 12, 75),
      move("extension-cuadriceps", 2, 12, 75),
      move("abductores", 2, [15, 20], 60),
      move("elevaciones-pantorrillas", 3, 15, 45),
      move("plancha", 2, null, 45, 30),
    ],
  },
  {
    id: "atletico-viernes",
    zone: "Cuerpo completo",
    label: "Cuerpo completo B",
    summary: "Menos pierna que el miércoles. Press, jalón, remo, hombros, face pull y abdomen. Al final, 20 min de cardio suave si puedes.",
    exercises: [
      move("prensa-piernas", 2, 12, 90),
      move("curl-femoral-acostado", 2, 12, 75),
      move("press-pecho-maquina", 3, 10, 90),
      move("jalon-pecho", 3, 10, 90),
      move("remo-sentado", 3, 10, 90),
      move("press-hombros-maquina", 2, 10, 75),
      move("face-pulls", 2, 15, 60),
      move("elevaciones-rodillas", 2, 12, 45),
    ],
  },
  {
    id: "atletico-sabado",
    zone: "Brazos",
    label: "Brazos, hombros y abdomen",
    summary: "El día de brazos, hombros y abdomen. Al final, 25 min de caminadora o bicicleta si puedes.",
    exercises: [
      move("curl-polea", 3, [10, 12], 60),
      move("curl-martillo", 2, 12, 60),
      move("extension-polea", 3, [10, 12], 60),
      move("extension-overhead", 2, 12, 60),
      move("elevaciones-laterales", 3, [12, 15], 60),
      move("pajaros", 2, 15, 60),
      move("crunch-maquina", 3, [12, 15], 45),
      move("elevaciones-rodillas", 2, 12, 45),
    ],
  },
  {
    id: "cuerpo-a",
    zone: "Cuerpo completo",
    label: "Cuerpo A",
    summary: "Prensa, press de pecho, jalón, laterales y plancha.",
    exercises: [
      move("prensa-piernas", 3, 12, 90),
      move("press-pecho-maquina", 3, 10, 90),
      move("jalon-pecho", 3, [10, 12], 90),
      move("elevaciones-laterales", 2, [12, 15], 60),
      move("plancha", 3, null, 45, 30),
    ],
  },
  {
    id: "cuerpo-b",
    zone: "Cuerpo completo",
    label: "Cuerpo B",
    summary: "Sentadilla goblet, press inclinado, remo, femoral y rodillas.",
    exercises: [
      move("sentadilla-goblet", 3, 10, 90),
      move("press-inclinado-mancuernas", 3, 10, 90),
      move("remo-maquina", 3, 10, 90),
      move("curl-femoral-sentado", 3, 12, 75),
      move("elevaciones-rodillas", 3, 12, 45),
    ],
  },
  {
    id: "cuerpo-c",
    zone: "Cuerpo completo",
    label: "Cuerpo C",
    summary: "Hip thrust, hombros en máquina, remo sentado, cuádriceps y crunch.",
    exercises: [
      move("hip-thrust", 3, 12, 90),
      move("press-hombros-maquina", 3, 10, 75),
      move("remo-sentado", 3, [10, 12], 90),
      move("extension-cuadriceps", 3, 12, 75),
      move("crunch-maquina", 3, 12, 60),
    ],
  },
  {
    id: "superior-a",
    zone: "Tren superior",
    label: "Tren superior A",
    summary: "Press, remo, jalón, hombros, bíceps y tríceps. Unos 45 minutos.",
    exercises: [
      move("press-pecho-maquina", 3, [8, 10], 90),
      move("remo-sentado", 3, [8, 10], 90),
      move("jalon-pecho", 3, [10, 12], 75),
      move("press-hombros-maquina", 2, [10, 12], 75),
      move("curl-biceps", 2, 12, 60),
      move("extension-polea", 2, 12, 60),
    ],
  },
  {
    id: "superior-b",
    zone: "Tren superior",
    label: "Tren superior B",
    summary: "Inclinado, remo, jalón, laterales, bíceps y tríceps. Unos 45 minutos.",
    exercises: [
      move("press-inclinado-mancuernas", 3, [10, 12], 75),
      move("remo-maquina", 3, [10, 12], 75),
      move("jalon-pecho", 3, [10, 12], 75),
      move("elevaciones-laterales", 3, [12, 15], 60),
      move("curl-biceps", 2, 12, 60),
      move("extension-triceps", 2, 12, 60),
    ],
  },
  {
    id: "empuje-a",
    zone: "Empuje",
    label: "Empuje A",
    summary: "Pecho en máquina, inclinado, laterales, tríceps y peck deck.",
    exercises: [
      move("press-pecho-maquina", 3, 10, 90),
      move("press-inclinado-mancuernas", 3, 10, 90),
      move("elevaciones-laterales", 3, [12, 15], 60),
      move("extension-polea", 3, 12, 60),
      move("peck-deck", 2, 12, 60),
    ],
  },
  {
    id: "empuje-b",
    zone: "Empuje",
    label: "Empuje B",
    summary: "Hombros, fondos asistidos, frontales, tríceps y cruce de poleas.",
    exercises: [
      move("press-hombros-maquina", 3, 10, 75),
      move("fondos-asistidos", 3, 10, 90),
      move("elevaciones-frontales", 2, 12, 60),
      move("extension-overhead", 3, 12, 60),
      move("cruce-poleas", 2, 12, 60),
    ],
  },
  {
    id: "tiron-a",
    zone: "Tirón",
    label: "Tirón A",
    summary: "Jalón, remo sentado, remo con mancuerna, face pulls y bíceps.",
    exercises: [
      move("jalon-pecho", 3, [10, 12], 90),
      move("remo-sentado", 3, [10, 12], 90),
      move("remo-mancuerna", 3, 10, 90),
      move("face-pulls", 2, 15, 60),
      move("curl-polea", 2, 12, 60),
    ],
  },
  {
    id: "tiron-b",
    zone: "Tirón",
    label: "Tirón B",
    summary: "Remo en máquina, jalón, pullover, pájaros y curl martillo.",
    exercises: [
      move("remo-maquina", 3, 10, 90),
      move("jalon-pecho", 3, 10, 90),
      move("pullover-polea", 3, 12, 75),
      move("pajaros", 2, 12, 60),
      move("curl-martillo", 2, 12, 60),
    ],
  },
  {
    id: "piernas-a",
    zone: "Piernas",
    label: "Piernas A",
    summary: "Prensa, peso muerto rumano, femoral sentado, pantorrillas y plancha.",
    exercises: [
      move("prensa-piernas", 3, 12, 90),
      move("peso-muerto-rumano-mancuernas", 3, 10, 90),
      move("curl-femoral-sentado", 3, 12, 75),
      move("elevaciones-pantorrillas", 3, 15, 45),
      move("plancha", 3, null, 45, 30),
    ],
  },
  {
    id: "piernas-b",
    zone: "Piernas",
    label: "Piernas B",
    summary: "Goblet, hip thrust, cuádriceps, femoral acostado y rodillas.",
    exercises: [
      move("sentadilla-goblet", 3, 10, 90),
      move("hip-thrust", 3, 12, 90),
      move("extension-cuadriceps", 3, 12, 75),
      move("curl-femoral-acostado", 3, 12, 75),
      move("elevaciones-rodillas", 3, 12, 45),
    ],
  },
  {
    id: "gluteo-abdomen",
    zone: "Glúteo y abdomen",
    label: "Glúteo y abdomen",
    summary: "Hip thrust, abductores, puente, crunch, rodillas y plancha.",
    exercises: [
      move("hip-thrust", 3, 12, 90),
      move("abductores", 3, 15, 60),
      move("puente-gluteo", 3, 12, 60),
      move("crunch-maquina", 3, 12, 60),
      move("elevaciones-rodillas", 3, 12, 45),
      move("plancha", 3, null, 45, 30),
    ],
  },
  {
    id: "abdomen",
    zone: "Abdomen",
    label: "Abdomen",
    summary: "Crunch en máquina, rodillas, plancha, crunch y elevación de piernas.",
    exercises: [
      move("crunch-maquina", 3, 12, 60),
      move("elevaciones-rodillas", 3, 12, 45),
      move("plancha", 3, null, 45, 30),
      move("crunch", 3, 15, 45),
      move("elevaciones-piernas", 3, 12, 45),
    ],
  },
  {
    id: "abdomen-maquinas",
    zone: "Abdomen",
    label: "Abdomen en máquinas y polea",
    summary: "Polea alta, máquina, silla romana, banco declinado, Pallof y plancha lateral.",
    exercises: [
      move("crunch-polea", 3, [12, 15], 60),
      move("crunch-maquina", 3, [12, 15], 60),
      move("elevaciones-rodillas", 3, 12, 45),
      move("crunch-declinado", 2, 15, 45),
      move("pallof", 2, 12, 45),
      move("plancha-lateral", 2, null, 30, 30),
    ],
  },
];

export const WEEK_PACKS: WeekPack[] = [
  {
    id: "atletico-8",
    name: "Atlético 8 semanas",
    focus: "5 días · sugerida",
    summary: "Lunes y viernes cuerpo completo, martes torso y brazos, miércoles piernas, sábado brazos, hombros y abdomen. Jueves y domingo descanso. Las dos primeras semanas, donde dice 3 series haces 2.",
    days: [
      { weekday: 1, packId: "atletico-lunes" },
      { weekday: 2, packId: "atletico-martes" },
      { weekday: 3, packId: "atletico-miercoles" },
      { weekday: 5, packId: "atletico-viernes" },
      { weekday: 6, packId: "atletico-sabado" },
    ],
  },
  {
    id: "superior-piernas",
    name: "Superior y piernas",
    focus: "4 días · unos 45 min",
    summary: "La que mejor encaja a los 26 años, 1,70 m y unos 84 kg si quieres bajar hacia 76 sin soltar la fuerza. Cada zona entra dos veces: lunes y jueves torso, martes y viernes piernas.",
    days: [
      { weekday: 1, packId: "superior-a" },
      { weekday: 2, packId: "piernas-a" },
      { weekday: 4, packId: "superior-b" },
      { weekday: 5, packId: "piernas-b" },
    ],
  },
  {
    id: "cuerpo-completo",
    name: "Cuerpo completo",
    focus: "3 días · unos 45 min",
    summary: "Si esta semana puedes menos días. Lunes, miércoles y viernes, y en cada uno hay piernas, empuje, tirón y abdomen.",
    days: [
      { weekday: 1, packId: "cuerpo-a" },
      { weekday: 3, packId: "cuerpo-b" },
      { weekday: 5, packId: "cuerpo-c" },
    ],
  },
  {
    id: "piernas-abdomen",
    name: "Piernas y abdomen",
    focus: "3 días · piernas y abdomen",
    summary: "Un bloque de unas semanas, no el plan de todo el año. Lunes piernas, miércoles glúteo con abdomen y viernes la otra pierna.",
    days: [
      { weekday: 1, packId: "piernas-a" },
      { weekday: 3, packId: "gluteo-abdomen" },
      { weekday: 5, packId: "piernas-b" },
    ],
  },
  {
    id: "empuje-tiron",
    name: "Empuje y tirón",
    focus: "4 días · solo torso",
    summary: "Cuando las piernas piden descanso. Lunes y jueves empuje, martes y viernes tirón.",
    days: [
      { weekday: 1, packId: "empuje-a" },
      { weekday: 2, packId: "tiron-a" },
      { weekday: 4, packId: "empuje-b" },
      { weekday: 5, packId: "tiron-b" },
    ],
  },
];

export function weekPackClientId(id: string) {
  return `pack:${id}`;
}

export function dayPackById(id: string) {
  return DAY_PACKS.find((pack) => pack.id === id) ?? null;
}
