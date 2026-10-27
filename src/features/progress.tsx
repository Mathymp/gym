import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ScreenSkeleton } from "@/components/shell";
import { AreaField, Button, EmptyState, InlineError, Kicker, Page, TextField } from "@/components/ui";
import {
  deleteMeasurement,
  deletePhoto,
  deleteWeight,
  saveMeasurement,
  savePhoto,
  saveWeight,
  signedPhotoUrl,
  todayIso,
  type CompletedEntry,
} from "@/lib/api";
import { humanError } from "@/lib/errors";
import { compressImage } from "@/lib/images";
import {
  addIsoDays,
  formatClock,
  formatCm,
  formatKg,
  formatLongDate,
  formatMediumDate,
  formatSignedKg,
  santiagoDate,
  startOfIsoWeek,
} from "@/lib/format";
import {
  bestSet,
  countInWeek,
  effectiveSets,
  isEffective,
  sessionDurationMs,
  setVolume,
  volumeOf,
  weightGoalRatio,
} from "@/lib/metrics";
import { newId } from "@/lib/utils";
import {
  ANGLE_LABEL,
  MEASUREMENT_FIELDS,
  MUSCLE_LABEL,
  type BodyMeasurement,
  type BodyWeightLog,
  type MeasurementKey,
  type MuscleGroup,
  type PhotoAngle,
  type ProgressPhoto,
  type SessionTree,
} from "@/lib/types";
import {
  ExerciseChart,
  MuscleVolumeChart,
  WeekChart,
  WeightChart,
  type ExercisePoint,
  type MuscleBar,
  type WeekBar,
  type WeightPoint,
} from "@/features/progress/charts";
import { useAuth } from "@/features/auth-context";
import {
  useEntries,
  useExercises,
  useGoals,
  useHistory,
  useMeasurements,
  usePhotos,
  useWeights,
} from "@/features/use-data";

const PROGRESS_LINKS = [
  { to: "/progreso/peso", title: "Peso", detail: "Registros y tendencia" },
  { to: "/progreso/medidas", title: "Medidas", detail: "Cintura, brazos y más" },
  { to: "/progreso/fotos", title: "Fotos", detail: "Comparar ángulos" },
  { to: "/progreso/fuerza", title: "Fuerza", detail: "Marcas por ejercicio" },
  { to: "/progreso/historial", title: "Historial", detail: "Sesiones completadas" },
] as const;

