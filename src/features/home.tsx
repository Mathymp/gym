import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Dumbbell, Play, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button, EmptyState, InlineError, Page, Sheet } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import { startSession, swapPlanDays } from "@/lib/api";
import { humanError } from "@/lib/errors";
import {
  addIsoDays,
  formatKg,
  formatLongDate,
  formatMediumDate,
  formatMinutes,
  santiagoDate,
  santiagoWeekday,
  startOfIsoWeek,
  WEEKDAY_LABELS,
} from "@/lib/format";
import { countInWeek, plannedDayIdsForDate, sessionDurationMs, trainingStreak, weightGoalRatio } from "@/lib/metrics";
import type { PlanDay } from "@/lib/types";
import { WeightChart, type WeightPoint } from "@/features/progress/charts";
import { useActivePlan, useCardio, useGoals, useHistory, useOpenSession, useOverrides, useRefresh, useWeights } from "@/features/use-data";

export function HomeScreen() {
  const { profile, plans, plan, today } = useActivePlan();
  const open = useOpenSession();
  const weights = useWeights();
  const history = useHistory();
  const goals = useGoals();
  const cardio = useCardio();
  const overrides = useOverrides();
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [pending, setPending] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapPending, setSwapPending] = useState(false);

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
  const weekTarget = weeklyTarget ? Number(weeklyTarget.target_value) : strengthDays.length || 4;
  const weekRatio = weekTarget > 0 ? Math.min(1, trainedThisWeek / weekTarget) : 0;
  const weekPercent = Math.round(weekRatio * 100);
  const otherDays = (plan?.days ?? []).filter((item) => item.id !== day?.id);

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

  async function replaceDay(other: PlanDay) {
    if (!plan || !day) return;
    setSwapPending(true);
    try {
      await swapPlanDays(plan, day.id, other.id);
      await refresh();
      setSwapOpen(false);
      toast.success(`Hoy haces ${other.label}. ${day.label} pasa a ${WEEKDAY_LABELS[other.weekday]}.`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setSwapPending(false);
    }
  }

  return (
    <Page className="gap-5 pt-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{formatLongDate()}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hola, {name}</h1>
        </div>
      </header>

      <section className="rounded-[28px] bg-lime px-5 py-5 text-ink shadow-[0_16px_40px_rgba(29,78,216,0.28)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">Progreso de la semana</p>
            <p className="mt-1 text-5xl font-semibold tabular tracking-tight">{weekPercent}%</p>
            <p className="mt-1 text-sm text-white/80">{trainedThisWeek} de {weekTarget} entrenos</p>
          </div>
          <WeekRing ratio={weekRatio} label={`${weekPercent} por ciento de la semana`} />
        </div>
      </section>

      <dl className="grid grid-cols-4 gap-2">
        <Stat label="Peso" value={currentWeight == null ? "—" : formatKg(currentWeight).replace(/\s*kg$/, "")} unit="kg" />
        <Stat label="Semana" value={`${trainedThisWeek}`} unit={weeklyTarget ? `/${weekTarget}` : "días"} />
        <Stat label="Racha" value={`${streak}`} unit={streak === 1 ? "día" : "días"} />
        <Stat label="Tiempo" value={formatMinutes(totalSeconds).replace(/\s*min$/, "").replace(/\s*h$/, "")} unit="min" />
      </dl>

      <section className="rounded-[28px] bg-surface p-4 shadow-[0_10px_30px_rgba(18,32,51,0.06)]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-raised text-lime">
            <Dumbbell size={22} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Hoy</p>
            <h2 className="truncate text-xl font-semibold">{day?.day_kind === "strength" ? day.label : "Día libre"}</h2>
            <p className="text-sm text-muted">
              {day ? WEEKDAY_LABELS[day.weekday] : "Sin rutina"}
              {day?.day_kind === "strength" ? ` · ${day.exercises.length} ejercicios` : " · cardio o descanso"}
            </p>
          </div>
          <button
            type="button"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lime text-ink shadow-[0_10px_24px_rgba(29,78,216,0.28)] disabled:opacity-40"
            aria-label={openSession ? "Continuar entrenamiento" : "Comenzar entrenamiento"}
            disabled={pending}
            onClick={() => void begin(day?.day_kind === "strength" ? day : null)}
          >
            <Play size={22} fill="currentColor" aria-hidden />
          </button>
        </div>
        <Button className="mt-4 w-full" size="lg" disabled={pending} onClick={() => void begin(day?.day_kind === "strength" ? day : null)}>
          {pending ? "Abriendo" : openSession ? "Continuar entrenamiento" : "Comenzar entrenamiento"}
        </Button>
        <Button className="mt-2 w-full" size="lg" variant="surface" disabled={!day || otherDays.length === 0 || swapPending} onClick={() => setSwapOpen(true)}>
          Cambiar este día
        </Button>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">Accesos</h2>
        <div className="grid grid-cols-4 gap-2">
          <Quick to="/entrenar/ejercicios" icon={BookOpen} label="Ejercicios" />
          <Quick to={plan ? `/entrenar/rutina/${plan.id}` : "/entrenar"} icon={Dumbbell} label="Rutina" />
          <Quick to="/progreso/peso" icon={Scale} label="Peso" />
          <Quick to="/calendario" icon={CalendarDays} label="Agenda" />
        </div>
      </section>

      <section className="rounded-[28px] bg-surface p-4 shadow-[0_10px_30px_rgba(18,32,51,0.06)]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Peso</h2>
          {currentWeight != null ? <p className="text-sm tabular text-muted">{formatKg(currentWeight)}</p> : null}
        </div>
        {points.length > 0 ? <div className="mt-2"><WeightChart points={points} /></div> : <EmptyState title="Sin pesajes" body="Cuando anotes tu peso, el gráfico muestra solo esos registros." />}
        {currentWeight != null && firstWeight != null && target != null ? (
          <GoalLine start={firstWeight} current={currentWeight} target={target} />
        ) : null}
        {last ? (
          <p className="mt-3 text-sm text-muted">Último: {last.title}, {formatMediumDate(last.started_at)}</p>
        ) : (
          <p className="mt-3 text-sm text-muted">Todavía no registras un entrenamiento.</p>
        )}
        {cardio.data?.length ? <p className="mt-1 text-sm text-muted">{cardio.data.length} sesiones de cardio</p> : null}
      </section>

      <Sheet open={swapOpen} title="Cambiar el día de hoy" onClose={() => setSwapOpen(false)}>
        <p className="text-sm leading-6 text-muted">
          {day ? `Hoy está ${day.label}. Elige otro día: se intercambian y la rutina queda así para las próximas semanas.` : "No hay un día para mover."}
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {otherDays.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={swapPending}
                className="flex min-h-16 w-full items-center justify-between rounded-2xl bg-raised px-4 text-left disabled:opacity-40"
                onClick={() => void replaceDay(item)}
              >
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="text-sm text-muted">{WEEKDAY_LABELS[item.weekday]} · {item.exercises.length} ejercicios</span>
                </span>
                <span className="text-sm font-semibold text-lime">Usar hoy</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
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

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-surface px-2 py-3 text-center shadow-[0_8px_20px_rgba(18,32,51,0.05)]">
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular leading-none">{value}</dd>
      <p className="mt-1 text-[11px] text-muted">{unit}</p>
    </div>
  );
}

function Quick({ to, icon: Icon, label }: { to: string; icon: typeof Dumbbell; label: string }) {
  return (
    <Link to={to} className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl bg-surface text-center shadow-[0_8px_20px_rgba(18,32,51,0.05)]">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-raised text-lime">
        <Icon size={16} aria-hidden />
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

function WeekRing({ ratio, label }: { ratio: number; label: string }) {
  const radius = 28;
  const length = 2 * Math.PI * radius;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={label}>
      <circle cx="42" cy="42" r={radius} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="8" />
      <circle
        cx="42"
        cy="42"
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${length * ratio} ${length}`}
        transform="rotate(-90 42 42)"
      />
    </svg>
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
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
        <div className="h-full bg-lime" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}
