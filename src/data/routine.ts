import type { DayKind, TrackingType } from "@/lib/types";

export type RoutineExercise = {
  slug: string;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  seconds: number | null;
  rest: number;
  note?: string;
};

export type RoutineDay = {
  weekday: number;
  label: string;
  dayKind: DayKind;
  exercises: RoutineExercise[];
};

const upperA: RoutineExercise[] = [
  { slug: "press-pecho-maquina", sets: 3, repsMin: 10, repsMax: 10, seconds: null, rest: 90 },
  { slug: "jalon-pecho", sets: 3, repsMin: 10, repsMax: 12, seconds: null, rest: 90 },
  { slug: "remo-sentado", sets: 3, repsMin: 10, repsMax: 12, seconds: null, rest: 90 },
  { slug: "elevaciones-laterales", sets: 3, repsMin: 12, repsMax: 15, seconds: null, rest: 60 },
  { slug: "curl-biceps", sets: 2, repsMin: 12, repsMax: 12, seconds: null, rest: 60 },
  { slug: "extension-polea", sets: 2, repsMin: 12, repsMax: 12, seconds: null, rest: 60 },
];

const legsA: RoutineExercise[] = [
  { slug: "prensa-piernas", sets: 3, repsMin: 12, repsMax: 12, seconds: null, rest: 90 },
  { slug: "peso-muerto-rumano-mancuernas", sets: 3, repsMin: 10, repsMax: 10, seconds: null, rest: 90 },
  { slug: "curl-femoral-sentado", sets: 3, repsMin: 12, repsMax: 12, seconds: null, rest: 75 },
  { slug: "elevaciones-pantorrillas", sets: 3, repsMin: 15, repsMax: 15, seconds: null, rest: 45 },
  { slug: "plancha", sets: 3, repsMin: null, repsMax: null, seconds: 30, rest: 45 },
];

const upperB: RoutineExercise[] = [
  { slug: "press-inclinado-mancuernas", sets: 3, repsMin: 10, repsMax: 10, seconds: null, rest: 90 },
  { slug: "remo-maquina", sets: 3, repsMin: 10, repsMax: 10, seconds: null, rest: 90 },
  { slug: "jalon-pecho", sets: 3, repsMin: 10, repsMax: 10, seconds: null, rest: 90 },
  { slug: "press-hombros", sets: 2, repsMin: 10, repsMax: 10, seconds: null, rest: 75 },
  { slug: "curl-biceps", sets: 2, repsMin: 12, repsMax: 12, seconds: null, rest: 60 },
  { slug: "extension-triceps", sets: 2, repsMin: 12, repsMax: 12, seconds: null, rest: 60 },
];

const legsB: RoutineExercise[] = [
  { slug: "sentadilla-goblet", sets: 3, repsMin: 10, repsMax: 10, seconds: null, rest: 90 },
  { slug: "hip-thrust", sets: 3, repsMin: 12, repsMax: 12, seconds: null, rest: 90 },
  { slug: "extension-cuadriceps", sets: 3, repsMin: 12, repsMax: 12, seconds: null, rest: 75 },
  { slug: "curl-femoral-acostado", sets: 3, repsMin: 12, repsMax: 12, seconds: null, rest: 75 },
  { slug: "elevaciones-rodillas", sets: 3, repsMin: 12, repsMax: 12, seconds: null, rest: 45 },
];

const templates: Array<{ label: string; exercises: RoutineExercise[] }> = [
  { label: "Tren superior A", exercises: upperA },
  { label: "Piernas A", exercises: legsA },
  { label: "Tren superior B", exercises: upperB },
  { label: "Piernas B", exercises: legsB },
];

export function buildRoutine(strengthWeekdays: number[]): RoutineDay[] {
  const unique = [...new Set(strengthWeekdays)].filter((day) => day >= 1 && day <= 7).sort((a, b) => a - b);
  const chosen = unique.slice(0, 4);
  const days: RoutineDay[] = chosen.map((weekday, index) => ({
    weekday,
    label: templates[index]?.label ?? "Fuerza",
    dayKind: "strength",
    exercises: templates[index]?.exercises ?? [],
  }));
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    if (days.some((day) => day.weekday === weekday)) continue;
    days.push({ weekday, label: "Actividad libre", dayKind: "free", exercises: [] });
  }
  return days.sort((a, b) => a.weekday - b.weekday);
}

export function repLabel(min: number | null, max: number | null, seconds: number | null, tracking: TrackingType) {
  if (tracking === "time") return seconds ? `${seconds} s` : "tiempo";
  if (tracking === "distance") return "distancia";
  if (min && max && min !== max) return `${min}–${max}`;
  if (min) return `${min}`;
  return "reps";
}
