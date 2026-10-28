import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Repeat2 } from "lucide-react";
import { ExerciseMuscles, MuscleMap } from "@/components/muscle-map";
import { loadLevels, REGION_LABEL, sessionMuscleLoad, type MuscleLoad } from "@/lib/muscles";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, InlineError, Sheet, Stepper } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import { discardSession, finishSession, insertBlock, removeSet, saveBlock, saveSessionFields, saveSet } from "@/lib/api";
import { humanError } from "@/lib/errors";
import { formatClock, formatKg, formatMediumDate, formatMinutes } from "@/lib/format";
import { effectiveSets, recordsInSession, sessionDurationMs, volumeOf } from "@/lib/metrics";
import { newId } from "@/lib/utils";
import { type Exercise, type SessionExercise, type SessionTree, type TrackingType, type WorkoutSet } from "@/lib/types";
import { ExerciseChoice } from "@/components/exercise-choice";
import { FormaMark } from "@/components/forma-mark";
import { ExerciseDemo, ExerciseMotion } from "@/components/exercise-motion";
import { MuscleLine } from "@/components/muscle-line";
import { useEntries, useExercises, useHistory, usePlans, useProfile, useRefresh, useSession, useSetSession } from "@/features/use-data";

export function SessionScreen() {
  const { sessionId = "" } = useParams();
  const query = useSession(sessionId);
  const profile = useProfile();
  const catalog = useExercises();
  const entries = useEntries();
  const plans = usePlans();
  const history = useHistory();
  const setCached = useSetSession();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const session = query.data;
  const [now, setNow] = useState(() => Date.now());
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(1);
  const completeCurrent = useRef<(() => void) | null>(null);
  const restCard = useRef<HTMLDivElement | null>(null);
  const [restCardVisible, setRestCardVisible] = useState(true);
  const [restSeconds, setRestSeconds] = useState(profile.data?.preferred_rest_seconds ?? 90);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const chimed = useRef(false);

  useEffect(() => {
    if (restUntil == null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [restUntil]);

  useEffect(() => {
    if (restUntil == null) return;
    if (now < restUntil) {
      chimed.current = false;
      return;
    }
    if (!chimed.current) {
      buzz();
      if (profile.data?.sound_enabled) chime();
    }
    chimed.current = true;
    setRestUntil(null);
  }, [now, restUntil, profile.data?.sound_enabled]);

  const loaded = Boolean(query.data);
  useEffect(() => {
    const node = restCard.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setRestCardVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loaded]);

  const resting = restUntil != null && now < restUntil;
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const previous = meta.content;
    meta.content = resting ? "#1e40af" : "#f3f6fb";
    return () => {
      meta.content = previous;
    };
  }, [resting]);

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

  const restLeft = restUntil ? Math.max(0, restUntil - now) : 0;
  const doneSets = session.exercises.flatMap((block) => block.sets).filter((set) => set.completed_at).length;
  const allSets = session.exercises.reduce((sum, block) => sum + block.sets.length, 0);
  const upcoming = nextOpenSet(session);
  const plannedDay = plans.data?.find((item) => item.id === session.plan_id)?.days.find((item) => item.id === session.plan_day_id);
  const adviceFor = (exerciseId: string) => {
    const row = plannedDay?.exercises.find((item) => item.exercise_id === exerciseId);
    return previousAdvice(entries.data ?? [], exerciseId, session.id, row ? { min: row.target_reps_min, max: row.target_reps_max } : null);
  };
  const upcomingAdvice = upcoming ? adviceFor(upcoming.block.exercise_id) : null;
  const dayZones = [...new Set(session.exercises.filter((block) => !block.replaced).map((block) => block.exercise.muscle_group))];

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

  function registerCurrent(action: (() => void) | null) {
    completeCurrent.current = action;
  }

  function armRest() {
    if (profile.data?.rest_timer_enabled === false) return;
    const start = Date.now();
    setNow(start);
    setRestTotal(restSeconds * 1000);
    setRestUntil(start + restSeconds * 1000);
  }

  function chooseRest(seconds: number) {
    setRestSeconds(seconds);
    if (restUntil == null) return;
    const start = Date.now();
    setNow(start);
    setRestTotal(seconds * 1000);
    setRestUntil(start + seconds * 1000);
  }

  const visibleBlocks = session.exercises.filter((block) => !block.replaced);
  const restRatio = restLeft > 0 ? restLeft / restTotal : 0;

  function openInsert(visibleIndex: number) {
    const anchor = visibleBlocks[visibleIndex];
    setInsertAt(anchor ? session!.exercises.indexOf(anchor) : session!.exercises.length);
    setAdding(true);
  }

  return (
    <div className={`min-h-dvh transition-colors duration-500 ease-out ${restLeft > 0 ? "bg-lime-deep" : "bg-background"}`}>
    <div className="mx-auto w-full max-w-lg pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className={`rounded-[28px] bg-lime px-4 py-4 text-ink transition-shadow duration-500 ${restLeft > 0 ? "shadow-none ring-1 ring-white/20" : "shadow-[0_16px_40px_rgba(29,78,216,0.28)]"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/80">
                <FormaMark className="h-5 w-5" />
                FORMA
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{session.title}</h1>
              <p className="mt-1 text-sm text-white/80">{doneSets} de {allSets} series</p>
            </div>
            <button type="button" className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-lime" onClick={() => setConfirmFinish(true)}>
              Terminar
            </button>
          </div>
        </div>
        <div ref={restCard} className="mt-3 scroll-mt-[calc(env(safe-area-inset-top)+0.75rem)] rounded-[28px] bg-surface p-4 shadow-[0_10px_30px_rgba(18,32,51,0.08)]">
          {restLeft > 0 ? (
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Descanso</p>
                  <p className="mt-1 text-6xl leading-none font-semibold tracking-tight tabular text-foreground">{formatClock(restLeft)}</p>
                </div>
                <p className="pb-1 text-right text-xs text-muted">Te aviso con<br />vibración</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
                <div className="h-full rounded-full bg-lime transition-[width] duration-300 ease-linear" style={{ width: `${restRatio * 100}%` }} />
              </div>
              {upcoming ? (
                <div className="mt-4 flex items-center gap-3">
                  <ExerciseMotion slug={upcoming.block.exercise.slug} name={upcoming.block.exercise.name} muscle={upcoming.block.exercise.muscle_group} labelled={false} className="aspect-[3/2] w-28 shrink-0 rounded-xl" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Después · serie {upcoming.set.set_index}</p>
                    <p className="font-semibold leading-5">{upcoming.block.exercise.name}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold">Era la última serie.</p>
              )}
            </div>
          ) : upcoming ? (
            <ExerciseMotion slug={upcoming.block.exercise.slug} name={upcoming.block.exercise.name} muscle={upcoming.block.exercise.muscle_group} className="mb-4 aspect-[16/10] w-full rounded-2xl" />
          ) : null}
          {restLeft > 0 ? null : upcoming ? (
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Ahora · serie {upcoming.set.set_index}</p>
              <p className="mt-1 text-xl font-semibold leading-6">{upcoming.block.exercise.name}</p>
              <MuscleLine exercise={upcoming.block.exercise} className="mt-2" />
              <p className="mt-2 text-sm text-muted">Márcala cuando la termines y ahí parte el descanso.</p>
              {upcomingAdvice ? (
                <>
                  <p className="mt-2 text-sm">{upcomingAdvice.line}</p>
                  <p className="mt-1 text-sm font-semibold">{upcomingAdvice.suggestion}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">Sin marca anterior de este ejercicio. Elige un peso que te deje unas 2 o 3 repeticiones de reserva.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted">Listo</p>
              <p className="mt-1 text-lg font-semibold">Marcaste todas las series</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {[60, 90, 120].map((seconds) => (
              <button key={seconds} type="button" aria-pressed={restSeconds === seconds} className={`h-10 min-w-12 rounded-full px-3 text-sm font-semibold ${restSeconds === seconds ? "bg-lime text-white" : "bg-raised text-foreground"}`} onClick={() => chooseRest(seconds)}>
                {seconds}s
              </button>
            ))}
            {restLeft > 0 ? <button type="button" className="ml-auto h-10 rounded-full px-3 text-sm font-semibold text-lime" onClick={() => setRestUntil(null)}>Saltar descanso</button> : null}
          </div>
          {restLeft === 0 && upcoming ? (
            <button type="button" className="mt-3 h-12 w-full rounded-2xl bg-lime text-sm font-semibold text-white active:scale-[0.99]" onClick={() => completeCurrent.current?.()}>
              Ya hice la serie
            </button>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col px-4 pt-4">
        {visibleBlocks.map((block, index) => (
          <div key={block.id}>
            {index > 0 ? <InsertHere resting={restLeft > 0} onClick={() => openInsert(index)} /> : null}
            <ExerciseBlock
              block={block}
              session={session}
              previous={adviceFor(block.exercise_id)}
              planNote={plannedDay?.exercises.find((item) => item.exercise_id === block.exercise_id)?.notes || null}
              currentSetId={restLeft > 0 ? null : upcoming?.set.id ?? null}
              onSession={commit}
              onRest={armRest}
              onRegister={registerCurrent}
              onSubstitute={() => setPickerFor(block.id)}
            />
          </div>
        ))}
        <Button className="mt-4" variant="surface" size="lg" onClick={() => openInsert(visibleBlocks.length)}>Agregar otro ejercicio al final</Button>
        <p className={`mt-2 text-center text-xs ${restLeft > 0 ? "text-white/70" : "text-muted"}`}>Puedes sumar más de lo que trae el plan. Queda solo en esta sesión.</p>
        <Button className="mt-4" size="lg" onClick={() => void togglePause()}>{session.status === "paused" ? "Reanudar" : "Pausar"}</Button>
        <Button className="mt-3" variant="danger" size="lg" onClick={() => setConfirmDiscard(true)}>Descartar esta sesión</Button>
      </div>
    </div>
      {restLeft > 0 && !restCardVisible ? (
        <button
          type="button"
          className={`${restLeft <= 5000 ? "rest-bubble-ending" : "rest-bubble"} fixed z-50 flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-white text-lime`}
          style={{ right: "max(1rem, calc(env(safe-area-inset-right) + 0.75rem))", bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
          aria-label={`Descanso, quedan ${formatClock(restLeft)}. Ir al reloj`}
          onClick={() => restCard.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88" aria-hidden>
            <circle cx="44" cy="44" r="39" fill="none" stroke="#e7eef8" strokeWidth="5" />
            <circle cx="44" cy="44" r="39" fill="none" stroke="#1d4ed8" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 39 * restRatio} ${2 * Math.PI * 39}`} className="transition-[stroke-dasharray] duration-300 ease-linear" />
          </svg>
          <span className="relative text-xl leading-none font-semibold tabular text-foreground">{formatClock(restLeft)}</span>
          <span className="relative mt-1 text-[10px] font-semibold tracking-[0.12em] uppercase">Descanso</span>
        </button>
      ) : null}
      <Sheet open={confirmFinish} title="Terminar entrenamiento" onClose={() => setConfirmFinish(false)}>
        <p className="text-sm leading-6 text-muted">Se guarda el entreno y verás el resumen con las series que marcaste como hechas.</p>
        <Button className="mt-4 w-full" size="lg" onClick={() => void onFinish()}>Terminar y ver resumen</Button>
      </Sheet>
      <Sheet open={confirmDiscard} title="Descartar sesión" onClose={() => setConfirmDiscard(false)}>
        <p className="text-sm leading-6 text-muted">La sesión no entra en tus estadísticas ni en el historial de ejercicios.</p>
        <Button className="mt-4 w-full" variant="surface" size="lg" onClick={() => void onDiscard()}>Sacarla de las estadísticas</Button>
      </Sheet>
      <Sheet open={Boolean(pickerFor) || adding} title={adding ? (insertAt != null && insertAt < session.exercises.length ? "Agregar aquí" : "Agregar ejercicio") : "Cambiar ejercicio"} onClose={() => { setPickerFor(null); setAdding(false); setInsertAt(null); }}>
        <ExerciseChoice
          exercises={catalog.data ?? []}
          zone={adding ? undefined : session.exercises.find((block) => block.id === pickerFor)?.exercise.muscle_group}
          zones={dayZones}
          preferredSlugs={adding ? [] : session.exercises.find((block) => block.id === pickerFor)?.exercise.alternative_slugs ?? []}
          excludeId={adding ? undefined : session.exercises.find((block) => block.id === pickerFor)?.exercise_id}
          onPick={(exercise) => {
            void (async () => {
              try {
                if (adding) await addExercise(session, exercise, commit, insertAt ?? session.exercises.length);
                else if (pickerFor) await substitute(session, pickerFor, exercise, commit);
                toast.success(adding ? `${exercise.name} agregado` : `Cambiado por ${exercise.name}`);
              } catch (caught) {
                toast.error(humanError(caught));
              }
              setPickerFor(null);
              setAdding(false);
              setInsertAt(null);
            })();
          }}
        />
      </Sheet>
    </div>
  );
}

function nextOpenSet(session: SessionTree) {
  for (const block of session.exercises.filter((item) => !item.replaced)) {
    const set = block.sets.find((item) => !item.completed_at);
    if (set) return { block, set };
  }
  return null;
}

function ExerciseBlock({
  block,
  session,
  previous,
  planNote,
  currentSetId,
  onSession,
  onRest,
  onRegister,
  onSubstitute,
}: {
  block: SessionExercise;
  session: SessionTree;
  previous: { line: string; suggestion: string } | null;
  planNote: string | null;
  currentSetId: string | null;
  onSession: (session: SessionTree) => Promise<void>;
  onRest: () => void;
  onRegister: (action: (() => void) | null) => void;
  onSubstitute: () => void;
}) {
  const doneCount = block.sets.filter((set) => set.completed_at).length;
  const active = currentSetId != null && block.sets.some((set) => set.id === currentSetId);
  return (
    <section className={`rounded-[28px] bg-surface p-4 transition-shadow duration-300 ${active ? "shadow-[0_0_0_2px_rgba(29,78,216,0.9),0_16px_36px_rgba(29,78,216,0.16)]" : "shadow-[0_10px_30px_rgba(18,32,51,0.06)]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tabular text-faint">
            {doneCount} de {block.sets.length} series{active ? <span className="text-lime"> · ahora</span> : null}
          </p>
          <h2 className="mt-0.5 text-xl leading-6 font-semibold tracking-tight">{block.exercise.name}</h2>
          <p className="mt-1 text-xs text-faint">{block.exercise.equipment}</p>
        </div>
        <button type="button" className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-raised px-3 text-xs font-semibold text-foreground transition-transform active:scale-95" onClick={onSubstitute}>
          <Repeat2 size={14} aria-hidden />
          Cambiar
        </button>
      </div>
      <ExerciseDemo exercise={block.exercise} className="mt-3" />
      {planNote ? <p className="mt-3 text-sm leading-5 text-muted">{planNote}</p> : null}
      <div className="mt-4 rounded-2xl bg-background p-3">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Zona que trabaja</p>
        <ExerciseMuscles exercise={block.exercise} />
      </div>
      {block.exercise.common_mistakes ? (
        <p className="mt-3 text-sm leading-5 text-muted"><span className="font-semibold text-warning">Evita. </span>{block.exercise.common_mistakes}</p>
      ) : null}
      {previous ? (
        <div className="mt-3 border-l-2 border-lime pl-3">
          <p className="text-sm">{previous.line}</p>
          <p className="mt-0.5 text-sm font-semibold">{previous.suggestion}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-faint">Sin marca anterior de este ejercicio.</p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {block.sets.map((set) => (
          <SetRow key={set.id} set={set} tracking={block.exercise.tracking_type} session={session} current={set.id === currentSetId} onSession={onSession} onRest={onRest} onRegister={onRegister} />
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
  current,
  onSession,
  onRest,
  onRegister,
}: {
  set: WorkoutSet;
  tracking: TrackingType;
  session: SessionTree;
  current: boolean;
  onSession: (session: SessionTree) => Promise<void>;
  onRest: () => void;
  onRegister: (action: (() => void) | null) => void;
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

  if (current && !done) {
    onRegister(() => {
      void persist({}, true).catch((caught) => toast.error(humanError(caught)));
    });
  }

  return (
    <div className={`rounded-2xl px-2 py-2 transition-colors duration-300 ${done ? "set-done" : current ? "bg-lime/5 ring-1 ring-lime/25" : ""}`}>
      <div className="mb-1 flex items-center justify-between text-xs text-faint">
        <span className="flex items-center gap-1.5 font-semibold">
          {done ? (
            <span className="pop flex h-5 w-5 items-center justify-center rounded-full bg-lime text-white" aria-hidden>
              <Check size={12} strokeWidth={3} />
            </span>
          ) : null}
          <span className={done ? "text-foreground" : current ? "text-lime" : undefined}>Serie {set.set_index}{done ? " · hecha" : ""}</span>
        </span>
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
      </div>
      {!done && current ? (
        <button
          type="button"
          className="mt-2 h-12 w-full rounded-2xl bg-lime text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          onClick={() => void persist({}, true).catch((caught) => toast.error(humanError(caught)))}
        >
          Ya hice la serie
        </button>
      ) : null}
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

function previousAdvice(
  entries: Array<{ exercise_id: string; session_id: string; started_at: string; weight_kg: number | null; reps: number | null; duration_seconds: number | null; is_warmup: boolean }>,
  exerciseId: string,
  sessionId: string,
  target: { min: number | null; max: number | null } | null,
) {
  const rows = entries.filter((entry) => entry.exercise_id === exerciseId && entry.session_id !== sessionId && !entry.is_warmup);
  if (rows.length === 0) return null;
  const latest = rows[0].session_id;
  const sets = rows.filter((entry) => entry.session_id === latest);
  const dated = formatMediumDate(rows[0].started_at);
  const reps = sets.map((entry) => entry.reps).filter((value): value is number => value != null);
  const weight = sets.find((entry) => entry.weight_kg != null)?.weight_kg ?? null;
  const seconds = sets.find((entry) => entry.duration_seconds)?.duration_seconds ?? null;
  const line = weight != null && reps.length
    ? `Antes, ${dated}: ${formatKg(weight)} × ${reps.join(", ")}`
    : reps.length
      ? `Antes, ${dated}: ${reps.join(", ")} reps`
      : seconds
        ? `Antes, ${dated}: ${seconds} s`
        : null;
  if (!line) return null;
  let suggestion = "Parte con ese peso. Si completas el rango en todas las series, la próxima sube un poco.";
  if (target?.max != null && reps.length > 0 && reps.every((value) => value >= target.max!)) suggestion = "La vez anterior llegaste al tope. Sube un poco el peso.";
  else if (target?.min != null && reps.some((value) => value < target.min!)) suggestion = "La vez anterior te quedaste bajo el rango. Mantén el peso.";
  return { line, suggestion };
}

function InsertHere({ resting, onClick }: { resting: boolean; onClick: () => void }) {
  return (
    <div className="relative flex h-12 items-center justify-center">
      <span className={`absolute inset-x-6 top-1/2 border-t border-dashed ${resting ? "border-white/30" : "border-line"}`} aria-hidden />
      <button type="button" className="relative h-9 rounded-full bg-surface px-4 text-xs font-semibold text-lime shadow-[0_4px_14px_rgba(18,32,51,0.08)]" onClick={onClick}>
        + Agregar aquí
      </button>
    </div>
  );
}

async function addExercise(session: SessionTree, exercise: Exercise, onSession: (session: SessionTree) => Promise<void>, at: number) {
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
  const next = await insertBlock(session, block, at);
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
  await addExercise(current, exercise, onSession, current.exercises.findIndex((item) => item.id === block.id) + 1);
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
    <div className="enter mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 pt-[max(2rem,calc(env(safe-area-inset-top)+1rem))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Resumen</p>
      <h1 className="text-4xl font-semibold tracking-tight">{session.title}</h1>
      <dl className="grid grid-cols-2 gap-x-6 border-t border-line">
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Duración</dt><dd className="text-2xl font-semibold tabular">{formatClock(sessionDurationMs(session))}</dd></div>
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Ejercicios</dt><dd className="text-2xl font-semibold tabular">{completedExercises}</dd></div>
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Series efectivas</dt><dd className="text-2xl font-semibold tabular">{effective.length}</dd></div>
        <div className="border-b border-line py-4"><dt className="text-xs text-faint">Volumen</dt><dd className="text-2xl font-semibold tabular">{formatKg(volume)}</dd></div>
      </dl>
      <p className="text-sm text-muted">Las series de calentamiento no entran en las series efectivas ni en el volumen.</p>
      <MuscleSummary load={sessionMuscleLoad(session.exercises)} />
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

function MuscleSummary({ load }: { load: MuscleLoad[] }) {
  if (load.length === 0) {
    return <p className="text-sm text-muted">No marcaste series efectivas, así que no hay zonas trabajadas que mostrar.</p>;
  }
  const top = Math.max(1, ...load.map((item) => item.direct + item.support / 2));
  return (
    <section className="rounded-[28px] bg-surface p-4 shadow-[0_10px_30px_rgba(18,32,51,0.06)]">
      <h2 className="text-lg font-semibold tracking-tight">Zonas trabajadas</h2>
      <p className="mt-0.5 text-sm text-muted">Más rojo, más series en esa zona.</p>
      <MuscleMap levels={loadLevels(load)} className="mx-auto mt-4 w-full max-w-[15rem]" />
      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted" aria-hidden>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fbc4c4]" />Apoyo</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f48a8c]" />Medio</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#e5484d]" />Foco</span>
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {load.map((item, index) => (
          <li key={item.region} className="enter grid grid-cols-[6.5rem_1fr_4.75rem] items-center gap-3 text-sm" style={{ "--i": index } as CSSProperties}>
            <span className="truncate font-medium">{REGION_LABEL[item.region]}</span>
            <span className="h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
              <span
                className={`block h-full rounded-full ${item.direct ? "bg-[#e5484d]" : "bg-[#fbc4c4]"}`}
                style={{ width: `${Math.max(8, ((item.direct + item.support / 2) / top) * 100)}%` }}
              />
            </span>
            <span className="text-right text-xs tabular text-muted">
              {item.direct ? `${item.direct} ${item.direct === 1 ? "serie" : "series"}` : `apoyo en ${item.support}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function buzz() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([160, 80, 160, 80, 280]);
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
