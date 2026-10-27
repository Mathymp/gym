import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { machinePhotoSrc } from "@/components/machine-motion";
import { Button, EmptyState, InlineError, Page, Sheet } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import { DayPackList } from "@/features/day-packs";
import { applyDayPack, setEasyThrough, startSession, swapPlanDays, swapThisWeek, todayIso } from "@/lib/api";
import { endOfIsoWeek, isEasyWeek, programPhase } from "@/lib/program";
import { humanError } from "@/lib/errors";
import {
  addIsoDays,
  formatKg,
  formatLongDate,
  formatMediumDate,
  santiagoDate,
  santiagoWeekday,
  startOfIsoWeek,
  WEEKDAY_LABELS,
} from "@/lib/format";
import { countInWeek, plannedDayIdsForDate, trainingStreak, weightGoalRatio } from "@/lib/metrics";
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
  const last = sessions[0];
  const points = weightPoints(sortedWeights, today);
  const openSession = open.data;
  const phase = programPhase(plan?.program_started_on, plan?.easy_through, today);
  const weekTarget = plan?.program_started_on ? strengthDays.length : weeklyTarget ? Number(weeklyTarget.target_value) : strengthDays.length || 4;
  const weekRatio = weekTarget > 0 ? Math.min(1, trainedThisWeek / weekTarget) : 0;
  const weekPercent = Math.round(weekRatio * 100);
  const otherDays = (plan?.days ?? []).filter((item) => item.id !== day?.id);
  const easy = isEasyWeek(plan?.program_started_on, plan?.easy_through, today);
  const todayTitle = day?.day_kind === "strength" || day?.day_kind === "rest" ? day.label : "Día libre";
  const cover = day?.exercises[0]?.exercise;

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

  async function replaceDay(other: PlanDay, always: boolean) {
    if (!plan || !day) return;
    setSwapPending(true);
    try {
      if (always) {
        await swapPlanDays(plan, day.id, other.id);
        toast.success(`${day.label} y ${other.label} quedan intercambiados todas las semanas.`);
      } else {
        await swapThisWeek(day, other);
        toast.success(`Solo esta semana cambian ${day.label} y ${other.label}. Las siguientes siguen el plan.`);
      }
      await refresh();
      setSwapOpen(false);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setSwapPending(false);
    }
  }

  async function makeEasy() {
    if (!plan) return;
    try {
      await setEasyThrough(plan.id, endOfIsoWeek(todayIso()));
      await refresh();
      toast.success("Esta semana haces 2 series donde el plan dice 3. Las otras semanas no cambian.");
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function useTodayPack(packId: string, label: string) {
    if (!plan || !day) return;
    setSwapPending(true);
    try {
      await applyDayPack(plan, day.id, packId);
      await refresh();
      setSwapOpen(false);
      const openOnThisDay = openSession?.plan_day_id === day.id;
      toast.success(openOnThisDay ? `Las próximas veces hoy es ${label}. La sesión abierta sigue igual.` : `Hoy haces ${label}.`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setSwapPending(false);
    }
  }

  return (
    <Page className="gap-6 pt-2">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatLongDate()}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hola, {name}</h1>
          <p className="mt-1 text-sm text-muted">{trainedThisWeek} de {weekTarget} esta semana{streak > 0 ? ` · racha ${streak}` : ""}</p>
        </div>
        <WeekRing ratio={weekRatio} label={`${weekPercent} por ciento de la semana`} />
      </header>

      <section>
        {cover ? (
          <img
            src={machinePhotoSrc(cover.slug, cover.muscle_group)}
            alt={`Posición de ${cover.name}`}
            width={960}
            height={720}
            className="h-52 w-full rounded-[28px] bg-white object-contain"
          />
        ) : (
          <div className="h-24 rounded-[28px] bg-raised" />
        )}
        <p className="mt-4 text-xs font-medium tracking-[0.14em] text-muted uppercase">Hoy · {day ? WEEKDAY_LABELS[day.weekday] : "Sin rutina"}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{todayTitle}</h2>
        <p className="mt-1 text-sm text-muted">
          {day?.day_kind === "strength" ? `${day.exercises.length} ejercicios` : "Descanso"}
          {phase ? ` · semana ${Math.min(phase.week, 8)} de 8` : ""}
        </p>
        <Button className="mt-4 w-full" size="lg" disabled={pending || day?.day_kind === "rest"} onClick={() => void begin(day?.day_kind === "strength" ? day : null)}>
          {pending ? "Abriendo" : openSession ? "Continuar entrenamiento" : day?.day_kind === "strength" ? "Comenzar entrenamiento" : "Día de descanso"}
        </Button>
        <button type="button" className="mt-2 h-11 w-full text-sm font-semibold text-lime disabled:opacity-40" disabled={!day || swapPending} onClick={() => setSwapOpen(true)}>
          Cambiar este día
        </button>
        {phase ? <p className="text-sm leading-5 text-muted">{phase.hint}</p> : null}
        {phase && !phase.easy ? (
          <button type="button" className="mt-2 h-11 text-sm font-semibold text-lime" onClick={() => void makeEasy()}>
            Esta semana más fácil
          </button>
        ) : null}
      </section>

      {day?.day_kind === "strength" ? (
        <section>
          <h2 className="text-sm font-semibold text-muted">Ejercicios de hoy</h2>
          <ul className="mt-2">
            {day.exercises.map((item) => {
              const sets = easy && item.target_sets >= 3 ? 2 : item.target_sets;
              const reps = item.target_seconds
                ? `${item.target_seconds} s`
                : item.target_reps_min && item.target_reps_max && item.target_reps_min !== item.target_reps_max
                  ? `${item.target_reps_min}–${item.target_reps_max}`
                  : `${item.target_reps_min ?? item.target_reps_max ?? ""}`;
              return (
                <li key={item.id} className="flex items-center gap-3 border-b border-line py-3">
                  <img src={machinePhotoSrc(item.exercise.slug, item.exercise.muscle_group)} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain" />
                  <span className="min-w-0">
                    <span className="block font-medium">{item.exercise.name}</span>
                    <span className="text-sm text-muted">{sets} × {reps}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
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
          {day ? `Hoy está ${day.label}. Solo esta semana mueve ese entreno y el otro. Las semanas que vienen siguen el orden del plan, salvo que elijas siempre.` : "No hay un día para mover."}
        </p>
        {otherDays.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-3">
            {otherDays.map((item) => (
              <li key={item.id} className="rounded-2xl bg-raised px-4 py-3">
                <p className="font-semibold">{item.label}</p>
                <p className="text-sm text-muted">{WEEKDAY_LABELS[item.weekday]} · {item.exercises.length} ejercicios</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={swapPending} className="h-11 rounded-full bg-lime px-4 text-sm font-semibold text-white disabled:opacity-40" onClick={() => void replaceDay(item, false)}>
                    Solo esta semana
                  </button>
                  <button type="button" disabled={swapPending} className="h-11 rounded-full bg-surface px-4 text-sm font-semibold text-foreground disabled:opacity-40" onClick={() => void replaceDay(item, true)}>
                    Siempre
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <h3 className="mt-6 text-sm font-semibold">Packs por zona</h3>
        <p className="mt-1 mb-4 text-sm leading-6 text-muted">El pack queda en este día de la semana. Los otros días no se mueven.</p>
        <DayPackList action="Poner hoy" pending={swapPending} onPick={(pack) => void useTodayPack(pack.id, pack.label)} />
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

function WeekRing({ ratio, label }: { ratio: number; label: string }) {
  const radius = 22;
  const length = 2 * Math.PI * radius;
  const percent = Math.round(ratio * 100);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={label} className="shrink-0">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="#d5e1f0" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${length * ratio} ${length}`}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" fill="#122033" fontSize="13" fontWeight="600">{percent}</text>
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
