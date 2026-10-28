import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { ScreenSkeleton } from "@/components/shell";
import { Button, EmptyState, InlineError, Kicker, Page, Sheet, TextField } from "@/components/ui";
import { ExerciseMotion } from "@/components/exercise-motion";
import { movePlanDay, saveCardio, startSession } from "@/lib/api";
import { previousAdvice, type AdviceEntry } from "@/lib/advice";
import { humanError } from "@/lib/errors";
import {
  formatKg,
  formatLongDate,
  formatMediumDate,
  formatMinutes,
  isoWeekday,
  monthGrid,
  monthTitle,
  santiagoDate,
  shiftMonth,
  weekdayShort,
} from "@/lib/format";
import { effectiveSets, plannedDayIdsForDate, sessionDurationMs, volumeOf } from "@/lib/metrics";
import { newId } from "@/lib/utils";
import type { CardioSession, PlanDay, PlanExercise, SessionExercise, SessionTree, WorkoutSet } from "@/lib/types";
import { useAuth } from "@/features/auth-context";
import {
  useActivePlan,
  useCardio,
  useEntries,
  useHistory,
  useMeasurements,
  useOverrides,
  useWeights,
} from "@/features/use-data";

type OverrideRow = { plan_day_id: string; from_date: string; to_date: string };

