import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, EmptyState, InlineError, Kicker, Page } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import { startSession } from "@/lib/api";
import { humanError } from "@/lib/errors";
import {
  addIsoDays,
  formatClock,
  formatKg,
  formatLongDate,
  formatMediumDate,
  formatMinutes,
  formatSignedKg,
  santiagoDate,
  santiagoWeekday,
  startOfIsoWeek,
  WEEKDAY_LABELS,
} from "@/lib/format";
import { countInWeek, plannedDayIdsForDate, sessionDurationMs, trainingStreak, weightGoalRatio } from "@/lib/metrics";
import type { PlanDay } from "@/lib/types";
import { WeightChart, type WeightPoint } from "@/features/progress/charts";
import { useActivePlan, useCardio, useEntries, useGoals, useHistory, useOpenSession, useOverrides, useWeights } from "@/features/use-data";

export function HomeScreen() {
  const { profile, plans, plan, today } = useActivePlan();
  const open = useOpenSession();
  const weights = useWeights();
  const history = useHistory();
  const entries = useEntries();
  const goals = useGoals();
  const cardio = useCardio();
  const overrides = useOverrides();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const loading = profile.isLoading || plans.isLoading || weights.isLoading || history.isLoading;
  if (loading) return <ScreenSkeleton />;
  const error = profile.error ?? plans.error ?? weights.error ?? history.error;
  if (error) return <Page><InlineError message={humanError(error)} onRetry={() => void profile.refetch()} /></Page>;

  const name = profile.data?.display_name || "atleta";
  const weekday = santiagoWeekday();
  const day = resolveToday(plan?.days ?? [], overrides.data ?? [], today, weekday);
  const sortedWeights = [...(weights.data ?? [])].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const firstWeight = sortedWeights[0] ? Number(sortedWeights[0].weight_kg) : null;
  const currentWeight = sortedWeights.at(-1) ? Number(sortedWeights.at(-1)?.weight_kg) : null;
  const weightGoal = goals.data?.find((item) => item.goal_type === "body_weight");
  const target = weightGoal ? Number(weightGoal.target_value) : null;
  const sessions = (history.data ?? []).filter((item) => item.status === "completed");
  const sessionDates = sessions.map((item) => santiagoDate(item.started_at));
  const strengthDays = (plan?.days ?? []).filter((item) => item.day_kind === "strength");
  const weeklyTarget = goals.data?.find((item) => item.goal_type === "weekly_workouts");
  const trainedThisWeek = countInWeek(sessionDates, today);
  const streak = trainingStreak({
    today,
    days: plan?.days ?? [],
    completedDates: sessionDates,
    overrides: (overrides.data ?? []).map((item) => ({ plan_day_id: item.plan_day_id, from_date: item.from_date, to_date: item.to_date })),
  });
  const totalSeconds = sessions.reduce((sum, item) => sum + sessionDurationMs(item) / 1000, 0);
  const last = sessions[0];
  const points = weightPoints(sortedWeights, today);
  const openSession = open.data;

  async function begin(selected: PlanDay | null) {
    setPending(true);
    try {
      const session = openSession && (openSession.status === "active" || openSession.status === "paused")
        ? openSession
        : await startSession(plan, selected);
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
        <Kicker>{formatLongDate()}</Kicker>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Hola, {name}</h1>
        <p className="mt-2 text-sm text-muted">
          {day ? `${WEEKDAY_LABELS[day.weekday]} · ${day.label}` : "Sin rutina activa"}
        </p>
      </header>

      <section className="border-t border-line pt-5">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Tu entrenamiento de hoy</p>
        <h2 className="mt-2 text-2xl font-semibold">{day?.day_kind === "strength" ? day.label : "Día libre"}</h2>
        {day?.day_kind === "strength" ? (
          <p className="mt-1 text-sm text-muted">{day.exercises.length} ejercicios</p>
        ) : (
          <p className="mt-1 text-sm leading-6 text-muted">Puedes registrar cardio, descansar o hacer una sesión fuera del plan.</p>
        )}
        <Button className="mt-5 w-full" size="lg" disabled={pending} onClick={() => void begin(day?.day_kind === "strength" ? day : null)}>
          {pending ? "Abriendo" : openSession ? "Continuar entrenamiento" : "Comenzar entrenamiento"}
        </Button>
        {day?.day_kind !== "strength" ? (
          <Link className="mt-3 block text-center text-sm text-lime" to="/calendario">Registrar cardio</Link>
        ) : null}
      </section>

      <section>
        <dl className="grid grid-cols-2 gap-x-6 border-t border-line">
          <Stat label="Peso" value={currentWeight == null ? "Sin registro" : formatKg(currentWeight)} detail={currentWeight != null && firstWeight != null ? formatSignedKg(currentWeight - firstWeight) : "Desde el inicio"} />
          <Stat label="Esta semana" value={`${trainedThisWeek}`} detail={weeklyTarget ? `de ${Number(weeklyTarget.target_value)} entrenos` : "entrenos"} />
          <Stat label="Racha" value={`${streak}`} detail={streak === 1 ? "día de fuerza" : "días de fuerza"} />
          <Stat label="Tiempo total" value={formatMinutes(totalSeconds)} detail={cardio.data?.length ? `${cardio.data.length} cardio` : "Sesiones hechas"} />
        </dl>
        {last ? (
          <p className="mt-4 text-sm text-muted">
            Último entrenamiento: {last.title}, {formatMediumDate(last.started_at)}, {formatClock(sessionDurationMs(last))}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">Todavía no registras un entrenamiento.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Peso</h2>
        {points.length > 0 ? <div className="mt-3"><WeightChart points={points} /></div> : <EmptyState title="Sin pesajes" body="Cuando anotes tu peso, el gráfico muestra solo esos registros." />}
        {currentWeight != null && firstWeight != null && target != null ? (
          <GoalLine start={firstWeight} current={currentWeight} target={target} />
        ) : null}
        {entries.isError ? <p className="mt-3 text-sm text-danger">{humanError(entries.error)}</p> : null}
        {strengthDays.length === 0 && plan ? <p className="mt-3 text-sm text-muted">Tu rutina activa no tiene días de fuerza.</p> : null}
      </section>
    </Page>
  );
}

function resolveToday(days: PlanDay[], overrides: Array<{ plan_day_id: string; from_date: string; to_date: string }>, today: string, weekday: number) {
  const ids = plannedDayIdsForDate(today, days, overrides);
  const moved = days.find((day) => ids.includes(day.id));
  if (moved) return moved;
  return days.find((day) => day.weekday === weekday) ?? null;
}

function weightPoints(weights: Array<{ logged_at: string; weight_kg: number }>, today: string): WeightPoint[] {
  const from = addIsoDays(today, -84);
  const recent = weights.filter((item) => santiagoDate(item.logged_at) >= from);
  const buckets = new Map<string, number[]>();
  for (const item of recent) {
    const week = startOfIsoWeek(santiagoDate(item.logged_at));
    const list = buckets.get(week) ?? [];
    list.push(Number(item.weight_kg));
    buckets.set(week, list);
  }
  return recent.map((item) => {
    const week = startOfIsoWeek(santiagoDate(item.logged_at));
    const values = buckets.get(week) ?? [];
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { label: formatMediumDate(item.logged_at), weight: Number(item.weight_kg), average };
  });
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-line py-4">
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular">{value}</dd>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}

function GoalLine({ start, current, target }: { start: number; current: number; target: number }) {
  const ratio = weightGoalRatio(start, current, target);
  const reached = start >= target ? current <= target : current >= target;
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>Meta {formatKg(target)}</span>
        <span className="tabular text-muted">{reached ? "Llegaste a la meta de peso" : `Faltan ${formatKg(Math.abs(current - target))}`}</span>
      </div>
      <div className="mt-2 h-1.5 bg-surface" aria-hidden>
        <div className="h-full bg-lime" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}
