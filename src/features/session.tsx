import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, InlineError, Sheet, Stepper } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import { discardSession, finishSession, removeSet, saveBlock, saveSessionFields, saveSet } from "@/lib/api";
import { humanError } from "@/lib/errors";
import { formatClock, formatKg, formatMediumDate, formatMinutes } from "@/lib/format";
import { effectiveSets, recordsInSession, sessionDurationMs, volumeOf } from "@/lib/metrics";
import { newId } from "@/lib/utils";
import { MUSCLE_LABEL, type Exercise, type SessionExercise, type SessionTree, type TrackingType, type WorkoutSet } from "@/lib/types";
import { MachineMotion } from "@/components/machine-motion";
import { useEntries, useExercises, useHistory, useProfile, useRefresh, useSession, useSetSession } from "@/features/use-data";

export function SessionScreen() {
  const { sessionId = "" } = useParams();
  const query = useSession(sessionId);
  const profile = useProfile();
  const catalog = useExercises();
  const entries = useEntries();
  const history = useHistory();
  const setCached = useSetSession();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const session = query.data;
  const [now, setNow] = useState(() => Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(profile.data?.preferred_rest_seconds ?? 90);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const chimed = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (restUntil == null) return;
    if (now < restUntil) {
      chimed.current = false;
      return;
    }
    if (!chimed.current && profile.data?.sound_enabled) chime();
    chimed.current = true;
  }, [now, restUntil, profile.data?.sound_enabled]);

  if (query.isLoading) return <ScreenSkeleton />;
  if (query.error || !session) {
    return (
      <div className="px-4 pt-8">
        <InlineError message={humanError(query.error ?? "No encontramos la sesión.")} onRetry={() => void query.refetch()} />
        <Link to="/" className="mt-4 inline-block text-sm text-lime">Volver al inicio</Link>
      </div>
    );
  }

  if (session.status === "completed" || session.status === "abandoned") {
    return <Summary session={session} entries={entries.data ?? []} history={history.data ?? []} />;
  }

  const elapsed = sessionDurationMs(session, now);
  const restLeft = restUntil ? Math.max(0, restUntil - now) : 0;
  const doneSets = session.exercises.flatMap((block) => block.sets).filter((set) => set.completed_at).length;
  const allSets = session.exercises.reduce((sum, block) => sum + block.sets.length, 0);

  async function commit(next: SessionTree) {
    setCached(next);
  }

  async function togglePause() {
    try {
      if (session!.status === "paused" && session!.pause_started_at) {
        const extra = Math.max(0, Date.now() - new Date(session!.pause_started_at).getTime());
        const next = { ...session!, status: "active" as const, pause_started_at: null, paused_ms: session!.paused_ms + extra };
        await saveSessionFields(next);
        await commit(next);
      } else {
        const next = { ...session!, status: "paused" as const, pause_started_at: new Date().toISOString() };
        await saveSessionFields(next);
        await commit(next);
      }
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function onFinish() {
    try {
      const next = await finishSession(session!);
      await commit(next);
      await refresh();
      setConfirmFinish(false);
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function onDiscard() {
    try {
      await discardSession(session!);
      await refresh();
      navigate("/");
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  function armRest() {
    if (profile.data?.rest_timer_enabled === false) return;
    setRestUntil(Date.now() + restSeconds * 1000);
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background pb-8">
      <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="rounded-[28px] bg-lime px-4 py-4 text-ink shadow-[0_16px_40px_rgba(29,78,216,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/80">Entrenamiento</p>
              <h1 className="mt-1 text-2xl font-semibold">{session.title}</h1>
              <p className="mt-1 text-sm text-white/80">{doneSets} de {allSets} series</p>
            </div>
            <button type="button" className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-lime" onClick={() => setConfirmFinish(true)}>
              Terminar
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-3 rounded-[28px] bg-surface p-4 shadow-[0_10px_30px_rgba(18,32,51,0.06)]">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-raised">
            <p className="text-center text-2xl font-semibold tabular text-lime">{restLeft > 0 ? formatClock(restLeft) : formatClock(elapsed)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">{restLeft > 0 ? "Descanso" : session.status === "paused" ? "En pausa" : "Tiempo"}</p>
            <p className="mt-1 text-lg font-semibold">{restLeft > 0 ? "Siguiente serie" : session.title}</p>
            <div className="mt-3 flex gap-2">
              {[60, 90, 120].map((seconds) => (
                <button key={seconds} type="button" className={`h-10 min-w-12 rounded-full px-3 text-sm font-semibold ${restSeconds === seconds ? "bg-lime text-ink" : "bg-raised text-muted"}`} onClick={() => setRestSeconds(seconds)}>
                  {seconds}s
                </button>
              ))}
              {restLeft > 0 ? <button type="button" className="h-10 rounded-full bg-raised px-3 text-sm font-semibold text-foreground" onClick={() => setRestUntil(null)}>Saltar</button> : null}
            </div>
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-4 px-4 pt-4">
        {session.exercises.filter((block) => !block.replaced).map((block) => (
          <ExerciseBlock
            key={block.id}
            block={block}
            session={session}
            previous={previousLine(entries.data ?? [], block.exercise_id, session.id)}
            onSession={commit}
            onRest={armRest}
            onSubstitute={() => setPickerFor(block.id)}
          />
        ))}
        <Button variant="surface" size="lg" onClick={() => setAdding(true)}>Agregar ejercicio</Button>
        <Button size="lg" onClick={() => void togglePause()}>{session.status === "paused" ? "Reanudar" : "Pausar"}</Button>
        <Button variant="danger" size="lg" onClick={() => setConfirmDiscard(true)}>Descartar esta sesión</Button>
      </div>
      <Sheet open={confirmFinish} title="Terminar entrenamiento" onClose={() => setConfirmFinish(false)}>
        <p className="text-sm leading-6 text-muted">Se cierra el cronómetro y verás el resumen con las series que marcaste como hechas.</p>
        <Button className="mt-4 w-full" size="lg" onClick={() => void onFinish()}>Terminar y ver resumen</Button>
      </Sheet>
      <Sheet open={confirmDiscard} title="Descartar sesión" onClose={() => setConfirmDiscard(false)}>
        <p className="text-sm leading-6 text-muted">La sesión no entra en tus estadísticas ni en el historial de ejercicios.</p>
        <Button className="mt-4 w-full" variant="surface" size="lg" onClick={() => void onDiscard()}>Sacarla de las estadísticas</Button>
      </Sheet>
      <Sheet open={Boolean(pickerFor) || adding} title={adding ? "Agregar ejercicio" : "Cambiar ejercicio"} onClose={() => { setPickerFor(null); setAdding(false); }}>
        <ExercisePicker
          exercises={catalog.data ?? []}
          onPick={(exercise) => {
            void (async () => {
              if (adding) await addExercise(session, exercise, commit);
              else if (pickerFor) await substitute(session, pickerFor, exercise, commit);
              setPickerFor(null);
              setAdding(false);
            })();
          }}
        />
      </Sheet>
    </div>
  );
}

function ExerciseBlock({
  block,
  session,
  previous,
  onSession,
  onRest,
  onSubstitute,
}: {
  block: SessionExercise;
  session: SessionTree;
  previous: string | null;
  onSession: (session: SessionTree) => Promise<void>;
  onRest: () => void;
  onSubstitute: () => void;
}) {
  return (
    <section className="rounded-[28px] bg-surface p-4 shadow-[0_10px_30px_rgba(18,32,51,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{block.exercise.name}</h2>
          <p className="text-sm text-muted">{MUSCLE_LABEL[block.exercise.muscle_group]} · {block.exercise.equipment}</p>
        </div>
        <Button variant="surface" size="md" onClick={onSubstitute}>Cambiar</Button>
      </div>
      <MachineMotion compact slug={block.exercise.slug} name={block.exercise.name} muscle={block.exercise.muscle_group} />
      <p className="mt-2 text-sm leading-5"><span className="font-semibold text-lime">Consejo. </span>{block.exercise.instructions}</p>
      {block.exercise.common_mistakes ? <p className="mt-1 text-sm leading-5 text-muted"><span className="font-semibold">Evita. </span>{block.exercise.common_mistakes}</p> : null}
      {previous ? <p className="mt-2 text-sm text-faint">Última sesión: {previous}</p> : <p className="mt-2 text-sm text-faint">Sin cargas anteriores.</p>}
      <div className="mt-3 flex flex-col gap-2">
        {block.sets.map((set) => (
          <SetRow key={set.id} set={set} tracking={block.exercise.tracking_type} session={session} onSession={onSession} onRest={onRest} />
        ))}
      </div>
      <Button className="mt-3 w-full" variant="surface" onClick={() => {
          const last = block.sets.at(-1);
          const id = newId();
          const created: WorkoutSet = {
            id,
            user_id: session.user_id,
            session_exercise_id: block.id,
            client_id: id,
            set_index: (last?.set_index ?? 0) + 1,
            weight_kg: last?.weight_kg ?? null,
            reps: last?.reps ?? null,
            duration_seconds: last?.duration_seconds ?? null,
            distance_m: last?.distance_m ?? null,
            rpe: null,
            is_warmup: false,
            completed_at: null,
            notes: "",
            created_at: new Date().toISOString(),
            updated_at: "",
          };
          void saveSet(session, created, "insert").then(onSession).catch((caught) => toast.error(humanError(caught)));
        }}
      >
        Agregar serie
      </Button>
      <label className="mt-2 block text-xs text-faint">
        Nota
        <input
          className="mt-1 h-11 w-full rounded-xl bg-raised px-3 text-sm text-foreground"
          defaultValue={block.notes}
          placeholder="Opcional"
          onBlur={(event) => {
            const next = { ...block, notes: event.target.value };
            void saveBlock(session, next).then(onSession);
          }}
        />
      </label>
    </section>
  );
}

function SetRow({
  set,
  tracking,
  session,
  onSession,
  onRest,
}: {
  set: WorkoutSet;
  tracking: TrackingType;
  session: SessionTree;
  onSession: (session: SessionTree) => Promise<void>;
  onRest: () => void;
}) {
  const [weight, setWeight] = useState(set.weight_kg);
  const [reps, setReps] = useState(set.reps);
  const [seconds, setSeconds] = useState(set.duration_seconds);
  const [distance, setDistance] = useState(set.distance_m);
  const [rpe, setRpe] = useState(set.rpe);
  const done = Boolean(set.completed_at);

  async function persist(patch: Partial<WorkoutSet>, completed: boolean) {
    const nextSet: WorkoutSet = {
      ...set,
      weight_kg: weight,
      reps,
      duration_seconds: seconds,
      distance_m: distance,
      rpe,
      ...patch,
      completed_at: completed ? set.completed_at ?? new Date().toISOString() : null,
    };
    if (completed && !validSet(tracking, nextSet)) {
      toast.error("Completa la carga o las repeticiones antes de marcar la serie.");
      return;
    }
    const next = await saveSet(session, nextSet, "update");
    await onSession(next);
    if (completed && !done) onRest();
  }

  return (
    <div className={`rounded-2xl px-2 py-2 ${done ? "bg-raised" : ""}`}>
      <div className="mb-1 flex items-center justify-between text-xs text-faint">
        <span>Serie {set.set_index}</span>
        <button
          className={`h-8 px-2 ${set.is_warmup ? "text-warning" : "text-faint"}`}
          onClick={() => void persist({ is_warmup: !set.is_warmup }, done).catch((caught) => toast.error(humanError(caught)))}
        >
          {set.is_warmup ? "Calentamiento" : "Serie efectiva"}
        </button>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {tracking === "weight_reps" || tracking === "reps" ? (
          tracking === "weight_reps" ? <Stepper label="Peso" unit="kg" step={2.5} value={weight} onChange={setWeight} /> : null
        ) : null}
        {tracking === "weight_reps" || tracking === "reps" ? <Stepper label="Repeticiones" unit="reps" step={1} max={200} value={reps} onChange={setReps} /> : null}
        {tracking === "time" ? <Stepper label="Segundos" unit="s" step={5} max={3600} value={seconds} onChange={setSeconds} /> : null}
        {tracking === "distance" ? <Stepper label="Distancia" unit="m" step={100} max={100000} value={distance} onChange={setDistance} /> : null}
        <button
          className={`h-14 w-14 shrink-0 rounded-2xl text-lg font-semibold ${done ? "bg-lime text-ink" : "bg-raised text-foreground"}`}
          aria-label={done ? "Guardar corrección" : "Completar serie"}
          onClick={() => void persist({}, true).catch((caught) => toast.error(humanError(caught)))}
        >
          {done ? "✓" : "○"}
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <button className="h-10 text-xs text-muted" onClick={() => setRpe(rpe == null ? 7 : rpe >= 10 ? null : Math.round((rpe + 0.5) * 10) / 10)}>
          {rpe == null ? "RPE opcional" : `RPE ${rpe}`}
        </button>
        {done ? (
          <button className="h-10 text-xs text-muted" onClick={() => void persist({}, false).catch((caught) => toast.error(humanError(caught)))}>Desmarcar</button>
        ) : set.set_index > 1 ? (
          <button className="h-10 text-xs text-muted" onClick={() => void removeSet(session, set).then(onSession)}>Quitar serie</button>
        ) : null}
      </div>
    </div>
  );
}

function validSet(tracking: TrackingType, set: WorkoutSet) {
  if (tracking === "weight_reps") return set.weight_kg != null && set.weight_kg >= 0 && (set.reps ?? 0) > 0;
  if (tracking === "reps") return (set.reps ?? 0) > 0;
  if (tracking === "time") return (set.duration_seconds ?? 0) > 0;
  return (set.distance_m ?? 0) > 0 || (set.duration_seconds ?? 0) > 0;
}

function previousLine(entries: Array<{ exercise_id: string; session_id: string; weight_kg: number | null; reps: number | null; duration_seconds: number | null; is_warmup: boolean }>, exerciseId: string, sessionId: string) {
  const match = entries.find((entry) => entry.exercise_id === exerciseId && entry.session_id !== sessionId && !entry.is_warmup);
  if (!match) return null;
  if (match.weight_kg != null && match.reps != null) return `${formatKg(match.weight_kg)} × ${match.reps}`;
  if (match.duration_seconds) return `${match.duration_seconds} s`;
  if (match.reps) return `${match.reps} reps`;
  return null;
}

async function addExercise(session: SessionTree, exercise: Exercise, onSession: (session: SessionTree) => Promise<void>) {
  const id = newId();
  const setId = newId();
  const block: SessionExercise = {
    id,
    user_id: session.user_id,
    session_id: session.id,
    exercise_id: exercise.id,
    client_id: id,
    sort_order: session.exercises.length,
    notes: "",
    substituted_from_exercise_id: null,
    replaced: false,
    created_at: new Date().toISOString(),
    updated_at: "",
    exercise,
    sets: [
      {
        id: setId,
        user_id: session.user_id,
        session_exercise_id: id,
        client_id: setId,
        set_index: 1,
        weight_kg: null,
        reps: exercise.tracking_type === "time" ? null : 10,
        duration_seconds: exercise.tracking_type === "time" ? 30 : null,
        distance_m: null,
        rpe: null,
        is_warmup: false,
        completed_at: null,
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: "",
      },
    ],
  };
  let next = await saveBlock(session, block, "insert");
  next = await saveSet(next, block.sets[0], "insert");
  await onSession(next);
}

async function substitute(session: SessionTree, blockId: string, exercise: Exercise, onSession: (session: SessionTree) => Promise<void>) {
  const block = session.exercises.find((item) => item.id === blockId);
  if (!block) return;
  const done = block.sets.filter((set) => set.completed_at);
  if (done.length === 0) {
    const nextBlock = { ...block, exercise, exercise_id: exercise.id, substituted_from_exercise_id: block.exercise_id };
    const next = await saveBlock(session, nextBlock, "update");
    await onSession(next);
    return;
  }
  let current = await saveBlock(session, { ...block, replaced: true, sets: done }, "update");
  for (const set of block.sets.filter((item) => !item.completed_at)) current = await removeSet(current, set);
  await addExercise(current, exercise, onSession);
}

function ExercisePicker({ exercises, onPick }: { exercises: Exercise[]; onPick: (exercise: Exercise) => void }) {
  const [query, setQuery] = useState("");
  const filtered = exercises.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0, 25);
  return (
    <div>
      <input className="h-12 w-full rounded-2xl bg-background px-3" placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar ejercicio" />
      <ul className="mt-3">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <button className="flex min-h-14 w-full items-center justify-between border-b border-line text-left" onClick={() => onPick(exercise)}>
              <span>{exercise.name}</span>
              <span className="text-xs text-faint">{MUSCLE_LABEL[exercise.muscle_group]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({
  session,
  entries,
  history,
}: {
  session: SessionTree;
  entries: Array<{ id: string; exercise_id: string; session_id: string; weight_kg: number | null; reps: number | null; duration_seconds: number | null; distance_m: number | null; is_warmup: boolean; completed_at: string }>;
  history: SessionTree[];
}) {
  const sets = session.exercises.flatMap((block) => block.sets);
  const effective = effectiveSets(sets);
  const volume = volumeOf(sets);
  const completedExercises = session.exercises.filter((block) => effectiveSets(block.sets).length > 0).length;
  const historySets = entries.map((entry) => ({
    ...entry,
    user_id: session.user_id,
    session_exercise_id: "",
    client_id: entry.id,
    set_index: 1,
    rpe: null,
    notes: "",
    created_at: entry.completed_at,
    updated_at: entry.completed_at,
  }));
  const records = recordsInSession(session, historySets);
  const previous = history.find((item) => item.id !== session.id && item.plan_day_id && item.plan_day_id === session.plan_day_id);
  const previousVolume = previous ? volumeOf(previous.exercises.flatMap((block) => block.sets)) : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 pt-8 pb-16">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Resumen</p>
      <h1 className="text-4xl font-semibold tracking-tight">{session.title}</h1>
      <dl className="grid grid-cols-2 gap-x-6 border-t border-line">
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Duración</dt><dd className="text-2xl font-semibold tabular">{formatClock(sessionDurationMs(session))}</dd></div>
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Ejercicios</dt><dd className="text-2xl font-semibold tabular">{completedExercises}</dd></div>
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Series efectivas</dt><dd className="text-2xl font-semibold tabular">{effective.length}</dd></div>
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Volumen</dt><dd className="text-2xl font-semibold tabular">{formatKg(volume)}</dd></div>
      </dl>
      <p className="text-sm text-muted">Las series de calentamiento no entran en las series efectivas ni en el volumen.</p>
      {records.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Récords de esta sesión</h2>
          <ul className="mt-2">
            {records.map((record) => (
              <li key={record.exerciseId} className="border-b border-line py-3 text-sm">
                {record.exerciseName}: {formatKg(record.weight)} × {record.reps}
                {record.previousWeight != null ? <span className="text-muted"> · antes {formatKg(record.previousWeight)} × {record.previousReps}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">No superaste una marca anterior en esta sesión.</p>
      )}
      {previous && previousVolume != null ? (
        <p className="text-sm text-muted">
          Contra {previous.title} del {formatMediumDate(previous.started_at)}: volumen {formatKg(previousVolume)}, duración {formatMinutes(sessionDurationMs(previous) / 1000)}.
        </p>
      ) : null}
      <Button asChild size="lg"><Link to="/">Volver al inicio</Link></Button>
    </div>
  );
}

function chime() {
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = 698;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.3);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.32);
}