export function ProgressScreen() {
  const weights = useWeights();
  const goals = useGoals();
  const history = useHistory();
  const entries = useEntries();
  const today = todayIso();

  const loading = weights.isLoading || goals.isLoading || history.isLoading || entries.isLoading;
  if (loading) return <ScreenSkeleton />;
  const error = weights.error ?? goals.error ?? history.error ?? entries.error;
  if (error) {
    return (
      <Page>
        <InlineError message={humanError(error)} onRetry={() => void weights.refetch()} />
      </Page>
    );
  }

  const sortedWeights = [...(weights.data ?? [])].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const firstWeight = sortedWeights[0] ? Number(sortedWeights[0].weight_kg) : null;
  const latestWeight = sortedWeights.at(-1) ? Number(sortedWeights.at(-1)?.weight_kg) : null;
  const weightGoal = goals.data?.find((item) => item.goal_type === "body_weight");
  const target = weightGoal ? Number(weightGoal.target_value) : null;
  const sessions = (history.data ?? []).filter((item) => item.status === "completed");
  const sessionDates = sessions.map((item) => santiagoDate(item.started_at));
  const weeklyTarget = goals.data?.find((item) => item.goal_type === "weekly_workouts");
  const trainedThisWeek = countInWeek(sessionDates, today);

  const weightChartPoints = weeklyWeightChartPoints(sortedWeights, today);
  const muscleBars = muscleVolumeBars(entries.data ?? []);
  const weekBars = weekActivityBars(sessions, today);

  const goalText =
    latestWeight == null || target == null
      ? "Define una meta de peso en tu perfil para ver cuánto falta."
      : goalWeightText(firstWeight ?? latestWeight, latestWeight, target);

  return (
    <Page>
      <header>
        <Kicker>Progreso</Kicker>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tu registro</h1>
      </header>

      <section className="border-t border-line pt-5">
        <dl className="grid grid-cols-2 gap-x-6">
          <SummaryStat
            label="Peso actual"
            value={latestWeight == null ? "Sin registro" : formatKg(latestWeight)}
            detail={
              latestWeight != null && firstWeight != null ? formatSignedKg(latestWeight - firstWeight) + " desde el primero" : "Aún sin pesajes"
            }
          />
          <SummaryStat
            label="Esta semana"
            value={`${trainedThisWeek}`}
            detail={weeklyTarget ? `de ${Number(weeklyTarget.target_value)} entrenos` : "entrenos de fuerza"}
          />
        </dl>
        <p className="mt-4 text-sm leading-6 text-muted">{goalText}</p>
      </section>

      <nav className="border-t border-line">
        <ul>
          {PROGRESS_LINKS.map((item) => (
            <li key={item.to} className="border-b border-line">
              <Link className="flex min-h-14 items-center justify-between gap-3 py-3" to={item.to}>
                <span>
                  <span className="block font-semibold">{item.title}</span>
                  <span className="text-sm text-muted">{item.detail}</span>
                </span>
                <span className="text-muted" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section>
        <h2 className="text-lg font-semibold">Peso (12 semanas)</h2>
        {weightChartPoints.length > 0 ? (
          <div className="mt-3">
            <WeightChart points={weightChartPoints} />
          </div>
        ) : (
          <EmptyState title="Sin pesajes recientes" body="Cuando registres tu peso, verás el promedio semanal de las últimas doce semanas." />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Volumen por músculo</h2>
        {muscleBars.length > 0 ? (
          <div className="mt-3">
            <MuscleVolumeChart bars={muscleBars} />
          </div>
        ) : (
          <EmptyState title="Sin series efectivas" body="Completa entrenamientos con peso y repeticiones para ver volumen por grupo muscular." />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Semanas de entrenamiento</h2>
        {weekBars.some((bar) => bar.workouts > 0) ? (
          <div className="mt-3">
            <WeekChart weeks={weekBars} />
          </div>
        ) : (
          <EmptyState title="Sin sesiones registradas" body="Tus entrenamientos completados aparecerán aquí por semana." />
        )}
      </section>
    </Page>
  );
}

export function WeightScreen() {
  const { user } = useAuth();
  const weights = useWeights();
  const goals = useGoals();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  if (weights.isLoading) return <ScreenSkeleton />;
  if (weights.error) {
    return (
      <Page>
        <InlineError message={humanError(weights.error)} onRetry={() => void weights.refetch()} />
      </Page>
    );
  }

  const sorted = [...(weights.data ?? [])].sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  const chronological = [...sorted].reverse();
  const first = chronological[0] ? Number(chronological[0].weight_kg) : null;
  const latest = chronological.at(-1) ? Number(chronological.at(-1)?.weight_kg) : null;
  const weightGoal = goals.data?.find((item) => item.goal_type === "body_weight");
  const target = weightGoal ? Number(weightGoal.target_value) : null;
  const today = todayIso();
  const weekStart = startOfIsoWeek(today);
  const weekWeights = chronological.filter((item) => santiagoDate(item.logged_at) >= weekStart).map((item) => Number(item.weight_kg));
  const weekAvg = weekWeights.length ? weekWeights.reduce((a, b) => a + b, 0) / weekWeights.length : null;
  const chartPoints: WeightPoint[] = chronological.map((item) => {
    const week = startOfIsoWeek(santiagoDate(item.logged_at));
    const inWeek = chronological.filter((row) => startOfIsoWeek(santiagoDate(row.logged_at)) === week);
    const average = inWeek.reduce((sum, row) => sum + Number(row.weight_kg), 0) / inWeek.length;
    return { label: formatMediumDate(item.logged_at), weight: Number(item.weight_kg), average };
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const kg = Number(value.replace(",", "."));
    if (kg < 30 || kg > 300) {
      setFormError("El peso debe estar entre 30 y 300 kg.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const id = newId();
      await saveWeight(
        {
          id,
          user_id: user.id,
          client_id: id,
          logged_at: new Date().toISOString(),
          weight_kg: kg,
          notes: note.trim(),
          created_at: new Date().toISOString(),
          updated_at: "",
        },
        "insert",
      );
      setValue("");
      setNote("");
      toast.success("Peso guardado");
      await weights.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  async function remove(row: BodyWeightLog) {
    const label = `${formatKg(Number(row.weight_kg))} del ${formatLongDate(row.logged_at)}`;
    if (!window.confirm(`Se borrará el registro de ${label}. Esta acción no se puede deshacer.`)) return;
    try {
      await deleteWeight(row);
      toast.success("Registro eliminado");
      await weights.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  return (
    <Page>
      <BackLink to="/progreso" label="Progreso" />
      <header>
        <Kicker>Peso corporal</Kicker>
        <h1 className="mt-2 text-3xl font-semibold">Pesajes</h1>
      </header>

      <form className="flex flex-col gap-4 border-t border-line pt-5" onSubmit={(event) => void submit(event)}>
        <TextField
          label="Peso (kg)"
          name="weight"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ej. 78,5"
        />
        <AreaField label="Nota (opcional)" name="note" value={note} onChange={(event) => setNote(event.target.value)} />
        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando" : "Guardar peso"}
        </Button>
      </form>

      {latest != null && first != null ? (
        <dl className="grid grid-cols-2 gap-x-6 border-t border-line">
          <SummaryStat label="Promedio semanal" value={weekAvg == null ? "—" : formatKg(weekAvg)} detail="Semana en curso" />
          <SummaryStat label="Cambio acumulado" value={formatSignedKg(latest - first)} detail="Desde el primer registro" />
          {target != null ? (
            <SummaryStat
              label="Vs meta"
              value={formatSignedKg(latest - target)}
              detail={
                startOfGoalReached(first, latest, target)
                  ? "Meta de peso alcanzada"
                  : `Meta ${formatKg(target)} · ${Math.round(weightGoalRatio(first, latest, target) * 100)}% del camino`
              }
            />
          ) : null}
        </dl>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Serie</h2>
        {chartPoints.length > 0 ? (
          <div className="mt-3">
            <WeightChart points={chartPoints} />
          </div>
        ) : (
          <EmptyState title="Sin datos" body="Tu primer pesaje aparecerá en el gráfico." />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Historial</h2>
        {sorted.length === 0 ? (
          <EmptyState title="Sin registros" body="Anota tu peso cuando quieras hacer seguimiento." />
        ) : (
          <ul className="border-t border-line">
            {sorted.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 border-b border-line py-4">
                <div>
                  <p className="font-semibold tabular">{formatKg(Number(row.weight_kg))}</p>
                  <p className="text-sm text-muted">{formatLongDate(row.logged_at)}</p>
                  {row.notes ? <p className="mt-1 text-sm text-faint">{row.notes}</p> : null}
                </div>
                <Button type="button" variant="danger" size="md" className="shrink-0" onClick={() => void remove(row)}>
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

export function MeasuresScreen() {
  const { user } = useAuth();
  const measurements = useMeasurements();
  const [values, setValues] = useState<Record<MeasurementKey, string>>({
    waist: "",
    abdomen: "",
    chest: "",
    hip: "",
    arm: "",
    thigh: "",
    neck: "",
  });
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  if (measurements.isLoading) return <ScreenSkeleton />;
  if (measurements.error) {
    return (
      <Page>
        <InlineError message={humanError(measurements.error)} onRetry={() => void measurements.refetch()} />
      </Page>
    );
  }

  const sorted = [...(measurements.data ?? [])].sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const patch: Partial<BodyMeasurement> = {};
    let filled = 0;
    for (const field of MEASUREMENT_FIELDS) {
      const raw = values[field.key].trim();
      if (!raw) continue;
      const cm = Number(raw.replace(",", "."));
      if (cm < 20 || cm > 250) {
        setFormError(`${field.label} debe estar entre 20 y 250 cm.`);
        return;
      }
      patch[field.column] = cm;
      filled += 1;
    }
    if (filled === 0) {
      setFormError("Ingresa al menos una medida en centímetros.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const id = newId();
      const row: BodyMeasurement = {
        id,
        user_id: user.id,
        client_id: id,
        measured_at: new Date().toISOString(),
        waist_cm: (patch.waist_cm as number | null) ?? null,
        abdomen_cm: (patch.abdomen_cm as number | null) ?? null,
        chest_cm: (patch.chest_cm as number | null) ?? null,
        hip_cm: (patch.hip_cm as number | null) ?? null,
        arm_cm: (patch.arm_cm as number | null) ?? null,
        thigh_cm: (patch.thigh_cm as number | null) ?? null,
        neck_cm: (patch.neck_cm as number | null) ?? null,
        notes: notes.trim(),
        created_at: new Date().toISOString(),
        updated_at: "",
      };
      await saveMeasurement(row, "insert");
      setValues({ waist: "", abdomen: "", chest: "", hip: "", arm: "", thigh: "", neck: "" });
      setNotes("");
      toast.success("Medidas guardadas");
      await measurements.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  async function remove(row: BodyMeasurement) {
    const when = formatLongDate(row.measured_at);
    if (!window.confirm(`Se borrarán las medidas del ${when}. Esta acción no se puede deshacer.`)) return;
    try {
      await deleteMeasurement(row);
      toast.success("Medidas eliminadas");
      await measurements.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  return (
    <Page>
      <BackLink to="/progreso" label="Progreso" />
      <header>
        <Kicker>Medidas</Kicker>
        <h1 className="mt-2 text-3xl font-semibold">Circunferencias</h1>
        <p className="mt-2 text-sm text-muted">Completa al menos un campo. Todo en centímetros.</p>
      </header>

      <form className="flex flex-col gap-4 border-t border-line pt-5" onSubmit={(event) => void submit(event)}>
        {MEASUREMENT_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            name={field.key}
            inputMode="decimal"
            value={values[field.key]}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
            placeholder="cm"
          />
        ))}
        <AreaField label="Nota (opcional)" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Guardando" : "Guardar medidas"}
        </Button>
      </form>

      <section>
        <h2 className="text-lg font-semibold">Historial</h2>
        {sorted.length === 0 ? (
          <EmptyState title="Sin medidas" body="Registra cintura, pecho u otras medidas cuando quieras comparar." />
        ) : (
          <ul className="border-t border-line">
            {sorted.map((row) => (
              <li key={row.id} className="border-b border-line py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">{formatLongDate(row.measured_at)}</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {MEASUREMENT_FIELDS.map((field) => {
                        const cm = row[field.column] as number | null;
                        if (cm == null) return null;
                        return (
                          <li key={field.key}>
                            {field.label}: <span className="tabular">{formatCm(Number(cm))}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {row.notes ? <p className="mt-2 text-sm text-faint">{row.notes}</p> : null}
                  </div>
                  <Button type="button" variant="danger" size="md" className="shrink-0" onClick={() => void remove(row)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

export function PhotosScreen() {
  const photos = usePhotos();
  const [angle, setAngle] = useState<PhotoAngle>("front");
  const [pending, setPending] = useState(false);
  const [compare, setCompare] = useState(false);
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (photos.isLoading) return <ScreenSkeleton />;
  if (photos.error) {
    return (
      <Page>
        <InlineError message={humanError(photos.error)} onRetry={() => void photos.refetch()} />
      </Page>
    );
  }

  const sorted = [...(photos.data ?? [])].sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  const dates = [...new Set(sorted.map((item) => santiagoDate(item.taken_at)))].sort((a, b) => b.localeCompare(a));

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(true);
    try {
      const blob = await compressImage(file);
      await savePhoto({ blob, angle, takenAt: new Date().toISOString(), notes: "" });
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.success("Foto guardada en el teléfono hasta sincronizar");
      } else {
        toast.success("Foto guardada");
      }
      await photos.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  async function remove(row: ProgressPhoto) {
    const when = formatLongDate(row.taken_at);
    const ang = ANGLE_LABEL[row.angle];
    if (!window.confirm(`Se borrará la foto ${ang} del ${when}. Esta acción no se puede deshacer.`)) return;
    try {
      await deletePhoto(row);
      toast.success("Foto eliminada");
      await photos.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  return (
    <Page>
      <BackLink to="/progreso" label="Progreso" />
      <header>
        <Kicker>Fotos</Kicker>
        <h1 className="mt-2 text-3xl font-semibold">Progreso visual</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Tus fotos son privadas. Solo tú puedes verlas con enlaces firmados.</p>
      </header>

      <section className="border-t border-line pt-5">
        <p className="text-sm text-muted">Ángulo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(ANGLE_LABEL) as PhotoAngle[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`min-h-11 rounded-2xl border px-4 text-sm font-semibold ${angle === key ? "border-lime text-lime" : "border-line text-muted"}`}
              onClick={() => setAngle(key)}
            >
              {ANGLE_LABEL[key]}
            </button>
          ))}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void onFile(event)} />
        <Button className="mt-4 w-full" size="lg" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "Procesando" : "Subir foto"}
        </Button>
      </section>

      <section className="border-t border-line pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Comparar</h2>
          <Button type="button" variant="ghost" size="md" onClick={() => setCompare((value) => !value)}>
            {compare ? "Cerrar" : "Elegir fechas"}
          </Button>
        </div>
        {compare ? (
          <div className="mt-4 flex flex-col gap-3">
            <label className="block text-sm text-muted">
              Fecha A
              <select className="mt-2 h-14 w-full rounded-2xl border border-line bg-surface px-4" value={dateA} onChange={(event) => setDateA(event.target.value)}>
                <option value="">Elegir</option>
                {dates.map((iso) => (
                  <option key={iso} value={iso}>
                    {formatLongDate(iso)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-muted">
              Fecha B
              <select className="mt-2 h-14 w-full rounded-2xl border border-line bg-surface px-4" value={dateB} onChange={(event) => setDateB(event.target.value)}>
                <option value="">Elegir</option>
                {dates.map((iso) => (
                  <option key={iso} value={iso}>
                    {formatLongDate(iso)}
                  </option>
                ))}
              </select>
            </label>
            {dateA && dateB ? <CompareGrid photos={sorted} dateA={dateA} dateB={dateB} /> : null}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Galería</h2>
        {sorted.length === 0 ? (
          <EmptyState title="Sin fotos" body="Sube frontal, lateral o espalda para comparar tu progreso." />
        ) : (
          <ul className="border-t border-line">
            {sorted.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 border-b border-line py-4">
                <div>
                  <p className="font-semibold">{ANGLE_LABEL[row.angle]}</p>
                  <p className="text-sm text-muted">{formatLongDate(row.taken_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PhotoThumb path={row.storage_path} alt={`${ANGLE_LABEL[row.angle]} ${formatMediumDate(row.taken_at)}`} />
                  <Button type="button" variant="danger" size="md" onClick={() => void remove(row)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

export function StrengthScreen() {
  const entries = useEntries();
  const exercises = useExercises();

  if (entries.isLoading || exercises.isLoading) return <ScreenSkeleton />;
  const error = entries.error ?? exercises.error;
  if (error) {
    return (
      <Page>
        <InlineError message={humanError(error)} onRetry={() => void entries.refetch()} />
      </Page>
    );
  }

  const byExercise = groupExerciseBests(entries.data ?? []);

  return (
    <Page>
      <BackLink to="/progreso" label="Progreso" />
      <header>
        <Kicker>Fuerza</Kicker>
        <h1 className="mt-2 text-3xl font-semibold">Ejercicios</h1>
      </header>
      {byExercise.length === 0 ? (
        <EmptyState title="Sin marcas" body="Cuando completes series con peso, verás tu mejor set por ejercicio." />
      ) : (
        <ul className="border-t border-line">
          {byExercise.map((item) => (
            <li key={item.exerciseId} className="border-b border-line">
              <Link className="flex min-h-14 items-center justify-between gap-3 py-4" to={`/progreso/fuerza/${item.exerciseId}`}>
                <span>
                  <span className="block font-semibold">{item.name}</span>
                  <span className="text-sm text-muted">
                    Mejor: {formatKg(item.weight)} × {item.reps} reps
                  </span>
                </span>
                <span className="text-muted" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function StrengthDetailScreen() {
  const { exerciseId = "" } = useParams();
  const entries = useEntries();
  const exercises = useExercises();

  if (entries.isLoading || exercises.isLoading) return <ScreenSkeleton />;
  const error = entries.error ?? exercises.error;
  if (error) {
    return (
      <Page>
        <InlineError message={humanError(error)} onRetry={() => void entries.refetch()} />
      </Page>
    );
  }

  const exercise = exercises.data?.find((item) => item.id === exerciseId);
  const rows = (entries.data ?? []).filter((item) => item.exercise_id === exerciseId && !item.is_warmup);
  if (!exercise || rows.length === 0) {
    return (
      <Page>
        <BackLink to="/progreso/fuerza" label="Fuerza" />
        <EmptyState title="Sin datos" body="No hay series completadas para este ejercicio." />
      </Page>
    );
  }

  const sessionMap = new Map<string, ExercisePoint>();
  for (const row of rows) {
    const label = formatMediumDate(row.started_at);
    const current = sessionMap.get(row.session_id) ?? { label, weight: null, volume: 0 };
    const w = row.weight_kg != null ? Number(row.weight_kg) : null;
    const reps = row.reps != null ? Number(row.reps) : 0;
    const vol = w != null && reps ? w * reps : 0;
    current.volume += vol;
    if (w != null && (current.weight == null || w > current.weight)) current.weight = w;
    sessionMap.set(row.session_id, current);
  }
  const points = [...sessionMap.values()];
  const historicalBest = bestSet(
    rows.map((row) => ({
      weight_kg: row.weight_kg,
      reps: row.reps,
      completed_at: row.completed_at,
      is_warmup: false,
    })),
  );
  const bestWeight = historicalBest ? Number(historicalBest.weight_kg) : null;
  const maxRepsAtBest =
    bestWeight == null
      ? null
      : Math.max(
          ...rows.filter((row) => row.weight_kg != null && Number(row.weight_kg) === bestWeight && row.reps != null).map((row) => Number(row.reps)),
        );

  return (
    <Page>
      <BackLink to="/progreso/fuerza" label="Fuerza" />
      <header>
        <Kicker>{MUSCLE_LABEL[exercise.muscle_group]}</Kicker>
        <h1 className="mt-2 text-3xl font-semibold">{exercise.name}</h1>
        {historicalBest ? (
          <p className="mt-2 text-sm text-muted">
            Mejor serie: {formatKg(Number(historicalBest.weight_kg))} × {historicalBest.reps} reps
            {maxRepsAtBest != null && maxRepsAtBest !== historicalBest.reps ? ` · Hasta ${maxRepsAtBest} reps en ese peso` : null}
          </p>
        ) : null}
      </header>

      <section className="border-t border-line pt-5">
        <h2 className="text-lg font-semibold">Peso por sesión</h2>
        {points.some((point) => point.weight != null) ? (
          <div className="mt-3">
            <ExerciseChart points={points} mode="weight" />
          </div>
        ) : (
          <EmptyState title="Sin pesos" body="Registra peso en tus series para ver la curva." />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Volumen por sesión</h2>
        {points.some((point) => point.volume > 0) ? (
          <div className="mt-3">
            <ExerciseChart points={points} mode="volume" />
          </div>
        ) : (
          <EmptyState title="Sin volumen" body="El volumen suma peso × repeticiones por sesión." />
        )}
      </section>
    </Page>
  );
}

export function HistoryScreen() {
  const history = useHistory();

  if (history.isLoading) return <ScreenSkeleton />;
  if (history.error) {
    return (
      <Page>
        <InlineError message={humanError(history.error)} onRetry={() => void history.refetch()} />
      </Page>
    );
  }

  const sessions = (history.data ?? []).filter((item) => item.status === "completed");

  return (
    <Page>
      <BackLink to="/progreso" label="Progreso" />
      <header>
        <Kicker>Historial</Kicker>
        <h1 className="mt-2 text-3xl font-semibold">Sesiones</h1>
      </header>
      {sessions.length === 0 ? (
        <EmptyState title="Sin sesiones" body="Cuando completes un entrenamiento, aparecerá aquí con duración y volumen." />
      ) : (
        <ul className="border-t border-line">
          {sessions.map((session) => {
            const sets = session.exercises.flatMap((block) => block.sets);
            const effective = effectiveSets(sets).length;
            const volume = volumeOf(sets);
            return (
              <li key={session.id} className="border-b border-line">
                <Link className="block min-h-14 py-4" to={`/sesion/${session.id}`}>
                  <p className="font-semibold">{session.title}</p>
                  <p className="text-sm text-muted">
                    {formatLongDate(session.started_at)} · {formatClock(sessionDurationMs(session))} · {effective} series ·{" "}
                    {volume > 0 ? `${Math.round(volume).toLocaleString("es-CL")} kg·reps` : "sin volumen"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link className="mb-4 inline-flex min-h-11 items-center text-sm text-lime" to={to}>
      ← {label}
    </Link>
  );
}

function SummaryStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-line py-4">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular">{value}</dd>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}

function weeklyWeightChartPoints(weights: BodyWeightLog[], today: string): WeightPoint[] {
  const from = addIsoDays(today, -84);
  const recent = weights.filter((item) => santiagoDate(item.logged_at) >= from);
  const buckets = new Map<string, number[]>();
  for (const item of recent) {
    const week = startOfIsoWeek(santiagoDate(item.logged_at));
    const list = buckets.get(week) ?? [];
    list.push(Number(item.weight_kg));
    buckets.set(week, list);
  }
  const weeks = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  return weeks.map((week) => {
    const values = buckets.get(week) ?? [];
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const last = recent.filter((item) => startOfIsoWeek(santiagoDate(item.logged_at)) === week).at(-1);
    return {
      label: formatMediumDate(last?.logged_at ?? week),
      weight: average,
      average,
    };
  });
}

function muscleVolumeBars(entries: CompletedEntry[]): MuscleBar[] {
  const totals = new Map<MuscleGroup, number>();
  for (const entry of entries) {
    if (entry.is_warmup || !isEffective({ completed_at: entry.completed_at, is_warmup: entry.is_warmup })) continue;
    const vol = setVolume({ weight_kg: entry.weight_kg, reps: entry.reps });
    if (vol <= 0) continue;
    const group = entry.muscle_group as MuscleGroup;
    totals.set(group, (totals.get(group) ?? 0) + vol);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([group, volume]) => ({ label: MUSCLE_LABEL[group] ?? group, volume }));
}

function weekActivityBars(sessions: SessionTree[], today: string): WeekBar[] {
  const bars: WeekBar[] = [];
  for (let index = 11; index >= 0; index -= 1) {
    const weekStart = addIsoDays(startOfIsoWeek(today), -7 * index);
    const weekEnd = addIsoDays(weekStart, 6);
    const inWeek = sessions.filter((session) => {
      const iso = santiagoDate(session.started_at);
      return iso >= weekStart && iso <= weekEnd;
    });
    const minutes = Math.round(inWeek.reduce((sum, session) => sum + sessionDurationMs(session) / 1000, 0) / 60);
    bars.push({
      label: formatMediumDate(weekStart),
      workouts: inWeek.length,
      minutes,
    });
  }
  return bars;
}

function goalWeightText(start: number, current: number, target: number) {
  if (startOfGoalReached(start, current, target)) return "Llegaste a la meta de peso que definiste.";
  const remaining = Math.abs(current - target);
  return `Te faltan ${formatKg(remaining)} para la meta de ${formatKg(target)}.`;
}

function startOfGoalReached(start: number, current: number, target: number) {
  if (start === target) return current === target;
  if (start > target) return current <= target;
  return current >= target;
}

function groupExerciseBests(entries: CompletedEntry[]) {
  const map = new Map<string, { exerciseId: string; name: string; weight: number; reps: number }>();
  for (const entry of entries) {
    if (entry.is_warmup || entry.weight_kg == null || entry.reps == null) continue;
    const current = map.get(entry.exercise_id);
    const weight = Number(entry.weight_kg);
    const reps = Number(entry.reps);
    if (!current || weight > current.weight || (weight === current.weight && reps > current.reps)) {
      map.set(entry.exercise_id, { exerciseId: entry.exercise_id, name: entry.exercise_name, weight, reps });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function PhotoThumb({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void signedPhotoUrl(path)
      .then((signed) => {
        if (active) setUrl(signed);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path]);
  if (failed) return <span className="text-xs text-danger">Sin vista previa</span>;
  if (!url) return <span className="h-14 w-14 animate-pulse rounded-xl bg-surface" aria-hidden />;
  return <img src={url} alt={alt} className="h-14 w-14 rounded-xl border border-line object-cover" />;
}

function CompareGrid({ photos, dateA, dateB }: { photos: ProgressPhoto[]; dateA: string; dateB: string }) {
  const angles: PhotoAngle[] = ["front", "side", "back"];
  return (
    <div className="space-y-6 border-t border-line pt-4">
      {angles.map((ang) => {
        const a = photos.find((item) => santiagoDate(item.taken_at) === dateA && item.angle === ang);
        const b = photos.find((item) => santiagoDate(item.taken_at) === dateB && item.angle === ang);
        if (!a && !b) return null;
        return (
          <div key={ang}>
            <p className="text-sm font-semibold">{ANGLE_LABEL[ang]}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {a ? <ComparePhoto photo={a} caption={formatMediumDate(dateA)} /> : <MissingPhoto />}
              {b ? <ComparePhoto photo={b} caption={formatMediumDate(dateB)} /> : <MissingPhoto />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparePhoto({ photo, caption }: { photo: ProgressPhoto; caption: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void signedPhotoUrl(photo.storage_path).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [photo.storage_path]);
  return (
    <figure>
      {url ? <img src={url} alt={`${ANGLE_LABEL[photo.angle]} ${caption}`} className="aspect-[3/4] w-full rounded-2xl border border-line object-cover" /> : <div className="aspect-[3/4] animate-pulse rounded-2xl bg-surface" />}
      <figcaption className="mt-1 text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

function MissingPhoto() {
  return <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-line text-xs text-faint">Sin foto</div>;
}
