import { buildRoutine } from "@/data/routine";
import { santiagoDate } from "./format";
import { newId } from "./utils";
import { requireClient } from "./supabase";
import {
  dropUnsyncedInsert,
  enqueueRpc,
  kvGet,
  kvSet,
  putBlob,
  readAck,
  rememberAck,
  saveRow,
  type SyncTable,
} from "./sync";
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

type Row = Record<string, unknown>;

function num(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function one<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function userId() {
  const { data, error } = await requireClient().auth.getSession();
  if (error || !data.session) throw new Error("Sesión expirada.");
  return data.session.user.id;
}

async function readOrCache<T>(key: string, load: () => Promise<T>) {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = await kvGet<T>(key);
      if (cached !== undefined) return cached;
      throw new Error("offline");
    }
    const data = await load();
    await kvSet(key, data);
    return data;
  } catch (error) {
    const cached = await kvGet<T>(key);
    if (cached !== undefined) return cached;
    throw error;
  }
}

async function stamp(table: SyncTable, rows: Array<{ id: string; updated_at: string }>) {
  await Promise.all(rows.map((row) => rememberAck(table, row.id, row.updated_at)));
}

export async function persist(table: SyncTable, row: Row, mode: "insert" | "update" | "delete") {
  const id = String(row.id);
  const payload = { ...row };
  delete payload.updated_at;
  delete payload.created_at;
  delete payload.exercises;
  delete payload.exercise;
  delete payload.sets;
  delete payload.days;
  const ack = await readAck(table, id);
  const fromRow = typeof row.updated_at === "string" && row.updated_at ? row.updated_at : null;
  await saveRow({
    table,
    id,
    payload,
    mode,
    expectedUpdatedAt: mode === "update" ? ack ?? fromRow : null,
  });
}

function mapExercise(row: Row): Exercise {
  return {
    ...(row as unknown as Exercise),
    client_id: String(row.client_id ?? row.id ?? ""),
    secondary_muscles: Array.isArray(row.secondary_muscles) ? (row.secondary_muscles as string[]) : [],
    alternative_slugs: Array.isArray(row.alternative_slugs) ? (row.alternative_slugs as string[]) : [],
  };
}

function mapSet(row: Row): WorkoutSet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    session_exercise_id: String(row.session_exercise_id),
    client_id: String(row.client_id ?? row.id),
    set_index: Number(row.set_index),
    weight_kg: num(row.weight_kg),
    reps: num(row.reps),
    duration_seconds: num(row.duration_seconds),
    distance_m: num(row.distance_m),
    rpe: num(row.rpe),
    is_warmup: Boolean(row.is_warmup),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function mapSession(row: Row): SessionTree {
  const exercises = ((row.exercises as Row[] | undefined) ?? []).map((block) => {
    const exercise = mapExercise((one(block.exercise as Row | Row[]) ?? {}) as Row);
    const sets = ((block.sets as Row[] | undefined) ?? []).map(mapSet).sort((a, b) => a.set_index - b.set_index);
    return {
      id: String(block.id),
      user_id: String(block.user_id),
      session_id: String(block.session_id),
      exercise_id: String(block.exercise_id),
      client_id: String(block.client_id ?? block.id),
      sort_order: Number(block.sort_order ?? 0),
      notes: String(block.notes ?? ""),
      substituted_from_exercise_id: block.substituted_from_exercise_id ? String(block.substituted_from_exercise_id) : null,
      replaced: Boolean(block.replaced),
      created_at: String(block.created_at ?? ""),
      updated_at: String(block.updated_at ?? ""),
      exercise,
      sets,
    };
  });
  exercises.sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    client_id: String(row.client_id ?? row.id),
    plan_id: row.plan_id ? String(row.plan_id) : null,
    plan_day_id: row.plan_day_id ? String(row.plan_day_id) : null,
    title: String(row.title ?? ""),
    status: row.status as SessionTree["status"],
    started_at: String(row.started_at),
    ended_at: row.ended_at ? String(row.ended_at) : null,
    paused_ms: Number(row.paused_ms ?? 0),
    pause_started_at: row.pause_started_at ? String(row.pause_started_at) : null,
    notes: String(row.notes ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    exercises,
  };
}

