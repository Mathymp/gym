import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ScreenSkeleton } from "@/components/shell";
import { Button, EmptyState, InlineError, Kicker, Page, TextField } from "@/components/ui";
import {
  deleteGoal,
  fetchCardio,
  fetchGoals,
  fetchMeasurements,
  fetchPhotos,
  fetchPlans,
  fetchProfile,
  fetchSessions,
  fetchWeights,
  saveGoal,
  saveProfile,
  type CompletedEntry,
} from "@/lib/api";
import { downloadText, toCsv } from "@/lib/download";
import { humanError } from "@/lib/errors";
import {
  addIsoDays,
  formatCm,
  formatKg,
  santiagoDate,
  startOfIsoWeek,
} from "@/lib/format";
import {
  buildMilestones,
  consecutiveGoalWeeks,
  countInWeek,
  goalProgress,
  weightGoalRatio,
} from "@/lib/metrics";
import { requireClient } from "@/lib/supabase";
import { newId } from "@/lib/utils";
import {
  MEASUREMENT_FIELDS,
  type Goal,
  type GoalType,
  type MeasurementKey,
  type BodyMeasurement,
  type Profile,
} from "@/lib/types";
import { useAuth } from "@/features/auth-context";
import {
  useEntries,
  useExercises,
  useGoals,
  useHistory,
  useCardio,
  useMeasurements,
  usePlans,
  useProfile,
  useWeights,
} from "@/features/use-data";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

