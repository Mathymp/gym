import { openDB } from "idb";
import { dayPackById, weekPackClientId, WEEK_PACKS } from "@/data/packs";
import { EXTRA_EXERCISES } from "@/data/extra-exercises";
import { buildRoutine, type RoutineExercise } from "@/data/routine";
import { addIsoDays, santiagoDate, startOfIsoWeek } from "./format";
import { newId } from "./utils";
import type {
  BodyMeasurement,
  BodyWeightLog,
  CardioSession,
  Exercise,
  Goal,
  PhotoAngle,
  PlanDay,
  PlanExercise,
  PlanTree,
  Profile,
  ProgressPhoto,
  ScheduleOverride,
  SessionExercise,
  SessionTree,
  WorkoutSet,
} from "./types";

const FILE_KEY = "forma-data-v1";

export type CompletedEntry = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  session_id: string;
  started_at: string;
  plan_day_id: string | null;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  is_warmup: boolean;
  completed_at: string;
};

type Database = {
  updatedAt: string;
  profile: Profile;
  exercises: Exercise[];
  plans: PlanTree[];
  sessions: SessionTree[];
  weights: BodyWeightLog[];
  measurements: BodyMeasurement[];
  cardio: CardioSession[];
  goals: Goal[];
  overrides: ScheduleOverride[];
  photos: ProgressPhoto[];
};

let memory: Database | null = null;
let loading: Promise<Database> | null = null;

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function write(db: Database) {
  db.updatedAt = now();
  memory = db;
  try {
    localStorage.setItem(FILE_KEY, JSON.stringify(db));
  } catch {
    throw new Error("Este teléfono no tiene espacio para guardar más datos.");
  }
}

async function load() {
  if (memory) {
    ensureAthleticPlan(memory);
    return memory;
  }
  loading ??= (async () => {
    const saved = localStorage.getItem(FILE_KEY);
    if (saved) memory = JSON.parse(saved) as Database;
    else {
      const response = await fetch(`${import.meta.env.BASE_URL}data/forma.json`);
      if (!response.ok) throw new Error("No encontramos el archivo data/forma.json.");
      memory = (await response.json()) as Database;
      localStorage.setItem(FILE_KEY, JSON.stringify(memory));
    }
    ensureAthleticPlan(memory);
    return memory;
  })();
  return loading;
}

function photoStore() {
  return openDB("forma-photos", 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("blobs")) database.createObjectStore("blobs");
    },
  });
}

function upsert<T extends { id: string }>(rows: T[], row: T) {
  const index = rows.findIndex((item) => item.id === row.id);
  if (index >= 0) rows[index] = row;
  else rows.unshift(row);
}

function drop<T extends { id: string }>(rows: T[], id: string) {
  const index = rows.findIndex((item) => item.id === id);
  if (index >= 0) rows.splice(index, 1);
}

function putPlan(db: Database, plan: PlanTree) {
  upsert(db.plans, plan);
}

function putSession(db: Database, session: SessionTree) {
  upsert(db.sessions, session);
}

export async function exportFile() {
  return clone(await load());
}

export async function resetFile() {
  localStorage.removeItem(FILE_KEY);
  memory = null;
  loading = null;
  const database = await photoStore();
  await database.clear("blobs");
}

export async function fetchProfile() {
  const db = await load();
  return clone(db.profile);
}

export async function saveProfile(profile: Profile, patch: Partial<Profile>) {
  const db = await load();
  db.profile = { ...profile, ...patch, updated_at: now() };
  write(db);
  return clone(db.profile);
}