function mapPlan(row: Row): PlanTree {
  const days = ((row.days as Row[] | undefined) ?? []).map((day) => {
    const exercises = ((day.exercises as Row[] | undefined) ?? []).map((item) => {
      const exercise = mapExercise((one(item.exercise as Row | Row[]) ?? {}) as Row);
      return {
        id: String(item.id),
        user_id: String(item.user_id),
        plan_day_id: String(item.plan_day_id),
        exercise_id: String(item.exercise_id),
        client_id: String(item.client_id ?? item.id),
        sort_order: Number(item.sort_order ?? 0),
        notes: String(item.notes ?? ""),
        created_at: String(item.created_at ?? ""),
        updated_at: String(item.updated_at ?? ""),
        exercise,
        target_sets: Number(item.target_sets),
        target_reps_min: num(item.target_reps_min),
        target_reps_max: num(item.target_reps_max),
        target_seconds: num(item.target_seconds),
        rest_seconds: Number(item.rest_seconds ?? 90),
      };
    });
    exercises.sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: String(day.id),
      user_id: String(day.user_id),
      plan_id: String(day.plan_id),
      client_id: String(day.client_id ?? day.id),
      weekday: Number(day.weekday),
      label: String(day.label),
      day_kind: day.day_kind as PlanDay["day_kind"],
      sort_order: Number(day.sort_order ?? 0),
      created_at: String(day.created_at ?? ""),
      updated_at: String(day.updated_at ?? ""),
      exercises,
    };
  });
  days.sort((a, b) => a.weekday - b.weekday || a.sort_order - b.sort_order);
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    client_id: String(row.client_id ?? row.id),
    name: String(row.name),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    days,
  };
}

const PLAN_SELECT = `
  *,
  days:workout_plan_days(
    *,
    exercises:workout_plan_exercises(
      *,
      exercise:exercises(*)
    )
  )
`;

const SESSION_SELECT = `
  *,
  exercises:workout_session_exercises(
    *,
    exercise:exercises!workout_session_exercises_exercise_id_fkey(*),
    sets:workout_sets(*)
  )
`;

export async function fetchProfile() {
  return readOrCache("profile", async () => {
    const id = await userId();
    const { data, error } = await requireClient().from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("No encontramos tu perfil.");
    await stamp("profiles", [data as { id: string; updated_at: string }]);
    return {
      ...(data as Profile),
      height_cm: num((data as Row).height_cm),
      preferred_rest_seconds: Number((data as Row).preferred_rest_seconds ?? 90),
    };
  });
}

export async function saveProfile(profile: Profile, patch: Partial<Profile>) {
  const next = { ...profile, ...patch };
  await persist("profiles", next, "update");
  await kvSet("profile", next);
  return next;
}

