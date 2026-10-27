import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ScreenSkeleton } from "@/components/shell";
import { Button, EmptyState, InlineError, Kicker, Page, Sheet, TextField } from "@/components/ui";
import { movePlanDay, saveCardio, startSession } from "@/lib/api";
import { humanError } from "@/lib/errors";
import {
  formatClock,
  formatLongDate,
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
import type { CardioSession, PlanDay, SessionTree } from "@/lib/types";
import { useAuth } from "@/features/auth-context";
import {
  useActivePlan,
  useCardio,
  useHistory,
  useMeasurements,
  useOverrides,
  useWeights,
} from "@/features/use-data";

type DayTag = "Hecho" | "Cardio" | "Medición" | "Descanso" | "Pendiente";

export function CalendarScreen() {
  const { user } = useAuth();
  const { profile, plan, today } = useActivePlan();
  const history = useHistory();
  const cardio = useCardio();
  const weights = useWeights();
  const measurements = useMeasurements();
  const overrides = useOverrides();
  const navigate = useNavigate();

  const anchor = useMemo(() => parseMonth(today), [today]);
  const [year, setYear] = useState(anchor.year);
  const [month, setMonth] = useState(anchor.month);
  const [selected, setSelected] = useState<string | null>(null);
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [cardioDistance, setCardioDistance] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [pending, setPending] = useState(false);

  const loading =
    profile.isLoading || history.isLoading || cardio.isLoading || weights.isLoading || measurements.isLoading || overrides.isLoading;
  if (loading) return <ScreenSkeleton />;
  const error =
    profile.error ?? history.error ?? cardio.error ?? weights.error ?? measurements.error ?? overrides.error;
  if (error) {
    return (
      <Page>
        <InlineError message={humanError(error)} onRetry={() => void history.refetch()} />
      </Page>
    );
  }

  const overrideRows = (overrides.data ?? []).map((item) => ({
    plan_day_id: item.plan_day_id,
    from_date: item.from_date,
    to_date: item.to_date,
  }));
  const days = plan?.days ?? [];
  const sessions = (history.data ?? []).filter((item) => item.status === "completed");
  const sessionsByDate = groupByDate(sessions.map((item) => ({ iso: santiagoDate(item.started_at), session: item })));
  const cardioByDate = groupCardio(cardio.data ?? []);
  const measureDates = new Set<string>();
  for (const row of weights.data ?? []) measureDates.add(santiagoDate(row.logged_at));
  for (const row of measurements.data ?? []) measureDates.add(santiagoDate(row.measured_at));

  const cells = monthGrid(year, month);
  const selectedSessions = selected ? sessionsByDate.get(selected) ?? [] : [];
  const selectedCardio = selected ? cardioByDate.get(selected) ?? [] : [];
  const plannedStrength = selected
    ? plannedDayIdsForDate(selected, days, overrideRows)
        .map((id) => days.find((day) => day.id === id && day.day_kind === "strength"))
        .filter((day): day is PlanDay => Boolean(day))
    : [];

  async function registerCardio() {
    if (!user || !selected) return;
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
      const started_at = selected === today ? new Date().toISOString() : `${selected}T12:00:00`;
      const row: CardioSession = {
        id,
        user_id: user.id,
        client_id: id,
        exercise_id: null,
        activity_name: "Cardio",
        started_at,
        duration_seconds: Math.round(minutes * 60),
        distance_m: distance,
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: "",
      };
      await saveCardio(row, "insert");
      setCardioMinutes("");
      setCardioDistance("");
      toast.success("Cardio registrado");
      await cardio.refetch();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  async function moveTraining() {
    if (!selected || plannedStrength.length === 0 || !moveDate) {
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
      setSelected(null);
      navigate(`/sesion/${session.id}`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page>
      <header>
        <Kicker>Calendario</Kicker>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{monthTitle(year, month)}</h1>
      </header>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => {
            const next = shiftMonth(year, month, -1);
            setYear(next.year);
            setMonth(next.month);
          }}
        >
          Mes anterior
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => {
            const now = parseMonth(today);
            setYear(now.year);
            setMonth(now.month);
          }}
        >
          Hoy
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => {
            const next = shiftMonth(year, month, 1);
            setYear(next.year);
            setMonth(next.month);
          }}
        >
          Mes siguiente
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-faint">
        {[1, 2, 3, 4, 5, 6, 7].map((index) => (
          <span key={index} className="py-2">
            {weekdayShort(index)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, index) => {
          if (!iso) return <div key={`empty-${index}`} className="min-h-16" aria-hidden />;
          const tags = dayTags(iso, {
            today,
            days,
            overrideRows,
            sessionsByDate,
            cardioByDate,
            measureDates,
          });
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              className={`min-h-16 rounded-xl border px-1 py-2 text-left ${isToday ? "border-lime" : "border-line"} bg-surface`}
              onClick={() => setSelected(iso)}
            >
              <span className="block text-sm font-semibold tabular">{Number(iso.slice(-2))}</span>
              <span className="mt-1 block text-[10px] leading-tight text-muted">{tags.join(" · ") || "—"}</span>
            </button>
          );
        })}
      </div>

      <Legend />

      {!plan ? (
        <EmptyState title="Sin rutina activa" body="Activa una rutina para ver días de fuerza y descanso en el calendario." />
      ) : null}

      <Sheet open={selected != null} title={selected ? formatLongDate(selected) : ""} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="flex flex-col gap-6">
            <DaySummary
              sessions={selectedSessions}
              cardioRows={selectedCardio}
              hasMeasure={measureDates.has(selected)}
              planned={plannedStrength}
            />

            {selectedSessions[0] ? (
              <Button asChild size="lg" className="w-full">
                <Link to={`/sesion/${selectedSessions[0].id}`} onClick={() => setSelected(null)}>
                  Ver sesión
                </Link>
              </Button>
            ) : null}

            <section className="border-t border-line pt-4">
              <h3 className="font-semibold">Registrar cardio</h3>
              <div className="mt-3 flex flex-col gap-3">
                <TextField
                  label="Minutos"
                  name="cardio-minutes"
                  inputMode="decimal"
                  value={cardioMinutes}
                  onChange={(event) => setCardioMinutes(event.target.value)}
                  placeholder="Ej. 30"
                />
                <TextField
                  label="Distancia (m, opcional)"
                  name="cardio-distance"
                  inputMode="decimal"
                  value={cardioDistance}
                  onChange={(event) => setCardioDistance(event.target.value)}
                />
                <Button type="button" size="lg" disabled={pending} onClick={() => void registerCardio()}>
                  {pending ? "Guardando" : "Guardar cardio"}
                </Button>
              </div>
            </section>

            {plannedStrength.length > 0 ? (
              <section className="border-t border-line pt-4">
                <h3 className="font-semibold">Mover entrenamiento</h3>
                <p className="mt-1 text-sm text-muted">{plannedStrength[0].label}</p>
                <label className="mt-3 block text-sm text-muted">
                  Nueva fecha
                  <input
                    type="date"
                    className="mt-2 h-14 w-full rounded-2xl border border-line bg-background px-4"
                    value={moveDate}
                    onChange={(event) => setMoveDate(event.target.value)}
                  />
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
        ) : null}
      </Sheet>
    </Page>
  );
}

function DaySummary({
  sessions,
  cardioRows,
  hasMeasure,
  planned,
}: {
  sessions: SessionTree[];
  cardioRows: CardioSession[];
  hasMeasure: boolean;
  planned: PlanDay[];
}) {
  return (
    <div className="space-y-3 text-sm">
      {sessions.map((session) => {
        const sets = session.exercises.flatMap((block) => block.sets);
        const volume = volumeOf(sets);
        return (
          <div key={session.id} className="border-b border-line pb-3">
            <p className="font-semibold">Hecho · {session.title}</p>
            <p className="text-muted">
              {formatClock(sessionDurationMs(session))} · {effectiveSets(sets).length} series
              {volume > 0 ? ` · ${Math.round(volume).toLocaleString("es-CL")} kg·reps` : null}
            </p>
          </div>
        );
      })}
      {cardioRows.map((row) => (
        <div key={row.id} className="border-b border-line pb-3">
          <p className="font-semibold">Cardio · {row.activity_name}</p>
          <p className="text-muted">
            {formatMinutes(row.duration_seconds)}
            {row.distance_m != null ? ` · ${Math.round(Number(row.distance_m))} m` : null}
          </p>
        </div>
      ))}
      {hasMeasure ? <p className="text-muted">Medición registrada</p> : null}
      {planned.map((day) => (
        <p key={day.id} className="text-muted">
          Planificado: {day.label}
        </p>
      ))}
      {sessions.length === 0 && cardioRows.length === 0 && !hasMeasure && planned.length === 0 ? (
        <p className="text-muted">Nada registrado este día.</p>
      ) : null}
    </div>
  );
}

function Legend() {
  const items: DayTag[] = ["Hecho", "Cardio", "Medición", "Descanso", "Pendiente"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line py-4 text-xs text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function dayTags(
  iso: string,
  ctx: {
    today: string;
    days: PlanDay[];
    overrideRows: Array<{ plan_day_id: string; from_date: string; to_date: string }>;
    sessionsByDate: Map<string, SessionTree[]>;
    cardioByDate: Map<string, CardioSession[]>;
    measureDates: Set<string>;
  },
): DayTag[] {
  const tags: DayTag[] = [];
  if ((ctx.sessionsByDate.get(iso)?.length ?? 0) > 0) tags.push("Hecho");
  if ((ctx.cardioByDate.get(iso)?.length ?? 0) > 0) tags.push("Cardio");
  if (ctx.measureDates.has(iso)) tags.push("Medición");

  const strengthIds = plannedDayIdsForDate(iso, ctx.days, ctx.overrideRows).filter((id) => {
    const day = ctx.days.find((item) => item.id === id);
    return day?.day_kind === "strength";
  });
  const hasSession = (ctx.sessionsByDate.get(iso)?.length ?? 0) > 0;
  if (iso >= ctx.today && strengthIds.length > 0 && !hasSession) tags.push("Pendiente");

  if (tags.length === 0) {
    const weekday = isoWeekday(iso);
    const movedAway = new Set(ctx.overrideRows.filter((item) => item.from_date === iso).map((item) => item.plan_day_id));
    const restDay = ctx.days.some((day) => day.weekday === weekday && day.day_kind === "rest" && !movedAway.has(day.id));
    if (restDay) tags.push("Descanso");
  }
  return tags;
}

function groupByDate(items: Array<{ iso: string; session: SessionTree }>) {
  const map = new Map<string, SessionTree[]>();
  for (const item of items) {
    const list = map.get(item.iso) ?? [];
    list.push(item.session);
    map.set(item.iso, list);
  }
  return map;
}

function groupCardio(rows: CardioSession[]) {
  const map = new Map<string, CardioSession[]>();
  for (const row of rows) {
    const iso = santiagoDate(row.started_at);
    const list = map.get(iso) ?? [];
    list.push(row);
    map.set(iso, list);
  }
  return map;
}

function parseMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m };
}