export async function fetchExercises() {
  const db = await load();
  return clone(db.exercises).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function createExercise(input: Omit<Exercise, "id" | "user_id" | "client_id" | "created_at" | "updated_at" | "slug"> & { slug?: string | null }) {
  const db = await load();
  const id = newId();
  const row: Exercise = {
    ...input,
    id,
    client_id: id,
    user_id: db.profile.id,
    slug: input.slug ?? null,
    machine_name: input.machine_name?.trim() || null,
    created_at: now(),
    updated_at: now(),
  };
  db.exercises.push(row);
  write(db);
  return row;
}

export async function fetchPlans() {
  const db = await load();
  return clone(db.plans);
}

export async function fetchPlan(id: string) {
  const plans = await fetchPlans();
  const plan = plans.find((item) => item.id === id);
  if (!plan) throw new Error("No encontramos esa rutina.");
  return plan;
}

export async function createRoutine(strengthWeekdays: number[], name = "Mi rutina") {
  const db = await load();
  const bySlug = new Map(db.exercises.filter((item) => item.slug).map((item) => [item.slug as string, item]));
  const planId = newId();
  const plan: PlanTree = {
    id: planId,
    user_id: db.profile.id,
    client_id: planId,
    name,
    is_active: false,
    created_at: now(),
    updated_at: now(),
    days: [],
  };
  let order = 0;
  for (const template of buildRoutine(strengthWeekdays)) {
    const dayId = newId();
    const day: PlanDay = {
      id: dayId,
      user_id: db.profile.id,
      plan_id: planId,
      client_id: dayId,
      weekday: template.weekday,
      label: template.label,
      day_kind: template.dayKind,
      sort_order: order,
      created_at: now(),
      updated_at: now(),
      exercises: [],
    };
    order += 1;
    let exerciseOrder = 0;
    for (const item of template.exercises) {
      const exercise = bySlug.get(item.slug);
      if (!exercise) throw new Error("Falta un ejercicio de la rutina en data/forma.json.");
      const planExerciseId = newId();
      day.exercises.push({
        id: planExerciseId,
        user_id: db.profile.id,
        plan_day_id: dayId,
        exercise_id: exercise.id,
        client_id: planExerciseId,
        sort_order: exerciseOrder,
        target_sets: item.sets,
        target_reps_min: item.repsMin,
        target_reps_max: item.repsMax,
        target_seconds: item.seconds,
        rest_seconds: item.rest,
        notes: "",
        created_at: now(),
        updated_at: now(),
        exercise,
      });
      exerciseOrder += 1;
    }
    plan.days.push(day);
  }
  db.plans.unshift(plan);
  for (const item of db.plans) item.is_active = item.id === planId;
  db.profile.active_plan_id = planId;
  db.profile.updated_at = now();
  write(db);
  return planId;
}

export async function createBlankPlan(name: string) {
  const db = await load();
  const planId = newId();
  const plan: PlanTree = {
    id: planId,
    user_id: db.profile.id,
    client_id: planId,
    name: name.trim(),
    is_active: false,
    created_at: now(),
    updated_at: now(),
    days: [1, 2, 3, 4, 5, 6, 7].map((weekday, index) => {
      const dayId = newId();
      return {
        id: dayId,
        user_id: db.profile.id,
        plan_id: planId,
        client_id: dayId,
        weekday,
        label: weekday === 1 ? "Día 1" : "Libre",
        day_kind: weekday === 1 ? "strength" : "free",
        sort_order: index,
        created_at: now(),
        updated_at: now(),
        exercises: [],
      };
    }),
  };
  db.plans.unshift(plan);
  write(db);
  return clone(plan);
}

function planExercises(db: Database, dayId: string, items: RoutineExercise[]): PlanExercise[] {
  const bySlug = new Map(db.exercises.filter((item) => item.slug).map((item) => [item.slug as string, item]));
  return items.map((item, index) => {
    const exercise = bySlug.get(item.slug);
    if (!exercise) throw new Error("Falta un ejercicio del pack en la biblioteca.");
    const id = newId();
    const stamp = now();
    return {
      id,
      user_id: db.profile.id,
      plan_day_id: dayId,
      exercise_id: exercise.id,
      client_id: id,
      sort_order: index,
      target_sets: item.sets,
      target_reps_min: item.repsMin,
      target_reps_max: item.repsMax,
      target_seconds: item.seconds,
      rest_seconds: item.rest,
      notes: item.note ?? "",
      created_at: stamp,
      updated_at: stamp,
      exercise,
    };
  });
}

function materializeWeekPack(db: Database, packId: string, activate: boolean) {
  const pack = WEEK_PACKS.find((item) => item.id === packId);
  if (!pack) throw new Error("No encontramos ese pack.");
  const marker = weekPackClientId(pack.id);
  let plan = db.plans.find((item) => item.client_id === marker);
  if (!plan) {
    const activeId = newId();
    const byDay = new Map(pack.days.map((day) => [day.weekday, day.packId]));
    const stamp = now();
    const created: PlanTree = {
      id: activeId,
      user_id: db.profile.id,
      client_id: marker,
      name: pack.name,
      is_active: false,
      created_at: stamp,
      updated_at: stamp,
      days: [],
    };
    if (pack.program) {
      created.program_started_on = todayIso();
      created.easy_through = null;
    }
    for (let weekday = 1; weekday <= 7; weekday += 1) {
      const dayId = newId();
      const source = byDay.get(weekday);
      const dayPack = source ? dayPackById(source) : null;
      created.days.push({
        id: dayId,
        user_id: db.profile.id,
        plan_id: activeId,
        client_id: dayId,
        weekday,
        label: dayPack?.label ?? (pack.program ? "Descanso" : "Actividad libre"),
        day_kind: dayPack ? "strength" : pack.program ? "rest" : "free",
        sort_order: weekday - 1,
        created_at: stamp,
        updated_at: stamp,
        exercises: dayPack ? planExercises(db, dayId, dayPack.exercises) : [],
      });
    }
    db.plans.unshift(created);
    plan = created;
  }
  if (activate) {
    for (const item of db.plans) item.is_active = item.id === plan.id;
    db.profile.active_plan_id = plan.id;
    db.profile.updated_at = now();
  }
  return plan.id;
}

function ensureCatalog(db: Database) {
  const known = new Set(db.exercises.map((item) => item.id));
  const missing = EXTRA_EXERCISES.filter((item) => !known.has(item.id));
  if (missing.length === 0) return;
  db.exercises.push(...clone(missing));
  write(db);
}

function ensureAthleticPlan(db: Database) {
  ensureCatalog(db);
  const marker = weekPackClientId("definida-8");
  const existing = db.plans.find((plan) => plan.client_id === marker);
  if (!existing) {
    materializeWeekPack(db, "definida-8", true);
    write(db);
    return;
  }
  let changed = false;
  for (const day of existing.days) {
    if (day.exercises.length === 0 && day.day_kind !== "rest") {
      day.label = "Descanso";
      day.day_kind = "rest";
      changed = true;
    }
  }
  if (changed) write(db);
}

export async function installWeekPack(packId: string) {
  const db = await load();
  const activeId = materializeWeekPack(db, packId, true);
  write(db);
  return activeId;
}

export async function setEasyThrough(planId: string, through: string) {
  const db = await load();
  const plan = db.plans.find((item) => item.id === planId);
  if (!plan) return;
  plan.easy_through = through;
  plan.updated_at = now();
  write(db);
}

export async function swapThisWeek(dayA: PlanDay, dayB: PlanDay) {
  const monday = startOfIsoWeek(todayIso());
  const dateA = addIsoDays(monday, dayA.weekday - 1);
  const dateB = addIsoDays(monday, dayB.weekday - 1);
  await movePlanDay(dayA.id, dateA, dateB);
  await movePlanDay(dayB.id, dateB, dateA);
}

export async function applyDayPack(plan: PlanTree, dayId: string, packId: string) {
  const pack = dayPackById(packId);
  if (!pack) throw new Error("No encontramos ese pack.");
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  const day = current.days.find((item) => item.id === dayId);
  if (!day) throw new Error("No encontramos ese día.");
  putPlan(db, {
    ...current,
    updated_at: now(),
    days: current.days.map((item) =>
      item.id === dayId
        ? { ...item, label: pack.label, day_kind: "strength", exercises: planExercises(db, item.id, pack.exercises), updated_at: now() }
        : item,
    ),
  });
  write(db);
}

export async function activatePlan(planId: string) {
  const db = await load();
  for (const plan of db.plans) plan.is_active = plan.id === planId;
  db.profile.active_plan_id = planId;
  db.profile.updated_at = now();
  write(db);
}

export async function swapPlanDays(plan: PlanTree, dayA: string, dayB: string) {
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  const first = current.days.find((day) => day.id === dayA);
  const second = current.days.find((day) => day.id === dayB);
  if (!first || !second) return clone(current);
  const next: PlanTree = {
    ...current,
    updated_at: now(),
    days: current.days
      .map((day) => {
        if (day.id === dayA) return { ...day, weekday: second.weekday, updated_at: now() };
        if (day.id === dayB) return { ...day, weekday: first.weekday, updated_at: now() };
        return day;
      })
      .sort((a, b) => a.weekday - b.weekday),
  };
  putPlan(db, next);
  write(db);
  return clone(next);
}

export async function savePlanMeta(plan: PlanTree, patch: Partial<Pick<PlanTree, "name">>) {
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  putPlan(db, { ...current, ...patch, updated_at: now() });
  write(db);
}

export async function savePlanDay(plan: PlanTree, day: PlanDay) {
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  putPlan(db, {
    ...current,
    updated_at: now(),
    days: current.days.map((item) => (item.id === day.id ? { ...day, updated_at: now() } : item)),
  });
  write(db);
}

export async function savePlanExercise(plan: PlanTree, dayId: string, exercise: PlanExercise, _mode: "insert" | "update") {
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  const stamped = { ...exercise, updated_at: now() };
  putPlan(db, {
    ...current,
    updated_at: now(),
    days: current.days.map((day) => {
      if (day.id !== dayId) return day;
      const exists = day.exercises.some((item) => item.id === exercise.id);
      const exercises = exists
        ? day.exercises.map((item) => (item.id === exercise.id ? stamped : item))
        : [...day.exercises, stamped].sort((a, b) => a.sort_order - b.sort_order);
      return { ...day, exercises };
    }),
  });
  write(db);
}

export async function insertPlanExercise(plan: PlanTree, dayId: string, exercise: PlanExercise, index: number) {
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  const stamp = now();
  putPlan(db, {
    ...current,
    updated_at: stamp,
    days: current.days.map((day) => {
      if (day.id !== dayId) return day;
      const list = [...day.exercises].sort((a, b) => a.sort_order - b.sort_order);
      list.splice(Math.max(0, Math.min(index, list.length)), 0, { ...exercise, updated_at: stamp });
      return { ...day, exercises: list.map((item, order) => ({ ...item, sort_order: order })) };
    }),
  });
  write(db);
}

export async function insertBlock(session: SessionTree, block: SessionExercise, at: number) {
  const list = [...session.exercises];
  list.splice(Math.max(0, Math.min(at, list.length)), 0, block);
  const next = { ...session, exercises: list.map((item, order) => ({ ...item, sort_order: order })), updated_at: now() };
  await saveSessionTree(next);
  return next;
}

export async function removePlanExercise(plan: PlanTree, dayId: string, exercise: PlanExercise) {
  const db = await load();
  const current = db.plans.find((item) => item.id === plan.id) ?? plan;
  putPlan(db, {
    ...current,
    updated_at: now(),
    days: current.days.map((day) =>
      day.id === dayId ? { ...day, exercises: day.exercises.filter((item) => item.id !== exercise.id) } : day,
    ),
  });
  write(db);
}

export async function fetchOpenSession() {
  const db = await load();
  const open = db.sessions.find((session) => session.status === "active" || session.status === "paused");
  return open ? clone(open) : null;
}

export async function fetchSession(id: string) {
  const db = await load();
  const session = db.sessions.find((item) => item.id === id);
  if (!session) throw new Error("No encontramos esa sesión.");
  return clone(session);
}

export async function startSession(plan: PlanTree | null, day: PlanDay | null) {
  const db = await load();
  const existing = db.sessions.find((session) => session.status === "active" || session.status === "paused");
  if (existing) return clone(existing);
  const sessionId = newId();
  const suggestions = suggestionMap(db, day?.exercises.map((item) => item.exercise_id) ?? []);
  const session: SessionTree = {
    id: sessionId,
    user_id: db.profile.id,
    client_id: sessionId,
    plan_id: plan?.id ?? null,
    plan_day_id: day?.id ?? null,
    title: day?.label ?? "Entrenamiento libre",
    status: "active",
    started_at: now(),
    ended_at: null,
    paused_ms: 0,
    pause_started_at: null,
    notes: "",
    created_at: now(),
    updated_at: now(),
    exercises: [],
  };
  let order = 0;
  for (const planned of day?.exercises ?? []) {
    session.exercises.push(buildBlock(db.profile.id, sessionId, planned.exercise, order, planned, suggestions.get(planned.exercise_id) ?? null));
    order += 1;
  }
  db.sessions.unshift(session);
  write(db);
  return clone(session);
}

function buildBlock(
  user: string,
  sessionId: string,
  exercise: Exercise,
  order: number,
  planned: { target_sets: number; target_reps_min: number | null; target_seconds: number | null; rest_seconds: number } | null,
  suggestion: { weight_kg: number | null; reps: number | null; duration_seconds: number | null; distance_m: number | null } | null,
): SessionExercise {
  const blockId = newId();
  const sets: WorkoutSet[] = [];
  const count = planned?.target_sets ?? 3;
  for (let index = 1; index <= count; index += 1) {
    const setId = newId();
    sets.push({
      id: setId,
      user_id: user,
      session_exercise_id: blockId,
      client_id: setId,
      set_index: index,
      weight_kg: suggestion?.weight_kg ?? null,
      reps: exercise.tracking_type === "time" || exercise.tracking_type === "distance" ? null : suggestion?.reps ?? planned?.target_reps_min ?? null,
      duration_seconds: exercise.tracking_type === "time"
        ? suggestion?.duration_seconds ?? planned?.target_seconds ?? null
        : exercise.tracking_type === "distance"
          ? planned?.target_seconds ?? suggestion?.duration_seconds ?? null
          : null,
      distance_m: exercise.tracking_type === "distance" ? suggestion?.distance_m ?? null : null,
      rpe: null,
      is_warmup: false,
      completed_at: null,
      notes: "",
      created_at: now(),
      updated_at: now(),
    });
  }
  return {
    id: blockId,
    user_id: user,
    session_id: sessionId,
    exercise_id: exercise.id,
    client_id: blockId,
    sort_order: order,
    notes: "",
    substituted_from_exercise_id: null,
    replaced: false,
    created_at: now(),
    updated_at: now(),
    exercise,
    sets,
  };
}

function suggestionMap(db: Database, exerciseIds: string[]) {
  const map = new Map<string, { weight_kg: number | null; reps: number | null; duration_seconds: number | null; distance_m: number | null }>();
  for (const entry of completedEntries(db)) {
    if (!exerciseIds.includes(entry.exercise_id) || entry.is_warmup || map.has(entry.exercise_id)) continue;
    map.set(entry.exercise_id, entry);
  }
  return map;
}

function completedEntries(db: Database): CompletedEntry[] {
  const entries: CompletedEntry[] = [];
  for (const session of db.sessions) {
    if (session.status !== "completed") continue;
    for (const block of session.exercises) {
      for (const set of block.sets) {
        if (!set.completed_at) continue;
        entries.push({
          id: set.id,
          exercise_id: block.exercise_id,
          exercise_name: block.exercise.name,
          muscle_group: block.exercise.muscle_group,
          session_id: session.id,
          started_at: session.started_at,
          plan_day_id: session.plan_day_id,
          weight_kg: set.weight_kg,
          reps: set.reps,
          duration_seconds: set.duration_seconds,
          distance_m: set.distance_m,
          is_warmup: set.is_warmup,
          completed_at: set.completed_at,
        });
      }
    }
  }
  return entries.sort((a, b) => b.completed_at.localeCompare(a.completed_at));
}

export async function fetchCompletedEntries() {
  return completedEntries(await load());
}

export async function saveSessionTree(session: SessionTree) {
  const db = await load();
  putSession(db, { ...session, updated_at: now() });
  write(db);
}

export async function saveSessionFields(session: SessionTree) {
  await saveSessionTree(session);
}

export async function saveBlock(session: SessionTree, block: SessionExercise, _mode: "insert" | "update" = "update") {
  const exercises = session.exercises.some((item) => item.id === block.id)
    ? session.exercises.map((item) => (item.id === block.id ? block : item))
    : [...session.exercises, block];
  const next = { ...session, exercises, updated_at: now() };
  await saveSessionTree(next);
  return next;
}

export async function saveSet(session: SessionTree, set: WorkoutSet, _mode: "insert" | "update") {
  const exercises = session.exercises.map((block) =>
    block.id === set.session_exercise_id
      ? {
          ...block,
          sets: (block.sets.some((item) => item.id === set.id)
            ? block.sets.map((item) => (item.id === set.id ? set : item))
            : [...block.sets, set]
          ).sort((a, b) => a.set_index - b.set_index),
        }
      : block,
  );
  const next = { ...session, exercises, updated_at: now() };
  await saveSessionTree(next);
  return next;
}

export async function removeSet(session: SessionTree, set: WorkoutSet) {
  const exercises = session.exercises.map((block) =>
    block.id === set.session_exercise_id ? { ...block, sets: block.sets.filter((item) => item.id !== set.id) } : block,
  );
  const next = { ...session, exercises, updated_at: now() };
  await saveSessionTree(next);
  return next;
}

export async function finishSession(session: SessionTree) {
  const next: SessionTree = { ...session, status: "completed", ended_at: now(), pause_started_at: null, updated_at: now() };
  if (session.status === "paused" && session.pause_started_at) {
    next.paused_ms += Math.max(0, Date.now() - new Date(session.pause_started_at).getTime());
  }
  await saveSessionTree(next);
  return next;
}

export async function discardSession(session: SessionTree) {
  const next: SessionTree = { ...session, status: "abandoned", ended_at: now(), updated_at: now() };
  await saveSessionTree(next);
  return next;
}

export async function fetchWeights() {
  const db = await load();
  return clone(db.weights).sort((a, b) => b.logged_at.localeCompare(a.logged_at));
}

export async function saveWeight(row: BodyWeightLog, _mode: "insert" | "update") {
  const db = await load();
  upsert(db.weights, { ...row, updated_at: now() });
  db.weights.sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  write(db);
}

export async function deleteWeight(row: BodyWeightLog) {
  const db = await load();
  drop(db.weights, row.id);
  write(db);
}

export async function fetchMeasurements() {
  const db = await load();
  return clone(db.measurements).sort((a, b) => b.measured_at.localeCompare(a.measured_at));
}

export async function saveMeasurement(row: BodyMeasurement, _mode: "insert" | "update") {
  const db = await load();
  upsert(db.measurements, { ...row, updated_at: now() });
  write(db);
}

export async function deleteMeasurement(row: BodyMeasurement) {
  const db = await load();
  drop(db.measurements, row.id);
  write(db);
}

export async function fetchCardio() {
  const db = await load();
  return clone(db.cardio).sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export async function saveCardio(row: CardioSession, _mode: "insert" | "update") {
  const db = await load();
  upsert(db.cardio, { ...row, updated_at: now() });
  write(db);
}

export async function deleteCardio(row: CardioSession) {
  const db = await load();
  drop(db.cardio, row.id);
  write(db);
}

export async function fetchGoals() {
  const db = await load();
  return clone(db.goals);
}

export async function saveGoal(row: Goal, _mode: "insert" | "update") {
  const db = await load();
  upsert(db.goals, { ...row, target_value: Number(row.target_value), updated_at: now() });
  write(db);
}

export async function deleteGoal(row: Goal) {
  const db = await load();
  drop(db.goals, row.id);
  write(db);
}

export async function fetchOverrides() {
  const db = await load();
  return clone(db.overrides);
}

export async function movePlanDay(planDayId: string, fromDate: string, toDate: string) {
  const db = await load();
  const existing = db.overrides.find((row) => row.plan_day_id === planDayId && row.from_date === fromDate);
  if (existing) {
    existing.to_date = toDate;
    existing.updated_at = now();
  } else {
    const id = newId();
    db.overrides.unshift({
      id,
      user_id: db.profile.id,
      client_id: id,
      plan_day_id: planDayId,
      from_date: fromDate,
      to_date: toDate,
      created_at: now(),
      updated_at: now(),
    });
  }
  write(db);
}

export async function fetchPhotos() {
  const db = await load();
  return clone(db.photos).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
}

export async function savePhoto(input: { blob: Blob; angle: PhotoAngle; takenAt: string; notes: string }) {
  const db = await load();
  const id = newId();
  const path = `${db.profile.id}/${id}.webp`;
  const database = await photoStore();
  await database.put("blobs", input.blob, path);
  const row: ProgressPhoto = {
    id,
    user_id: db.profile.id,
    client_id: id,
    taken_at: input.takenAt,
    angle: input.angle,
    storage_path: path,
    notes: input.notes,
    created_at: now(),
    updated_at: now(),
  };
  db.photos.unshift(row);
  write(db);
  return row;
}

export async function deletePhoto(row: ProgressPhoto) {
  const db = await load();
  const database = await photoStore();
  await database.delete("blobs", row.storage_path);
  drop(db.photos, row.id);
  photoUrls.delete(row.storage_path);
  write(db);
}

const photoUrls = new Map<string, string>();

export async function signedPhotoUrl(path: string) {
  const cached = photoUrls.get(path);
  if (cached) return cached;
  const database = await photoStore();
  const blob = await database.get("blobs", path);
  if (!(blob instanceof Blob)) throw new Error("No se pudo abrir la foto en este teléfono.");
  const url = URL.createObjectURL(blob);
  photoUrls.set(path, url);
  return url;
}

export async function fetchSessions() {
  const db = await load();
  return clone(db.sessions)
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function activePlan(plans: PlanTree[], profile: Profile | null) {
  return plans.find((plan) => plan.id === profile?.active_plan_id) ?? plans.find((plan) => plan.is_active) ?? null;
}

export function todayIso() {
  return santiagoDate();
}