export async function fetchExercises() {
  return readOrCache("exercises", async () => {
    const id = await userId();
    const { data, error } = await requireClient()
      .from("exercises")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${id}`)
      .order("name");
    if (error) throw error;
    const rows = ((data ?? []) as Row[]).map(mapExercise);
    await stamp("exercises", rows.filter((row) => row.user_id === id));
    return rows;
  });
}

export async function createExercise(input: Omit<Exercise, "id" | "user_id" | "client_id" | "created_at" | "updated_at" | "slug"> & { slug?: string | null }) {
  const id = await userId();
  const exerciseId = newId();
  const row: Exercise = {
    ...input,
    id: exerciseId,
    client_id: exerciseId,
    user_id: id,
    slug: input.slug ?? null,
    machine_name: input.machine_name?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: "",
  };
  await persist("exercises", row, "insert");
  const current = (await kvGet<Exercise[]>("exercises")) ?? [];
  await kvSet("exercises", [...current, row]);
  return row;
}

export async function fetchPlans() {
  return readOrCache("plans", async () => {
    const id = await userId();
    const { data, error } = await requireClient().from("workout_plans").select(PLAN_SELECT).eq("user_id", id);
    if (error) throw error;
    const plans = ((data ?? []) as Row[]).map(mapPlan);
    await stampPlans(plans);
    return plans;
  });
}

async function stampPlans(plans: PlanTree[]) {
  await stamp("workout_plans", plans);
  await stamp("workout_plan_days", plans.flatMap((plan) => plan.days));
  await stamp("workout_plan_exercises", plans.flatMap((plan) => plan.days.flatMap((day) => day.exercises)));
}

export async function fetchPlan(id: string) {
  const plans = await fetchPlans();
  const plan = plans.find((item) => item.id === id);
  if (!plan) throw new Error("No encontramos esa rutina.");
  return plan;
}

async function cachePlans(plans: PlanTree[]) {
  await kvSet("plans", plans);
}

export async function createRoutine(strengthWeekdays: number[], name = "Mi rutina") {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Necesitas conexión para crear la rutina inicial.");
  }
  const id = await userId();
  const catalog = await fetchExercises();
  const bySlug = new Map(catalog.filter((item) => item.slug).map((item) => [item.slug as string, item]));
  const planId = newId();
  const plan: PlanTree = {
    id: planId,
    user_id: id,
    client_id: planId,
    name,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: "",
    days: [],
  };
  await persist("workout_plans", plan, "insert");
  let order = 0;
  for (const template of buildRoutine(strengthWeekdays)) {
    const dayId = newId();
    const day: PlanDay = {
      id: dayId,
      user_id: id,
      plan_id: planId,
      client_id: dayId,
      weekday: template.weekday,
      label: template.label,
      day_kind: template.dayKind,
      sort_order: order,
      created_at: new Date().toISOString(),
      updated_at: "",
      exercises: [],
    };
    order += 1;
    await persist("workout_plan_days", day, "insert");
    let exerciseOrder = 0;
    for (const item of template.exercises) {
      const exercise = bySlug.get(item.slug);
      if (!exercise) throw new Error("Falta la biblioteca de ejercicios. Aplica la migración SQL.");
      const planExerciseId = newId();
      const planExercise: PlanExercise = {
        id: planExerciseId,
        user_id: id,
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
        created_at: new Date().toISOString(),
        updated_at: "",
        exercise,
      };
      exerciseOrder += 1;
      await persist("workout_plan_exercises", planExercise, "insert");
      day.exercises.push(planExercise);
    }
    plan.days.push(day);
  }
  await cachePlans([plan, ...((await kvGet<PlanTree[]>("plans")) ?? []).filter((item) => item.id !== plan.id)]);
  await activatePlan(planId);
  plan.is_active = true;
  await cachePlans((await fetchPlans()).map((item) => ({ ...item, is_active: item.id === planId })));
  return planId;
}

export async function createBlankPlan(name: string) {
  const id = await userId();
  const planId = newId();
  const plan: PlanTree = {
    id: planId,
    user_id: id,
    client_id: planId,
    name: name.trim(),
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: "",
    days: [1, 2, 3, 4, 5, 6, 7].map((weekday, index) => {
      const dayId = newId();
      const day: PlanDay = {
        id: dayId,
        user_id: id,
        plan_id: planId,
        client_id: dayId,
        weekday,
        label: weekday === 1 ? "Día 1" : "Libre",
        day_kind: weekday === 1 ? "strength" : "free",
        sort_order: index,
        created_at: new Date().toISOString(),
        updated_at: "",
        exercises: [],
      };
      return day;
    }),
  };
  await persist("workout_plans", plan, "insert");
  for (const day of plan.days) await persist("workout_plan_days", day, "insert");
  const plans = (await kvGet<PlanTree[]>("plans")) ?? [];
  await cachePlans([plan, ...plans]);
  return plan;
}

export async function activatePlan(planId: string) {
  await enqueueRpc("activate_plan", { p_plan_id: planId });
  const plans = ((await kvGet<PlanTree[]>("plans")) ?? []).map((plan) => ({ ...plan, is_active: plan.id === planId }));
  await cachePlans(plans);
  const profile = await kvGet<Profile>("profile");
  if (profile) await kvSet("profile", { ...profile, active_plan_id: planId });
}

export async function swapPlanDays(plan: PlanTree, dayA: string, dayB: string) {
  await enqueueRpc("swap_plan_days", { p_day_a: dayA, p_day_b: dayB });
  const first = plan.days.find((day) => day.id === dayA);
  const second = plan.days.find((day) => day.id === dayB);
  if (!first || !second) return plan;
  const days = plan.days.map((day) => {
    if (day.id === dayA) return { ...day, weekday: second.weekday };
    if (day.id === dayB) return { ...day, weekday: first.weekday };
    return day;
  });
  const next = { ...plan, days: days.sort((a, b) => a.weekday - b.weekday) };
  await replacePlan(next);
  return next;
}

export async function savePlanMeta(plan: PlanTree, patch: Partial<Pick<PlanTree, "name">>) {
  const next = { ...plan, ...patch };
  await persist("workout_plans", next, "update");
  await replacePlan(next);
}

export async function savePlanDay(plan: PlanTree, day: PlanDay) {
  await persist("workout_plan_days", day, "update");
  await replacePlan({ ...plan, days: plan.days.map((item) => (item.id === day.id ? day : item)) });
}

export async function savePlanExercise(plan: PlanTree, dayId: string, exercise: PlanExercise, mode: "insert" | "update") {
  await persist("workout_plan_exercises", exercise, mode);
  const days = plan.days.map((day) => {
    if (day.id !== dayId) return day;
    const exists = day.exercises.some((item) => item.id === exercise.id);
    const exercises = exists
      ? day.exercises.map((item) => (item.id === exercise.id ? exercise : item))
      : [...day.exercises, exercise].sort((a, b) => a.sort_order - b.sort_order);
    return { ...day, exercises };
  });
  await replacePlan({ ...plan, days });
}

export async function removePlanExercise(plan: PlanTree, dayId: string, exercise: PlanExercise) {
  if (!(await dropUnsyncedInsert("workout_plan_exercises", exercise.id))) {
    await persist("workout_plan_exercises", exercise, "delete");
  }
  const days = plan.days.map((day) =>
    day.id === dayId ? { ...day, exercises: day.exercises.filter((item) => item.id !== exercise.id) } : day,
  );
  await replacePlan({ ...plan, days });
}

async function replacePlan(plan: PlanTree) {
  const plans = (await kvGet<PlanTree[]>("plans")) ?? [];
  await cachePlans(plans.map((item) => (item.id === plan.id ? plan : item)));
}

export async function fetchOpenSession() {
  return readOrCache<SessionTree | null>("open-session", async () => {
    const id = await userId();
    const { data, error } = await requireClient()
      .from("workout_sessions")
      .select("id")
      .eq("user_id", id)
      .in("status", ["active", "paused"])
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return fetchSession(String((data as Row).id));
  });
}

export async function fetchSession(id: string) {
  return readOrCache(`session:${id}`, async () => {
    const { data, error } = await requireClient().from("workout_sessions").select(SESSION_SELECT).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("No encontramos esa sesión.");
    const session = mapSession(data as Row);
    await stamp("workout_sessions", [session]);
    await stamp("workout_session_exercises", session.exercises);
    await stamp("workout_sets", session.exercises.flatMap((block) => block.sets));
    return session;
  });
}

async function cacheSession(session: SessionTree) {
  await kvSet(`session:${session.id}`, session);
  if (session.status === "active" || session.status === "paused") await kvSet("open-session", session);
  else {
    const open = await kvGet<SessionTree | null>("open-session");
    if (open?.id === session.id) await kvSet("open-session", null);
  }
}

export async function startSession(plan: PlanTree | null, day: PlanDay | null) {
  const open = await fetchOpenSession();
  if (open && (open.status === "active" || open.status === "paused")) return open;
  const id = await userId();
  const sessionId = newId();
  const exerciseIds = day?.exercises.map((item) => item.exercise_id) ?? [];
  const suggestions = await suggestionMap(exerciseIds);
  const session: SessionTree = {
    id: sessionId,
    user_id: id,
    client_id: sessionId,
    plan_id: plan?.id ?? null,
    plan_day_id: day?.id ?? null,
    title: day?.label ?? "Entrenamiento libre",
    status: "active",
    started_at: new Date().toISOString(),
    ended_at: null,
    paused_ms: 0,
    pause_started_at: null,
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: "",
    exercises: [],
  };
  await persist("workout_sessions", session, "insert");
  let order = 0;
  for (const planned of day?.exercises ?? []) {
    const block = buildBlock(id, sessionId, planned.exercise, order, planned, suggestions.get(planned.exercise_id) ?? null);
    order += 1;
    await persist("workout_session_exercises", block, "insert");
    for (const set of block.sets) await persist("workout_sets", set, "insert");
    session.exercises.push(block);
  }
  await cacheSession(session);
  return session;
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
      duration_seconds: exercise.tracking_type === "time" ? suggestion?.duration_seconds ?? planned?.target_seconds ?? null : null,
      distance_m: exercise.tracking_type === "distance" ? suggestion?.distance_m ?? null : null,
      rpe: null,
      is_warmup: false,
      completed_at: null,
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: "",
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
    created_at: new Date().toISOString(),
    updated_at: "",
    exercise,
    sets,
  };
}

async function suggestionMap(exerciseIds: string[]) {
  const entries = await fetchCompletedEntries();
  const map = new Map<string, { weight_kg: number | null; reps: number | null; duration_seconds: number | null; distance_m: number | null }>();
  for (const entry of entries) {
    if (!exerciseIds.includes(entry.exercise_id) || entry.is_warmup || map.has(entry.exercise_id)) continue;
    map.set(entry.exercise_id, entry);
  }
  return map;
}

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

export async function fetchCompletedEntries() {
  return readOrCache("completed-entries", async () => {
    const id = await userId();
    const { data, error } = await requireClient()
      .from("completed_set_entries")
      .select("*")
      .eq("user_id", id)
      .order("completed_at", { ascending: false })
      .limit(3000);
    if (error) throw error;
    return ((data ?? []) as Row[]).map((row) => ({
      id: String(row.id),
      exercise_id: String(row.exercise_id),
      exercise_name: String(row.exercise_name),
      muscle_group: String(row.muscle_group),
      session_id: String(row.session_id),
      started_at: String(row.started_at),
      plan_day_id: row.plan_day_id ? String(row.plan_day_id) : null,
      weight_kg: num(row.weight_kg),
      reps: num(row.reps),
      duration_seconds: num(row.duration_seconds),
      distance_m: num(row.distance_m),
      is_warmup: Boolean(row.is_warmup),
      completed_at: String(row.completed_at),
    }));
  });
}

export async function saveSessionTree(session: SessionTree) {
  await cacheSession(session);
}

export async function saveSessionFields(session: SessionTree) {
  await persist("workout_sessions", session, "update");
  await cacheSession(session);
}

export async function saveBlock(session: SessionTree, block: SessionExercise, mode: "insert" | "update" = "update") {
  await persist("workout_session_exercises", block, mode);
  const exercises = session.exercises.some((item) => item.id === block.id)
    ? session.exercises.map((item) => (item.id === block.id ? block : item))
    : [...session.exercises, block];
  const next = { ...session, exercises };
  await cacheSession(next);
  return next;
}

export async function saveSet(session: SessionTree, set: WorkoutSet, mode: "insert" | "update") {
  await persist("workout_sets", set, mode);
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
  const next = { ...session, exercises };
  await cacheSession(next);
  return next;
}

export async function removeSet(session: SessionTree, set: WorkoutSet) {
  if (!(await dropUnsyncedInsert("workout_sets", set.id))) await persist("workout_sets", set, "delete");
  const exercises = session.exercises.map((block) =>
    block.id === set.session_exercise_id ? { ...block, sets: block.sets.filter((item) => item.id !== set.id) } : block,
  );
  const next = { ...session, exercises };
  await cacheSession(next);
  return next;
}

export async function finishSession(session: SessionTree) {
  const next: SessionTree = { ...session, status: "completed", ended_at: new Date().toISOString(), pause_started_at: null };
  if (session.status === "paused" && session.pause_started_at) {
    next.paused_ms += Math.max(0, Date.now() - new Date(session.pause_started_at).getTime());
  }
  await persist("workout_sessions", next, "update");
  await cacheSession(next);
  const entries = (await kvGet<CompletedEntry[]>("completed-entries")) ?? [];
  const extra: CompletedEntry[] = [];
  for (const block of next.exercises) {
    for (const set of block.sets) {
      if (!set.completed_at || set.is_warmup) continue;
      extra.push({
        id: set.id,
        exercise_id: block.exercise_id,
        exercise_name: block.exercise.name,
        muscle_group: block.exercise.muscle_group,
        session_id: next.id,
        started_at: next.started_at,
        plan_day_id: next.plan_day_id,
        weight_kg: set.weight_kg,
        reps: set.reps,
        duration_seconds: set.duration_seconds,
        distance_m: set.distance_m,
        is_warmup: false,
        completed_at: set.completed_at,
      });
    }
  }
  const ids = new Set(extra.map((item) => item.id));
  await kvSet("completed-entries", [...extra, ...entries.filter((item) => !ids.has(item.id))]);
  return next;
}

export async function discardSession(session: SessionTree) {
  const next: SessionTree = { ...session, status: "abandoned", ended_at: new Date().toISOString() };
  await persist("workout_sessions", next, "update");
  await cacheSession(next);
  return next;
}

export function listTable<T>(table: SyncTable, key: string, column: string) {
  return readOrCache(key, async () => {
    const id = await userId();
    const { data, error } = await requireClient().from(table).select("*").eq("user_id", id).order(column, { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Array<T & { id: string; updated_at: string }>;
    await stamp(table, rows);
    return rows as T[];
  });
}

export function fetchWeights() {
  return listTable<BodyWeightLog>("body_weight_logs", "weights", "logged_at").then((rows) =>
    rows.map((row) => ({ ...row, weight_kg: Number(row.weight_kg) })),
  );
}

export async function saveWeight(row: BodyWeightLog, mode: "insert" | "update") {
  await persist("body_weight_logs", row, mode);
  const rows = (await kvGet<BodyWeightLog[]>("weights")) ?? [];
  const next = mode === "insert" ? [row, ...rows] : rows.map((item) => (item.id === row.id ? row : item));
  await kvSet("weights", next.sort((a, b) => b.logged_at.localeCompare(a.logged_at)));
}

export async function deleteWeight(row: BodyWeightLog) {
  if (!(await dropUnsyncedInsert("body_weight_logs", row.id))) await persist("body_weight_logs", row, "delete");
  const rows = (await kvGet<BodyWeightLog[]>("weights")) ?? [];
  await kvSet("weights", rows.filter((item) => item.id !== row.id));
}

export function fetchMeasurements() {
  return listTable<BodyMeasurement>("body_measurements", "measurements", "measured_at");
}

export async function saveMeasurement(row: BodyMeasurement, mode: "insert" | "update") {
  await persist("body_measurements", row, mode);
  const rows = (await kvGet<BodyMeasurement[]>("measurements")) ?? [];
  const next = mode === "insert" ? [row, ...rows] : rows.map((item) => (item.id === row.id ? row : item));
  await kvSet("measurements", next);
}

export async function deleteMeasurement(row: BodyMeasurement) {
  if (!(await dropUnsyncedInsert("body_measurements", row.id))) await persist("body_measurements", row, "delete");
  const rows = (await kvGet<BodyMeasurement[]>("measurements")) ?? [];
  await kvSet("measurements", rows.filter((item) => item.id !== row.id));
}

export function fetchCardio() {
  return listTable<CardioSession>("cardio_sessions", "cardio", "started_at");
}

export async function saveCardio(row: CardioSession, mode: "insert" | "update") {
  await persist("cardio_sessions", row, mode);
  const rows = (await kvGet<CardioSession[]>("cardio")) ?? [];
  const next = mode === "insert" ? [row, ...rows] : rows.map((item) => (item.id === row.id ? row : item));
  await kvSet("cardio", next);
}

export async function deleteCardio(row: CardioSession) {
  if (!(await dropUnsyncedInsert("cardio_sessions", row.id))) await persist("cardio_sessions", row, "delete");
  const rows = (await kvGet<CardioSession[]>("cardio")) ?? [];
  await kvSet("cardio", rows.filter((item) => item.id !== row.id));
}

export function fetchGoals() {
  return listTable<Goal>("goals", "goals", "created_at");
}

export async function saveGoal(row: Goal, mode: "insert" | "update") {
  await persist("goals", row, mode);
  const rows = (await kvGet<Goal[]>("goals")) ?? [];
  const next = mode === "insert" ? [row, ...rows] : rows.map((item) => (item.id === row.id ? row : item));
  await kvSet("goals", next.map((item) => ({ ...item, target_value: Number(item.target_value) })));
}

export async function deleteGoal(row: Goal) {
  if (!(await dropUnsyncedInsert("goals", row.id))) await persist("goals", row, "delete");
  const rows = (await kvGet<Goal[]>("goals")) ?? [];
  await kvSet("goals", rows.filter((item) => item.id !== row.id));
}

export function fetchOverrides() {
  return listTable<ScheduleOverride>("schedule_overrides", "overrides", "from_date");
}

export async function movePlanDay(planDayId: string, fromDate: string, toDate: string) {
  const id = await userId();
  const rows = (await kvGet<ScheduleOverride[]>("overrides")) ?? [];
  const existing = rows.find((row) => row.plan_day_id === planDayId && row.from_date === fromDate);
  if (existing) {
    const next = { ...existing, to_date: toDate };
    await persist("schedule_overrides", next, "update");
    await kvSet("overrides", rows.map((row) => (row.id === existing.id ? next : row)));
    return;
  }
  const created: ScheduleOverride = {
    id: newId(),
    user_id: id,
    client_id: "",
    plan_day_id: planDayId,
    from_date: fromDate,
    to_date: toDate,
    created_at: new Date().toISOString(),
    updated_at: "",
  };
  created.client_id = created.id;
  await persist("schedule_overrides", created, "insert");
  await kvSet("overrides", [created, ...rows]);
}

export function fetchPhotos() {
  return listTable<ProgressPhoto>("progress_photos", "photos", "taken_at");
}

export async function savePhoto(input: { blob: Blob; angle: PhotoAngle; takenAt: string; notes: string }) {
  const id = await userId();
  const photoId = newId();
  const path = `${id}/${photoId}.webp`;
  await putBlob(photoId, input.blob, path);
  const row: ProgressPhoto = {
    id: photoId,
    user_id: id,
    client_id: photoId,
    taken_at: input.takenAt,
    angle: input.angle,
    storage_path: path,
    notes: input.notes,
    created_at: new Date().toISOString(),
    updated_at: "",
  };
  await persist("progress_photos", row, "insert");
  const rows = (await kvGet<ProgressPhoto[]>("photos")) ?? [];
  await kvSet("photos", [row, ...rows]);
  return row;
}

export async function deletePhoto(row: ProgressPhoto) {
  if (typeof navigator === "undefined" || navigator.onLine) {
    await requireClient().storage.from("progress-photos").remove([row.storage_path]);
  }
  if (!(await dropUnsyncedInsert("progress_photos", row.id))) await persist("progress_photos", row, "delete");
  const rows = (await kvGet<ProgressPhoto[]>("photos")) ?? [];
  await kvSet("photos", rows.filter((item) => item.id !== row.id));
}

const photoUrls = new Map<string, { url: string; expires: number }>();

export async function signedPhotoUrl(path: string) {
  const cached = photoUrls.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await requireClient().storage.from("progress-photos").createSignedUrl(path, 600);
  if (error || !data?.signedUrl) throw error ?? new Error("No se pudo abrir la foto.");
  photoUrls.set(path, { url: data.signedUrl, expires: Date.now() + 8 * 60 * 1000 });
  return data.signedUrl;
}

export async function fetchSessions() {
  return readOrCache("sessions", async () => {
    const id = await userId();
    const { data, error } = await requireClient()
      .from("workout_sessions")
      .select(SESSION_SELECT)
      .eq("user_id", id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return ((data ?? []) as Row[]).map(mapSession);
  });
}

export function activePlan(plans: PlanTree[], profile: Profile | null) {
  return plans.find((plan) => plan.id === profile?.active_plan_id) ?? plans.find((plan) => plan.is_active) ?? null;
}

export function todayIso() {
  return santiagoDate();
}
