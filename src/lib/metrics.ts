import { addIsoDays, isoWeekday, santiagoDate, startOfIsoWeek } from "./format";
import type { DayKind, Goal, SessionTree, WorkoutPlanDay, WorkoutSet } from "./types";

export type SetLike = Pick<WorkoutSet, "completed_at" | "is_warmup" | "weight_kg" | "reps" | "duration_seconds" | "distance_m">;

export function isEffective(set: Pick<WorkoutSet, "completed_at" | "is_warmup">) {
  return Boolean(set.completed_at) && !set.is_warmup;
}

export function effectiveSets<T extends Pick<WorkoutSet, "completed_at" | "is_warmup">>(sets: T[]) {
  return sets.filter(isEffective);
}

export function setVolume(set: Pick<WorkoutSet, "weight_kg" | "reps">) {
  if (set.weight_kg == null || set.reps == null) return 0;
  return Number(set.weight_kg) * Number(set.reps);
}

export function volumeOf(sets: SetLike[]) {
  return effectiveSets(sets).reduce((sum, set) => sum + setVolume(set), 0);
}

export function sessionDurationMs(session: {
  started_at: string;
  ended_at: string | null;
  paused_ms: number;
  pause_started_at: string | null;
  status: string;
}, now = Date.now()) {
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : now;
  let paused = session.paused_ms ?? 0;
  if (session.status === "paused" && session.pause_started_at) {
    paused += Math.max(0, now - new Date(session.pause_started_at).getTime());
  }
  return Math.max(0, end - start - paused);
}

export function weightGoalRatio(start: number, current: number, target: number) {
  const span = start - target;
  if (span === 0) return current === target ? 1 : 0;
  return clamp((start - current) / span);
}

export function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

type PlannedDay = Pick<WorkoutPlanDay, "id" | "weekday" | "day_kind">;

export function plannedDayIdsForDate(
  iso: string,
  days: PlannedDay[],
  overrides: Array<{ plan_day_id: string; from_date: string; to_date: string }>,
) {
  const weekday = isoWeekday(iso);
  const movedAway = new Set(overrides.filter((item) => item.from_date === iso).map((item) => item.plan_day_id));
  const movedHere = overrides.filter((item) => item.to_date === iso).map((item) => item.plan_day_id);
  const ids = days
    .filter((day) => day.day_kind === "strength" && day.weekday === weekday && !movedAway.has(day.id))
    .map((day) => day.id);
  for (const id of movedHere) {
    const day = days.find((item) => item.id === id && item.day_kind === "strength");
    if (day && !ids.includes(day.id)) ids.push(day.id);
  }
  return ids;
}

export function trainingStreak(input: {
  today: string;
  days: PlannedDay[];
  completedDates: string[];
  overrides: Array<{ plan_day_id: string; from_date: string; to_date: string }>;
}) {
  const done = new Set(input.completedDates);
  let streak = 0;
  for (let offset = 0; offset < 370; offset += 1) {
    const iso = addIsoDays(input.today, -offset);
    const planned = plannedDayIdsForDate(iso, input.days, input.overrides);
    if (planned.length === 0) continue;
    if (done.has(iso)) {
      streak += 1;
      continue;
    }
    if (iso === input.today) continue;
    break;
  }
  return streak;
}

export function countInWeek(dates: string[], today = santiagoDate()) {
  const start = startOfIsoWeek(today);
  const end = addIsoDays(start, 6);
  return dates.filter((iso) => iso >= start && iso <= end).length;
}

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  previousWeight: number | null;
  previousReps: number | null;
};

export function recordsInSession(session: SessionTree, history: Array<WorkoutSet & { exercise_id: string; session_id: string }>) {
  const records: PersonalRecord[] = [];
  for (const block of session.exercises) {
    const current = effectiveSets(block.sets).filter((set) => set.weight_kg != null && set.reps != null);
    if (current.length === 0) continue;
    const best = current.reduce((top, set) => (compareSet(set, top) > 0 ? set : top));
    const prior = history.filter(
      (set) =>
        set.exercise_id === block.exercise_id &&
        set.session_id !== session.id &&
        !set.is_warmup &&
        set.completed_at &&
        set.weight_kg != null &&
        set.reps != null,
    );
    const priorBest = prior.reduce<typeof best | null>((top, set) => {
      if (!top || compareSet(set, top) > 0) return set;
      return top;
    }, null);
    if (!priorBest || compareSet(best, priorBest) > 0) {
      records.push({
        exerciseId: block.exercise_id,
        exerciseName: block.exercise.name,
        weight: Number(best.weight_kg),
        reps: Number(best.reps),
        previousWeight: priorBest ? Number(priorBest.weight_kg) : null,
        previousReps: priorBest ? Number(priorBest.reps) : null,
      });
    }
  }
  return records.filter((record) => record.previousWeight != null);
}

function compareSet(
  a: { weight_kg: number | null; reps: number | null },
  b: { weight_kg: number | null; reps: number | null },
) {
  const weight = Number(a.weight_kg) - Number(b.weight_kg);
  if (weight !== 0) return weight;
  return Number(a.reps) - Number(b.reps);
}

export function bestSet(sets: Array<Pick<WorkoutSet, "weight_kg" | "reps" | "completed_at" | "is_warmup">>) {
  const usable = effectiveSets(sets).filter((set) => set.weight_kg != null && set.reps != null);
  if (usable.length === 0) return null;
  return usable.reduce((top, set) => (compareSet(set, top) > 0 ? set : top));
}

export type Milestone = {
  key: string;
  title: string;
  detail: string;
  reached: boolean;
};

export function buildMilestones(input: {
  completedSessions: number;
  consistentWeeks: number;
  hasImprovedRecord: boolean;
  weeksSinceStart: number;
}): Milestone[] {
  return [
    {
      key: "ten-sessions",
      title: "Primeras 10 sesiones",
      detail: "Completa 10 entrenamientos de fuerza.",
      reached: input.completedSessions >= 10,
    },
    {
      key: "steady-month",
      title: "Primer mes constante",
      detail: "Cumple tu meta semanal durante 4 semanas.",
      reached: input.consistentWeeks >= 4,
    },
    {
      key: "strength-record",
      title: "Nuevo récord de fuerza",
      detail: "Supera una marca anterior en algún ejercicio.",
      reached: input.hasImprovedRecord,
    },
    {
      key: "twelve-weeks",
      title: "12 semanas de seguimiento",
      detail: "Llevas doce semanas registrando tu proceso.",
      reached: input.weeksSinceStart >= 12,
    },
  ];
}

export function consecutiveGoalWeeks(weekCounts: number[], target: number) {
  let best = 0;
  let current = 0;
  for (const count of weekCounts) {
    if (count >= target) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

export function goalProgress(goal: Goal, actual: number | null) {
  if (actual == null || !Number.isFinite(actual)) return 0;
  if (goal.goal_type === "body_weight" || goal.goal_type === "measurement") return 0;
  if (goal.target_value <= 0) return 0;
  return clamp(actual / Number(goal.target_value));
}

export function dayKindLabel(kind: DayKind) {
  if (kind === "strength") return "Fuerza";
  if (kind === "rest") return "Descanso";
  if (kind === "cardio") return "Cardio";
  return "Libre";
}