export function ProfileScreen() {
  const { user } = useAuth();
  const profile = useProfile();
  const plans = usePlans();
  const goals = useGoals();
  const weights = useWeights();
  const measurements = useMeasurements();
  const history = useHistory();
  const cardio = useCardio();
  const entries = useEntries();
  const exercises = useExercises();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [restSeconds, setRestSeconds] = useState<60 | 90 | 120>(90);
  const [restTimer, setRestTimer] = useState(true);
  const [sound, setSound] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("weekly_workouts");
  const [goalLabel, setGoalLabel] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalExerciseId, setGoalExerciseId] = useState("");
  const [goalMeasureKey, setGoalMeasureKey] = useState<MeasurementKey>("waist");

  const isIos = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.display_name);
    setHeight(profile.data.height_cm != null ? String(profile.data.height_cm) : "");
    setRestSeconds(profile.data.preferred_rest_seconds as 60 | 90 | 120);
    setRestTimer(profile.data.rest_timer_enabled);
    setSound(profile.data.sound_enabled);
  }, [profile.data]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const loading =
    profile.isLoading ||
    plans.isLoading ||
    goals.isLoading ||
    weights.isLoading ||
    measurements.isLoading ||
    history.isLoading ||
    entries.isLoading;
  if (loading) return <ScreenSkeleton />;
  const error = profile.error ?? goals.error ?? weights.error ?? history.error;
  if (error || !profile.data) {
    return (
      <Page>
        <InlineError message={humanError(error ?? new Error("Sin perfil"))} onRetry={() => void profile.refetch()} />
      </Page>
    );
  }

  const today = santiagoDate();
  const sortedWeights = [...(weights.data ?? [])].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const firstWeight = sortedWeights[0] ? Number(sortedWeights[0].weight_kg) : null;
  const latestWeight = sortedWeights.at(-1) ? Number(sortedWeights.at(-1)?.weight_kg) : null;
  const sessions = (history.data ?? []).filter((item) => item.status === "completed");
  const sessionDates = sessions.map((item) => santiagoDate(item.started_at));
  const cardioDates = (cardio.data ?? []).map((item) => santiagoDate(item.started_at));
  const weeklyTargetGoal = goals.data?.find((item) => item.goal_type === "weekly_workouts");
  const weeklyTarget = weeklyTargetGoal ? Number(weeklyTargetGoal.target_value) : 0;
  const weekCounts = buildWeekCounts(sessionDates, today, 52);
  const consistentWeeks = weeklyTarget > 0 ? consecutiveGoalWeeks([...weekCounts].reverse(), weeklyTarget) : 0;
  const hasImprovedRecord = detectImprovedRecord(entries.data ?? []);
  const weeksSinceStart = Math.floor((Date.now() - new Date(profile.data.created_at).getTime()) / (7 * 24 * 3600 * 1000));
  const milestones = buildMilestones({
    completedSessions: sessions.length,
    consistentWeeks,
    hasImprovedRecord,
    weeksSinceStart,
  });

  async function saveSettings() {
    const heightCm = height.trim() ? Number(height.replace(",", ".")) : null;
    if (heightCm != null && (heightCm < 100 || heightCm > 250)) {
      toast.error("La estatura debe estar entre 100 y 250 cm.");
      return;
    }
    if (name.trim().length < 1) {
      toast.error("Escribe tu nombre.");
      return;
    }
    setSavePending(true);
    try {
      await saveProfile(profile.data as Profile, {
        display_name: name.trim(),
        height_cm: heightCm,
        preferred_rest_seconds: restSeconds,
        rest_timer_enabled: restTimer,
        sound_enabled: sound,
      });
      toast.success("Perfil actualizado");
      await profile.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setSavePending(false);
    }
  }

  async function addGoalRow() {
    if (!user) return;
    const target = Number(goalTarget.replace(",", "."));
    if (!Number.isFinite(target) || target <= 0) {
      toast.error("Indica un valor meta válido.");
      return;
    }
    if (goalType === "strength" && !goalExerciseId) {
      toast.error("Elige un ejercicio para la meta de fuerza.");
      return;
    }
    const label =
      goalLabel.trim() ||
      (goalType === "body_weight"
        ? "Peso"
        : goalType === "weekly_workouts"
          ? "Entrenamientos por semana"
          : goalType === "activity_days"
            ? "Días activos"
            : goalType === "strength"
              ? exercises.data?.find((item) => item.id === goalExerciseId)?.name ?? "Fuerza"
              : MEASUREMENT_FIELDS.find((item) => item.key === goalMeasureKey)?.label ?? "Medida");
    setSavePending(true);
    try {
      const id = newId();
      const row: Goal = {
        id,
        user_id: user.id,
        client_id: id,
        goal_type: goalType,
        target_value: target,
        exercise_id: goalType === "strength" ? goalExerciseId : null,
        measurement_key: goalType === "measurement" ? goalMeasureKey : null,
        label,
        deadline: null,
        created_at: new Date().toISOString(),
        updated_at: "",
      };
      await saveGoal(row, "insert");
      setGoalOpen(false);
      setGoalTarget("");
      setGoalLabel("");
      toast.success("Meta agregada");
      await goals.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setSavePending(false);
    }
  }

  async function removeGoal(row: Goal) {
    if (!window.confirm(`Se eliminará la meta «${row.label}». Los registros anteriores no se borran.`)) return;
    try {
      await deleteGoal(row);
      toast.success("Meta eliminada");
      await goals.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function exportWorkoutsCsv() {
    setExportPending(true);
    try {
      const list = entries.data ?? [];
      const titles = new Map((history.data ?? []).map((session) => [session.id, session.title]));
      const rows = list.map((entry, index) => ({
        fecha: santiagoDate(entry.completed_at),
        rutina: titles.get(entry.session_id) ?? "",
        ejercicio: entry.exercise_name,
        serie: index + 1,
        peso_kg: entry.weight_kg ?? "",
        repeticiones: entry.reps ?? "",
        segundos: entry.duration_seconds ?? "",
        distancia_m: entry.distance_m ?? "",
        rpe: "",
        calentamiento: entry.is_warmup ? "sí" : "no",
        notas: "",
      }));
      downloadText("forma-entrenamientos.csv", toCsv(rows), "text/csv;charset=utf-8");
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setExportPending(false);
    }
  }

  async function exportWeightCsv() {
    setExportPending(true);
    try {
      const rows = (weights.data ?? []).map((row) => ({
        fecha: santiagoDate(row.logged_at),
        peso_kg: row.weight_kg,
        notas: row.notes,
      }));
      downloadText("forma-peso.csv", toCsv(rows), "text/csv;charset=utf-8");
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setExportPending(false);
    }
  }

  async function exportMeasuresCsv() {
    setExportPending(true);
    try {
      const rows = (measurements.data ?? []).map((row) => ({
        fecha: santiagoDate(row.measured_at),
        cintura_cm: row.waist_cm ?? "",
        abdomen_cm: row.abdomen_cm ?? "",
        pecho_cm: row.chest_cm ?? "",
        cadera_cm: row.hip_cm ?? "",
        brazo_cm: row.arm_cm ?? "",
        muslo_cm: row.thigh_cm ?? "",
        cuello_cm: row.neck_cm ?? "",
        notas: row.notes,
      }));
      downloadText("forma-medidas.csv", toCsv(rows), "text/csv;charset=utf-8");
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setExportPending(false);
    }
  }

  async function exportJson() {
    setExportPending(true);
    try {
      const [freshProfile, freshPlans, freshSessions, freshWeights, freshMeasures, freshCardio, freshGoals, freshPhotos] =
        await Promise.all([
          fetchProfile(),
          fetchPlans(),
          fetchSessions(),
          fetchWeights(),
          fetchMeasurements(),
          fetchCardio(),
          fetchGoals(),
          fetchPhotos(),
        ]);
      const payload = {
        profile: freshProfile,
        plans: freshPlans,
        sessions: freshSessions,
        weights: freshWeights,
        measurements: freshMeasures,
        cardio: freshCardio,
        goals: freshGoals,
        photos: freshPhotos.map((photo) => ({
          id: photo.id,
          taken_at: photo.taken_at,
          angle: photo.angle,
          storage_path: photo.storage_path,
          notes: photo.notes,
        })),
      };
      downloadText("forma-respaldo.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setExportPending(false);
    }
  }

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  }

  async function signOut() {
    try {
      await requireClient().auth.signOut();
      navigate("/ingresar");
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  return (
    <Page>
      <header>
        <Kicker>Perfil</Kicker>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{profile.data.display_name}</h1>
      </header>

      <section className="border-t border-line pt-5">
        <h2 className="text-lg font-semibold">Datos personales</h2>
        <div className="mt-4 flex flex-col gap-4">
          <TextField label="Nombre" name="name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            label="Estatura (cm)"
            name="height"
            inputMode="decimal"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="Opcional"
          />
          <div>
            <p className="mb-2 text-sm text-muted">Descanso entre series</p>
            <div className="flex gap-2">
              {[60, 90, 120].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  className={`min-h-11 flex-1 rounded-2xl border text-sm font-semibold ${restSeconds === seconds ? "border-lime text-lime" : "border-line text-muted"}`}
                  onClick={() => setRestSeconds(seconds as 60 | 90 | 120)}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>
          <ToggleRow label="Temporizador de descanso" enabled={restTimer} onChange={setRestTimer} />
          <ToggleRow label="Sonido en el entrenamiento" enabled={sound} onChange={setSound} />
          <Button type="button" size="lg" disabled={savePending} onClick={() => void saveSettings()}>
            {savePending ? "Guardando" : "Guardar cambios"}
          </Button>
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Metas</h2>
          <Button type="button" variant="ghost" size="md" onClick={() => setGoalOpen((value) => !value)}>
            {goalOpen ? "Cerrar" : "Agregar"}
          </Button>
        </div>
        {goalOpen ? (
          <div className="mt-4 flex flex-col gap-3 border-b border-line pb-4">
            <label className="text-sm text-muted">
              Tipo
              <select
                className="mt-2 h-14 w-full rounded-2xl border border-line bg-surface px-4"
                value={goalType}
                onChange={(event) => setGoalType(event.target.value as GoalType)}
              >
                <option value="body_weight">Peso corporal</option>
                <option value="weekly_workouts">Entrenamientos semanales</option>
                <option value="activity_days">Días activos</option>
                <option value="strength">Fuerza (ejercicio)</option>
                <option value="measurement">Medida corporal</option>
              </select>
            </label>
            <TextField label="Etiqueta (opcional)" name="goal-label" value={goalLabel} onChange={(event) => setGoalLabel(event.target.value)} />
            <TextField label="Valor meta" name="goal-target" inputMode="decimal" value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} />
            {goalType === "strength" ? (
              <label className="text-sm text-muted">
                Ejercicio
                <select
                  className="mt-2 h-14 w-full rounded-2xl border border-line bg-surface px-4"
                  value={goalExerciseId}
                  onChange={(event) => setGoalExerciseId(event.target.value)}
                >
                  <option value="">Elegir</option>
                  {(exercises.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {goalType === "measurement" ? (
              <label className="text-sm text-muted">
                Medida
                <select
                  className="mt-2 h-14 w-full rounded-2xl border border-line bg-surface px-4"
                  value={goalMeasureKey}
                  onChange={(event) => setGoalMeasureKey(event.target.value as MeasurementKey)}
                >
                  {MEASUREMENT_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button type="button" size="lg" disabled={savePending} onClick={() => void addGoalRow()}>
              Crear meta
            </Button>
          </div>
        ) : null}
        {(goals.data ?? []).length === 0 ? (
          <EmptyState title="Sin metas" body="Agrega metas de peso, entrenamientos o fuerza para ver tu avance." />
        ) : (
          <ul className="mt-4 space-y-4">
            {(goals.data ?? []).map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                firstWeight={firstWeight}
                latestWeight={latestWeight}
                sessionDates={sessionDates}
                cardioDates={cardioDates}
                today={today}
                entries={entries.data ?? []}
                measurements={measurements.data ?? []}
                onDelete={() => void removeGoal(goal)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-line pt-5">
        <h2 className="text-lg font-semibold">Hitos</h2>
        <ul className="mt-4 space-y-3">
          {milestones.map((item) => (
            <li key={item.key} className="flex items-start justify-between gap-3 border-b border-line pb-3">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted">{item.detail}</p>
              </div>
              <span className={`text-sm ${item.reached ? "text-lime" : "text-faint"}`}>{item.reached ? "Logrado" : "Pendiente"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line pt-5">
        <h2 className="text-lg font-semibold">Exportar datos</h2>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="surface" size="lg" disabled={exportPending} onClick={() => void exportWorkoutsCsv()}>
            CSV entrenamientos
          </Button>
          <Button type="button" variant="surface" size="lg" disabled={exportPending} onClick={() => void exportWeightCsv()}>
            CSV peso
          </Button>
          <Button type="button" variant="surface" size="lg" disabled={exportPending} onClick={() => void exportMeasuresCsv()}>
            CSV medidas
          </Button>
          <Button type="button" variant="surface" size="lg" disabled={exportPending} onClick={() => void exportJson()}>
            JSON respaldo
          </Button>
        </div>
      </section>

      <section className="border-t border-line pt-5">
        <h2 className="text-lg font-semibold">Instalar</h2>
        {installEvent ? (
          <Button type="button" className="mt-4 w-full" size="lg" onClick={() => void installApp()}>
            Instalar FORMA
          </Button>
        ) : isIos ? (
          <p className="mt-3 text-sm leading-6 text-muted">
            En iPhone: toca Compartir en Safari y elige Agregar a inicio para instalar FORMA.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Cuando el navegador lo permita, verás el botón de instalación aquí.</p>
        )}
      </section>

      <Button type="button" variant="danger" size="lg" className="w-full" onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </Page>
  );
}

function GoalRow({
  goal,
  firstWeight,
  latestWeight,
  sessionDates,
  cardioDates,
  today,
  entries,
  measurements,
  onDelete,
}: {
  goal: Goal;
  firstWeight: number | null;
  latestWeight: number | null;
  sessionDates: string[];
  cardioDates: string[];
  today: string;
  entries: CompletedEntry[];
  measurements: BodyMeasurement[];
  onDelete: () => void;
}) {
  const progress = goalBarProgress(goal, { firstWeight, latestWeight, sessionDates, cardioDates, today, entries, measurements });
  const label = progress.label;
  return (
    <li className="border-b border-line pb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{goal.label}</p>
          <p className="text-sm text-muted">{label}</p>
          <div className="mt-2 h-1.5 bg-surface" aria-hidden>
            <div className="h-full bg-lime" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
        </div>
        <Button type="button" variant="danger" size="md" className="shrink-0" onClick={onDelete}>
          Quitar
        </Button>
      </div>
    </li>
  );
}

function goalBarProgress(
  goal: Goal,
  ctx: {
    firstWeight: number | null;
    latestWeight: number | null;
    sessionDates: string[];
    cardioDates: string[];
    today: string;
    entries: CompletedEntry[];
    measurements: BodyMeasurement[];
  },
): { ratio: number; label: string } {
  const target = Number(goal.target_value);
  if (goal.goal_type === "body_weight") {
    if (ctx.firstWeight == null || ctx.latestWeight == null) return { ratio: 0, label: "Registra tu peso para ver avance." };
    const ratio = weightGoalRatio(ctx.firstWeight, ctx.latestWeight, target);
    const reached = ctx.firstWeight >= target ? ctx.latestWeight <= target : ctx.latestWeight >= target;
    return {
      ratio,
      label: reached ? `Meta ${formatKg(target)} alcanzada` : `${formatKg(ctx.latestWeight)} · meta ${formatKg(target)}`,
    };
  }
  if (goal.goal_type === "weekly_workouts") {
    const count = countInWeek(ctx.sessionDates, ctx.today);
    return { ratio: goalProgress(goal, count), label: `${count} de ${target} esta semana` };
  }
  if (goal.goal_type === "activity_days") {
    const weekStart = startOfIsoWeek(ctx.today);
    const weekEnd = addIsoDays(weekStart, 6);
    const days = new Set(
      [...ctx.sessionDates, ...ctx.cardioDates].filter((iso) => iso >= weekStart && iso <= weekEnd),
    );
    const count = days.size;
    return { ratio: goalProgress(goal, count), label: `${count} de ${target} días activos esta semana` };
  }
  if (goal.goal_type === "strength" && goal.exercise_id) {
    const best = bestExerciseWeight(ctx.entries, goal.exercise_id);
    return {
      ratio: best == null ? 0 : goalProgress(goal, best),
      label: best == null ? "Sin series registradas" : `${formatKg(best)} · meta ${formatKg(target)}`,
    };
  }
  if (goal.goal_type === "measurement" && goal.measurement_key) {
    const field = MEASUREMENT_FIELDS.find((item) => item.key === goal.measurement_key);
    const sorted = [...ctx.measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
    const latest = sorted
      .map((row) => row[field?.column ?? "waist_cm"] as number | null)
      .filter((value): value is number => value != null)
      .at(-1);
    if (latest == null) return { ratio: 0, label: "Sin medidas para esta meta." };
    const ratio = target === 0 ? 0 : Math.min(1, latest / target);
    return { ratio, label: `${formatCm(latest)} · meta ${formatCm(target)}` };
  }
  return { ratio: 0, label: "Sin datos" };
}

function bestExerciseWeight(entries: CompletedEntry[], exerciseId: string) {
  let best: number | null = null;
  for (const entry of entries) {
    if (entry.exercise_id !== exerciseId || entry.is_warmup || entry.weight_kg == null) continue;
    const weight = Number(entry.weight_kg);
    if (best == null || weight > best) best = weight;
  }
  return best;
}

function ToggleRow({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-line px-4 text-left"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
    >
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-semibold ${enabled ? "text-lime" : "text-faint"}`}>{enabled ? "Sí" : "No"}</span>
    </button>
  );
}

function buildWeekCounts(dates: string[], today: string, weeks: number) {
  const counts: number[] = [];
  for (let index = 0; index < weeks; index += 1) {
    const start = addIsoDays(startOfIsoWeek(today), -7 * index);
    const end = addIsoDays(start, 6);
    counts.push(dates.filter((iso) => iso >= start && iso <= end).length);
  }
  return counts;
}

function detectImprovedRecord(entries: CompletedEntry[]) {
  const byExercise = new Map<string, CompletedEntry[]>();
  for (const entry of entries) {
    if (entry.is_warmup || entry.weight_kg == null || entry.reps == null) continue;
    const list = byExercise.get(entry.exercise_id) ?? [];
    list.push(entry);
    byExercise.set(entry.exercise_id, list);
  }
  for (const list of byExercise.values()) {
    const sorted = [...list].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
    let priorBest: CompletedEntry | null = null;
    for (const entry of sorted) {
      if (priorBest && compareEntry(entry, priorBest) > 0) return true;
      if (!priorBest || compareEntry(entry, priorBest) > 0) priorBest = entry;
    }
  }
  return false;
}

function compareEntry(
  a: { weight_kg: number | null; reps: number | null },
  b: { weight_kg: number | null; reps: number | null },
) {
  const weight = Number(a.weight_kg) - Number(b.weight_kg);
  if (weight !== 0) return weight;
  return Number(a.reps) - Number(b.reps);
}