export function CalendarScreen() {
  const { user } = useAuth();
  const { profile, plan, today } = useActivePlan();
  const history = useHistory();
  const entries = useEntries();
  const cardio = useCardio();
  const weights = useWeights();
  const measurements = useMeasurements();
  const overrides = useOverrides();
  const navigate = useNavigate();

  const anchor = useMemo(() => parseMonth(today), [today]);
  const [year, setYear] = useState(anchor.year);
  const [month, setMonth] = useState(anchor.month);
  const [selected, setSelected] = useState<string>(today);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [cardioDistance, setCardioDistance] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [pending, setPending] = useState(false);

  const loading =
    profile.isLoading || history.isLoading || entries.isLoading || cardio.isLoading || weights.isLoading || measurements.isLoading || overrides.isLoading;
  if (loading) return <ScreenSkeleton />;
  const error =
    profile.error ?? history.error ?? entries.error ?? cardio.error ?? weights.error ?? measurements.error ?? overrides.error;
  if (error) {
    return (
      <Page>
        <InlineError message={humanError(error)} onRetry={() => void history.refetch()} />
      </Page>
    );
  }

  const overrideRows: OverrideRow[] = (overrides.data ?? []).map((item) => ({
    plan_day_id: item.plan_day_id,
    from_date: item.from_date,
    to_date: item.to_date,
  }));
  const days = plan?.days ?? [];
  const sessions = (history.data ?? []).filter((item) => item.status === "completed");
  const sessionsByDate = groupBy(sessions, (item) => santiagoDate(item.started_at));
  const cardioByDate = groupBy(cardio.data ?? [], (item) => santiagoDate(item.started_at));
  const measureDates = new Set<string>();
  for (const row of weights.data ?? []) measureDates.add(santiagoDate(row.logged_at));
  for (const row of measurements.data ?? []) measureDates.add(santiagoDate(row.measured_at));

  const strengthFor = (iso: string) =>
    plannedDayIdsForDate(iso, days, overrideRows)
      .map((id) => days.find((day) => day.id === id && day.day_kind === "strength"))
      .filter((day): day is PlanDay => Boolean(day));

  const cells = monthGrid(year, month);
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthSessions = sessions.filter((item) => santiagoDate(item.started_at).startsWith(monthKey));
  const monthMs = monthSessions.reduce((sum, item) => sum + sessionDurationMs(item), 0);

  const selectedSessions = sessionsByDate.get(selected) ?? [];
  const selectedCardio = cardioByDate.get(selected) ?? [];
  const plannedStrength = strengthFor(selected);

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  function goToday() {
    setYear(anchor.year);
    setMonth(anchor.month);
    setSelected(today);
  }

  async function registerCardio() {
    if (!user) return;
    const minutes = Number(cardioMinutes.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes < 1) {
      toast.error("Indica los minutos de cardio.");
      return;
    }
    const distanceRaw = cardioDistance.trim();
    const distance = distanceRaw ? Number(distanceRaw.replace(",", ".")) : null;
    if (distanceRaw && (!Number.isFinite(distance) || distance! < 0)) {
      toast.error("La distancia debe ser un número válido en metros.");
      return;
    }
    setPending(true);
    try {
      const id = newId();
      const row: CardioSession = {
        id,
        user_id: user.id,
        client_id: id,
        exercise_id: null,
        activity_name: "Cardio",
        started_at: selected === today ? new Date().toISOString() : `${selected}T12:00:00`,
        duration_seconds: Math.round(minutes * 60),
        distance_m: distance,
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: "",
      };
      await saveCardio(row, "insert");
      setCardioMinutes("");
      setCardioDistance("");
      setMoreOpen(false);
      toast.success("Cardio registrado");
      await cardio.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  async function moveTraining() {
    if (plannedStrength.length === 0 || !moveDate) {
      toast.error("Elige la nueva fecha.");
      return;
    }
    if (moveDate === selected) {
      toast.error("Elige un día distinto.");
      return;
    }
    setPending(true);
    try {
      await movePlanDay(plannedStrength[0].id, selected, moveDate);
      setMoveDate("");
      setMoreOpen(false);
      toast.success("Entrenamiento movido en el plan");
      await overrides.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  async function freeWorkout() {
    if (!plan) {
      toast.error("Necesitas una rutina activa.");
      return;
    }
    setPending(true);
    try {
      const session = await startSession(plan, null);
      navigate(`/sesion/${session.id}`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page className="gap-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Kicker>Calendario</Kicker>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {monthTitle(year, month).split(" de ")[0]} <span className="text-faint tabular">{year}</span>
          </h1>
          <p className="mt-1 text-sm text-muted tabular">
            {monthSessions.length === 0
              ? "Sin entrenos este mes"
              : `${monthSessions.length} ${monthSessions.length === 1 ? "entreno" : "entrenos"} · ${formatMinutes(monthMs / 1000)}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform active:scale-90 hover:bg-raised" aria-label="Mes anterior" onClick={() => goMonth(-1)}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" className="h-9 rounded-full bg-raised px-3 text-xs font-semibold transition-transform active:scale-95" onClick={goToday}>
            Hoy
          </button>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-foreground transition-transform active:scale-90 hover:bg-raised" aria-label="Mes siguiente" onClick={() => goMonth(1)}>
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </header>

      <section aria-label="Días del mes">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          {[1, 2, 3, 4, 5, 6, 7].map((index) => (
            <span key={index} className="pb-2">{weekdayShort(index).slice(0, 2)}</span>
          ))}
        </div>
        <div key={monthKey} className="enter grid grid-cols-7 gap-y-1">
          {cells.map((iso, index) => {
            if (!iso) return <div key={`empty-${index}`} className="h-12" aria-hidden />;
            const done = (sessionsByDate.get(iso)?.length ?? 0) > 0;
            const isToday = iso === today;
            const planned = !done && iso >= today && strengthFor(iso).length > 0;
            const extra = (cardioByDate.get(iso)?.length ?? 0) > 0 || measureDates.has(iso);
            const isSelected = iso === selected;
            const tone = done
              ? "bg-lime text-white"
              : isToday
                ? "bg-[#d9e2ee] text-foreground"
                : iso < today
                  ? "text-faint"
                  : "text-foreground";
            return (
              <button
                key={iso}
                type="button"
                className="group relative flex h-12 flex-col items-center justify-center"
                aria-pressed={isSelected}
                aria-label={`${formatLongDate(iso)}${done ? ", entrenado" : ""}${isToday ? ", hoy" : ""}${planned ? ", entreno planificado" : ""}`}
                onClick={() => setSelected(iso)}
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full text-[15px] font-semibold tabular transition-[transform,box-shadow] duration-200 group-active:scale-90 ${tone} ${
                    isSelected ? "shadow-[0_0_0_2px_#f3f6fb,0_0_0_4px_#1d4ed8]" : ""
                  } ${done && isToday ? "outline-2 outline-offset-2 outline-[#b9c6d8]" : ""}`}
                >
                  {Number(iso.slice(-2))}
                </span>
                <span className="absolute bottom-0 flex h-1.5 gap-0.5" aria-hidden>
                  {planned ? <span className="h-1.5 w-1.5 rounded-full bg-lime/70" /> : null}
                  {extra ? <span className="h-1.5 w-1.5 rounded-full border border-muted" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-lime" aria-hidden />Entrenado</li>
          <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#d9e2ee]" aria-hidden />Hoy</li>
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-lime/70" aria-hidden />Toca entrenar</li>
          <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full border border-muted" aria-hidden />Cardio o medida</li>
        </ul>
      </section>

      <DayPanel
        key={selected}
        iso={selected}
        today={today}
        sessions={selectedSessions}
        cardioRows={selectedCardio}
        hasMeasure={measureDates.has(selected)}
        planned={plannedStrength}
        restDay={isRestDay(selected, days, overrideRows)}
        entries={entries.data ?? []}
        onMore={() => setMoreOpen(true)}
      />

      {!plan ? (
        <EmptyState title="Sin rutina activa" body="Activa una rutina para ver días de fuerza y descanso en el calendario." />
      ) : null}

      <Sheet open={moreOpen} title={formatLongDate(selected)} onClose={() => setMoreOpen(false)}>
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="font-semibold">Registrar cardio</h3>
            <div className="mt-3 flex flex-col gap-3">
              <TextField label="Minutos" name="cardio-minutes" inputMode="decimal" value={cardioMinutes} onChange={(event) => setCardioMinutes(event.target.value)} placeholder="Ej. 30" />
              <TextField label="Distancia (m, opcional)" name="cardio-distance" inputMode="decimal" value={cardioDistance} onChange={(event) => setCardioDistance(event.target.value)} />
              <Button type="button" size="lg" disabled={pending} onClick={() => void registerCardio()}>
                {pending ? "Guardando" : "Guardar cardio"}
              </Button>
            </div>
          </section>
          {plannedStrength.length > 0 ? (
            <section className="border-t border-line pt-4">
              <h3 className="font-semibold">Mover {plannedStrength[0].label}</h3>
              <label className="mt-3 block text-sm text-muted">
                Nueva fecha
                <input type="date" className="mt-2 h-14 w-full rounded-2xl border border-line bg-background px-4" value={moveDate} onChange={(event) => setMoveDate(event.target.value)} />
              </label>
              <Button type="button" className="mt-3 w-full" variant="surface" size="lg" disabled={pending} onClick={() => void moveTraining()}>
                {pending ? "Moviendo" : "Mover día"}
              </Button>
            </section>
          ) : null}
          <Button type="button" variant="ghost" size="lg" className="w-full" disabled={pending} onClick={() => void freeWorkout()}>
            Empezar entrenamiento libre
          </Button>
        </div>
      </Sheet>
    </Page>
  );
}

function DayPanel({
  iso,
  today,
  sessions,
  cardioRows,
  hasMeasure,
  planned,
  restDay,
  entries,
  onMore,
}: {
  iso: string;
  today: string;
  sessions: SessionTree[];
  cardioRows: CardioSession[];
  hasMeasure: boolean;
  planned: PlanDay[];
  restDay: boolean;
  entries: AdviceEntry[];
  onMore: () => void;
}) {
  const upcoming = sessions.length === 0 && iso >= today ? planned[0] ?? null : null;
  const missed = sessions.length === 0 && iso < today ? planned[0] ?? null : null;
  const status = sessions.length > 0 ? "Entrenado" : iso === today ? "Hoy" : upcoming ? "Toca entrenar" : restDay ? "Descanso" : null;
  return (
    <section className="enter border-t border-line pt-5" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight first-letter:uppercase">{formatLongDate(iso)}</h2>
        {status ? (
          <span className={`shrink-0 text-xs font-semibold ${sessions.length > 0 ? "text-lime" : "text-muted"}`}>{status}</span>
        ) : null}
      </div>

      {sessions.map((session) => <DoneSession key={session.id} session={session} />)}

      {upcoming ? <PlannedDay day={upcoming} entries={entries} isToday={iso === today} /> : null}

      {missed ? <p className="mt-3 text-sm text-muted">Tocaba {missed.label}. No quedó registrado.</p> : null}

      {cardioRows.length > 0 ? (
        <ul className="mt-4">
          {cardioRows.map((row) => (
            <li key={row.id} className="flex justify-between border-b border-line py-2 text-sm">
              <span>Cardio · {row.activity_name}</span>
              <span className="tabular text-muted">
                {formatMinutes(row.duration_seconds)}
                {row.distance_m != null ? ` · ${Math.round(Number(row.distance_m))} m` : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasMeasure ? <p className="mt-3 text-sm text-muted">Registraste peso o medidas este día.</p> : null}

      {sessions.length === 0 && !upcoming && !missed && cardioRows.length === 0 && !hasMeasure ? (
        <p className="mt-3 text-sm text-muted">{restDay ? "Día libre. Recuperar también cuenta." : "Nada registrado este día."}</p>
      ) : null}

      <button type="button" className="mt-4 h-11 text-sm font-semibold text-lime" onClick={onMore}>
        Registrar cardio, mover o entreno libre
      </button>
    </section>
  );
}

function DoneSession({ session }: { session: SessionTree }) {
  const blocks = session.exercises.filter((block) => !block.replaced);
  const sets = blocks.flatMap((block) => block.sets);
  const volume = volumeOf(sets);
  return (
    <article className="mt-3">
      <p className="font-semibold">{session.title}</p>
      <dl className="mt-3 grid grid-cols-3 border-y border-line">
        <Stat label="Duración" value={formatMinutes(sessionDurationMs(session) / 1000)} />
        <Stat label="Series" value={String(effectiveSets(sets).length)} />
        <Stat label="Volumen" value={volume > 0 ? formatKg(Math.round(volume)) : "—"} />
      </dl>
      {session.notes ? <Note text={session.notes} /> : null}
      <ol className="mt-2">
        {blocks.map((block, index) => <DoneExercise key={block.id} block={block} index={index} />)}
      </ol>
      <Button asChild variant="surface" size="lg" className="mt-3 w-full">
        <Link to={`/sesion/${session.id}`}>Abrir sesión completa</Link>
      </Button>
    </article>
  );
}

function DoneExercise({ block, index }: { block: SessionExercise; index: number }) {
  const done = block.sets.filter((set) => set.completed_at && !set.is_warmup);
  return (
    <li className="enter flex gap-3 border-b border-line py-3 last:border-b-0" style={{ "--i": index } as CSSProperties}>
      <ExerciseMotion slug={block.exercise.slug} name={block.exercise.name} muscle={block.exercise.muscle_group} labelled={false} className="aspect-[3/2] w-20 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="leading-5 font-semibold">{block.exercise.name}</p>
        <p className="text-xs text-faint">{block.exercise.equipment}</p>
        {done.length > 0 ? (
          <p className="mt-1 text-sm tabular">{done.map(setLabel).join(" · ")}</p>
        ) : (
          <p className="mt-1 text-sm text-faint">Sin series marcadas</p>
        )}
        {block.notes ? <Note text={block.notes} /> : null}
      </div>
    </li>
  );
}

function PlannedDay({ day, entries, isToday }: { day: PlanDay; entries: AdviceEntry[]; isToday: boolean }) {
  return (
    <div className="mt-3">
      <p className="font-semibold">{day.label}</p>
      <p className="text-sm text-muted">Lo que toca y con cuánto partir según tu última vez.</p>
      <ol className="mt-2">
        {day.exercises.map((item, index) => <PlannedExercise key={item.id} item={item} entries={entries} index={index} />)}
      </ol>
      {isToday ? (
        <Button asChild size="lg" className="mt-3 w-full">
          <Link to="/">Ir a entrenar</Link>
        </Button>
      ) : null}
    </div>
  );
}

function PlannedExercise({ item, entries, index }: { item: PlanExercise; entries: AdviceEntry[]; index: number }) {
  const cardio = item.exercise.tracking_type === "distance";
  const advice = cardio ? null : previousAdvice(entries, item.exercise_id, "", { min: item.target_reps_min, max: item.target_reps_max }, item.exercise.equipment);
  return (
    <li className="enter flex gap-3 border-b border-line py-3 last:border-b-0" style={{ "--i": index } as CSSProperties}>
      <ExerciseMotion slug={item.exercise.slug} name={item.exercise.name} muscle={item.exercise.muscle_group} labelled={false} className="aspect-[3/2] w-20 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="leading-5 font-semibold">{item.exercise.name}</p>
          <span className="shrink-0 text-sm font-semibold tabular text-lime">{prescription(item)}</span>
        </div>
        <p className="text-xs text-faint">{item.exercise.equipment}</p>
        {cardio ? null : advice ? (
          <>
            <p className="mt-1 text-sm tabular">
              Última vez ({formatMediumDate(advice.date)}): {advice.weight != null ? `${formatKg(advice.weight)} × ` : ""}{advice.reps.join(", ")}
            </p>
            <p className="text-sm font-semibold">
              {advice.nextWeight == null
                ? advice.suggestion
                : advice.weight != null && advice.nextWeight > advice.weight
                  ? `Ponle ${formatKg(advice.nextWeight)}: llegaste al tope la vez anterior.`
                  : `Ponle ${formatKg(advice.nextWeight)} y busca ${item.target_reps_max ?? item.target_reps_min} en todas las series.`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Primera vez: elige un peso que te deje 3 o 4 repeticiones en reserva.</p>
        )}
        {item.notes ? <p className="mt-1 text-xs leading-4 text-muted">{item.notes}</p> : null}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="text-lg font-semibold tabular">{value}</dd>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p className="mt-2 flex gap-1.5 text-sm leading-5 text-muted">
      <MessageSquareText size={15} className="mt-0.5 shrink-0 text-lime" aria-hidden />
      <span className="italic">{text}</span>
    </p>
  );
}

function setLabel(set: WorkoutSet) {
  if (set.duration_seconds && set.reps == null) return set.duration_seconds >= 120 ? `${Math.round(set.duration_seconds / 60)} min` : `${set.duration_seconds} s`;
  if (set.weight_kg != null && set.reps != null) return `${formatKg(set.weight_kg)} × ${set.reps}`;
  if (set.reps != null) return `${set.reps} reps`;
  return "hecha";
}

function prescription(item: PlanExercise) {
  if (item.exercise.tracking_type === "distance" && item.target_seconds) return `${Math.round(item.target_seconds / 60)} min`;
  if (item.target_seconds) return `${item.target_sets}×${item.target_seconds} s`;
  const reps = item.target_reps_min && item.target_reps_max && item.target_reps_min !== item.target_reps_max
    ? `${item.target_reps_min}–${item.target_reps_max}`
    : `${item.target_reps_min ?? item.target_reps_max ?? ""}`;
  return `${item.target_sets}×${reps}`;
}

function isRestDay(iso: string, days: PlanDay[], overrideRows: OverrideRow[]) {
  const weekday = isoWeekday(iso);
  const movedAway = new Set(overrideRows.filter((item) => item.from_date === iso).map((item) => item.plan_day_id));
  return days.some((day) => day.weekday === weekday && day.day_kind === "rest" && !movedAway.has(day.id));
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

function parseMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}
