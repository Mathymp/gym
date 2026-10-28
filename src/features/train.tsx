import { useMemo, useState, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, EmptyState, InlineError, Kicker, Page, Sheet, TextField } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import { WEEK_PACKS, weekPackClientId } from "@/data/packs";
import { DayPackList } from "@/features/day-packs";
import {
  activatePlan,
  applyDayPack,
  createBlankPlan,
  createExercise,
  insertPlanExercise,
  installWeekPack,
  removePlanExercise,
  savePlanDay,
  savePlanExercise,
  savePlanMeta,
  swapPlanDays,
  todayIso,
} from "@/lib/api";
import { humanError } from "@/lib/errors";
import { WEEKDAY_LABELS } from "@/lib/format";
import { dayKindLabel } from "@/lib/metrics";
import { newId } from "@/lib/utils";
import { MUSCLE_LABEL, type DayKind, type Exercise, type MuscleGroup, type PlanDay, type PlanExercise, type TrackingType } from "@/lib/types";
import { ExerciseChoice } from "@/components/exercise-choice";
import { ExerciseDemo, ExerciseMotion } from "@/components/exercise-motion";
import { ExerciseMuscles } from "@/components/muscle-map";
import { MuscleLine } from "@/components/muscle-line";
import { programPhase } from "@/lib/program";
import { useActivePlan, useExercises, useOpenSession, usePlans, useRefresh } from "@/features/use-data";

export function TrainScreen() {
  const { plan, plans, profile } = useActivePlan();
  const open = useOpenSession();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [packPending, setPackPending] = useState<string | null>(null);
  const [confirmPack, setConfirmPack] = useState<(typeof WEEK_PACKS)[number] | null>(null);

  if (plans.isLoading || profile.isLoading) return <ScreenSkeleton />;
  if (plans.error) return <Page><InlineError message={humanError(plans.error)} onRetry={() => void plans.refetch()} /></Page>;

  function askPack(pack: (typeof WEEK_PACKS)[number]) {
    if (pack.days.length < 5) {
      setConfirmPack(pack);
      return;
    }
    void usePack(pack.id, pack.name);
  }

  async function usePack(packId: string, packName: string) {
    setConfirmPack(null);
    setPackPending(packId);
    try {
      await installWeekPack(packId);
      await refresh();
      toast.success(`Ahora usas ${packName}. La rutina anterior sigue guardada.`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPackPending(null);
    }
  }

  async function createPlan() {
    if (!name.trim()) return;
    setPending(true);
    try {
      const created = await createBlankPlan(name.trim());
      setName("");
      await refresh();
      navigate(`/entrenar/rutina/${created.id}`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Page>
      <header>
        <Kicker>Entrenar</Kicker>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{plan?.name ?? "Sin rutina"}</h1>
        {plan?.program_started_on ? <p className="mt-2 text-sm leading-5 text-muted">{programPhase(plan.program_started_on, plan.easy_through, todayIso())?.hint}</p> : null}
      </header>
      {open.data ? (
        <Button className="w-full" size="lg" onClick={() => navigate(`/sesion/${open.data!.id}`)}>Continuar sesión abierta</Button>
      ) : null}
      {plan ? (
        <ul className="flex flex-col gap-2">
          {plan.days.map((day) => (
            <li key={day.id}>
              <Link className="flex min-h-[4.5rem] items-center gap-3 rounded-[24px] bg-surface py-3 pr-3 pl-3 shadow-[0_8px_24px_rgba(18,32,51,0.05)]" to={`/entrenar/rutina/${plan.id}?dia=${day.id}`}>
                {day.exercises[0] ? (
                  <ExerciseMotion slug={day.exercises[0].exercise.slug} name={day.exercises[0].exercise.name} muscle={day.exercises[0].exercise.muscle_group} labelled={false} className="aspect-[3/2] w-24 shrink-0 rounded-xl" />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded-xl bg-raised" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{day.label}</span>
                  <span className="text-sm text-muted">{WEEKDAY_LABELS[day.weekday]} · {dayKindLabel(day.day_kind)} · {day.exercises.length} ejercicios</span>
                </span>
                <span className="shrink-0 rounded-full bg-lime px-3 py-2 text-sm font-semibold text-white">Editar</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Todavía no hay rutina" body="Crea una rutina y elige los ejercicios de cada día." />
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Packs de la semana</h2>
        <p className="text-sm leading-6 text-muted">La sugerida es Atlético 8 semanas, 5 días. Si eliges una más corta, entrenas menos veces. La rutina anterior queda guardada.</p>
        <ul>
          {WEEK_PACKS.map((pack) => {
            const active = plan?.client_id === weekPackClientId(pack.id);
            return (
              <li key={pack.id} className="flex items-start justify-between gap-3 border-b border-line py-3">
                <span>
                  <span className="block font-semibold">{pack.name}</span>
                  <span className="mt-0.5 block text-sm text-lime">{pack.focus}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{pack.summary}</span>
                </span>
                {active ? <span className="shrink-0 pt-1 text-sm font-semibold text-lime">En uso</span> : (
                  <button type="button" aria-label={`Usar ${pack.name}`} className="h-11 shrink-0 rounded-full bg-lime px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={packPending !== null} onClick={() => askPack(pack)}>
                    {packPending === pack.id ? "Aplicando" : "Usar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <Button size="lg" className="w-full" onClick={() => navigate("/entrenar/ejercicios")}>Biblioteca de ejercicios</Button>
      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className="text-lg font-semibold">Otra rutina</h2>
        <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
        <Button variant="surface" size="lg" disabled={pending} onClick={() => void createPlan()}>Crear rutina</Button>
        <ul>
          {(plans.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between border-b border-line py-3">
              <span>{item.name}</span>
              {item.id === plan?.id ? <span className="text-xs text-lime">Activa</span> : (
                <button className="h-11 shrink-0 rounded-full bg-lime px-4 text-sm font-semibold text-white" onClick={() => void activatePlan(item.id).then(() => refresh())}>Activar</button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <Sheet open={Boolean(confirmPack)} title="Este plan tiene menos de 5 días" onClose={() => setConfirmPack(null)}>
        <p className="text-sm leading-6 text-muted">
          {confirmPack ? `${confirmPack.name} tiene ${confirmPack.days.length} días de pesas. El atlético está pensado para 5. Si lo usas, entrenas menos veces por semana. La rutina de 5 días queda guardada.` : ""}
        </p>
        <Button className="mt-4 w-full" size="lg" onClick={() => confirmPack && void usePack(confirmPack.id, confirmPack.name)}>Usarlo igual</Button>
        <Button className="mt-2 w-full" size="lg" variant="surface" onClick={() => setConfirmPack(null)}>Seguir con 5 días</Button>
      </Sheet>
    </Page>
  );
}

export function PlanEditorScreen() {
  const { planId = "" } = useParams();
  const plans = usePlans();
  const exercises = useExercises();
  const refresh = useRefresh();
  const plan = plans.data?.find((item) => item.id === planId) ?? null;
  const params = new URLSearchParams(window.location.search);
  const initialDay = params.get("dia");
  const [dayId, setDayId] = useState(initialDay ?? plan?.days[0]?.id ?? "");
  const [picker, setPicker] = useState<number | null>(null);
  const [packsOpen, setPacksOpen] = useState(false);
  const [replacing, setReplacing] = useState<PlanExercise | null>(null);
  const [packPending, setPackPending] = useState(false);
  const day = plan?.days.find((item) => item.id === dayId) ?? plan?.days[0] ?? null;

  if (plans.isLoading || exercises.isLoading) return <ScreenSkeleton />;
  if (!plan || !day) return <Page><EmptyState title="No está esa rutina" body="Vuelve a entrenar y elige una rutina existente." /></Page>;

  async function updateDay(next: PlanDay) {
    const strength = plan!.days.filter((item) => (item.id === next.id ? next.day_kind : item.day_kind) === "strength").length;
    try {
      await savePlanDay(plan!, next);
      await refresh();
      if (day!.day_kind === "strength" && next.day_kind !== "strength" && strength < 5) {
        toast.message("Este plan queda con menos de 5 días de pesas. El atlético está pensado para 5.");
      }
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function useDayPack(packId: string, label: string) {
    setPackPending(true);
    try {
      await applyDayPack(plan!, day!.id, packId);
      setPacksOpen(false);
      await refresh();
      toast.success(`${WEEKDAY_LABELS[day!.weekday]} queda en ${label}.`);
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPackPending(false);
    }
  }

  async function replaceExercise(exercise: Exercise) {
    if (!replacing) return;
    const time = exercise.tracking_type === "time";
    const next: PlanExercise = {
      ...replacing,
      exercise_id: exercise.id,
      exercise,
      target_reps_min: time ? null : replacing.target_reps_min ?? 10,
      target_reps_max: time ? null : replacing.target_reps_max ?? 12,
      target_seconds: time ? replacing.target_seconds ?? 30 : null,
    };
    try {
      await savePlanExercise(plan!, day!.id, next, "update");
      setReplacing(null);
      await refresh();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function addExercise(exercise: Exercise, at: number) {
    const id = newId();
    const row: PlanExercise = {
      id,
      user_id: plan!.user_id,
      plan_day_id: day!.id,
      exercise_id: exercise.id,
      client_id: id,
      sort_order: day!.exercises.length,
      target_sets: 3,
      target_reps_min: exercise.tracking_type === "time" ? null : 10,
      target_reps_max: exercise.tracking_type === "time" ? null : 12,
      target_seconds: exercise.tracking_type === "time" ? 30 : null,
      rest_seconds: 90,
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: "",
      exercise,
    };
    try {
      await insertPlanExercise(plan!, day!.id, row, at);
      setPicker(null);
      await refresh();
      toast.success(`${exercise.name} agregado`);
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  return (
    <Page>
      <Link className="text-sm text-muted" to="/entrenar">Volver</Link>
      <Kicker>Rutina</Kicker>
      <input
        className="bg-transparent text-3xl font-semibold outline-none"
        aria-label="Nombre de la rutina"
        defaultValue={plan.name}
        onBlur={(event) => {
          if (event.target.value.trim() && event.target.value !== plan.name) void savePlanMeta(plan, { name: event.target.value.trim() }).then(() => refresh());
        }}
      />
      <div className="no-scrollbar flex gap-2 overflow-auto">
        {plan.days.map((item) => (
          <button key={item.id} className={`h-11 shrink-0 px-3 text-sm ${item.id === day.id ? "text-lime" : "text-muted"}`} onClick={() => setDayId(item.id)}>
            {WEEKDAY_LABELS[item.weekday].slice(0, 3)}
          </button>
        ))}
      </div>
      <label className="block text-sm text-muted">
        Nombre del día
        <input
          key={day.id}
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface px-3"
          defaultValue={day.label}
          onBlur={(event) => {
            if (event.target.value.trim() && event.target.value !== day.label) void updateDay({ ...day, label: event.target.value.trim() });
          }}
        />
      </label>
      <label className="block text-sm text-muted">
        Tipo
        <select className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface px-3" value={day.day_kind} onChange={(event) => void updateDay({ ...day, day_kind: event.target.value as DayKind })}>
          <option value="strength">Fuerza</option>
          <option value="rest">Descanso</option>
          <option value="cardio">Cardio</option>
          <option value="free">Libre</option>
        </select>
      </label>
      <label className="block text-sm text-muted">
        Pasar este día al lugar de otro, todas las semanas
        <select
          className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface px-3"
          value={day.id}
          onChange={(event) => {
            const other = event.target.value;
            if (other !== day.id) void swapPlanDays(plan, day.id, other).then(() => refresh());
          }}
        >
          {plan.days.map((item) => (
            <option key={item.id} value={item.id}>{WEEKDAY_LABELS[item.weekday]}</option>
          ))}
        </select>
      </label>
      <Button size="lg" variant="surface" onClick={() => setPacksOpen(true)}>Pack para este día</Button>
      <ul className="border-t border-line">
        {day.exercises.map((item, index) => (
          <PlanExerciseRow
            key={item.id}
            item={item}
            onInsertBefore={index > 0 ? () => setPicker(index) : undefined}
            onChange={(next) => void savePlanExercise(plan, day.id, next, "update").then(() => refresh())}
            onReplace={() => setReplacing(item)}
            onDelete={() => void removePlanExercise(plan, day.id, item).then(() => refresh())}
            onMove={(direction) => {
              const swap = day.exercises[index + direction];
              if (!swap) return;
              void savePlanExercise(plan, day.id, { ...item, sort_order: swap.sort_order }, "update")
                .then(() => savePlanExercise(plan, day.id, { ...swap, sort_order: item.sort_order }, "update"))
                .then(() => refresh());
            }}
          />
        ))}
      </ul>
      {day.exercises.length === 0 ? <p className="text-sm text-muted">Este día no tiene ejercicios.</p> : null}
      <Button size="lg" onClick={() => setPicker(day.exercises.length)}>Agregar ejercicio al final</Button>
      <Sheet open={packsOpen} title="Pack para este día" onClose={() => setPacksOpen(false)}>
        <p className="mb-4 text-sm leading-6 text-muted">Reemplaza los ejercicios de {WEEKDAY_LABELS[day.weekday]}. El resto de la semana no cambia.</p>
        <DayPackList action="Poner" pending={packPending} onPick={(pack) => void useDayPack(pack.id, pack.label)} />
      </Sheet>
      <Sheet open={Boolean(replacing)} title="Cambiar ejercicio" onClose={() => setReplacing(null)}>
        {replacing ? (
          <ExerciseChoice
            exercises={exercises.data ?? []}
            zone={replacing.exercise.muscle_group}
            zones={day.exercises.map((item) => item.exercise.muscle_group)}
            preferredSlugs={replacing.exercise.alternative_slugs}
            excludeId={replacing.exercise_id}
            onPick={(exercise) => void replaceExercise(exercise)}
          />
        ) : null}
      </Sheet>
      <Sheet open={picker != null} title={picker != null && picker < day.exercises.length ? "Agregar aquí" : "Agregar ejercicio"} onClose={() => setPicker(null)}>
        <ExerciseChoice
          exercises={exercises.data ?? []}
          zones={day.exercises.map((item) => item.exercise.muscle_group)}
          onPick={(exercise) => void addExercise(exercise, picker ?? day.exercises.length)}
        />
      </Sheet>
    </Page>
  );
}

function PlanExerciseRow({
  item,
  onChange,
  onDelete,
  onMove,
  onReplace,
  onInsertBefore,
}: {
  item: PlanExercise;
  onChange: (item: PlanExercise) => void;
  onDelete: () => void;
  onMove: (direction: number) => void;
  onReplace: () => void;
  onInsertBefore?: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="border-b border-line pb-4">
      {onInsertBefore ? (
        <div className="relative -mt-px flex h-10 items-center justify-center">
          <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" aria-hidden />
          <button type="button" className="relative h-8 rounded-full bg-background px-3 text-xs font-semibold text-lime" onClick={onInsertBefore}>+ Agregar aquí</button>
        </div>
      ) : <div className="h-4" />}
      <div className="flex items-start gap-3">
        <ExerciseMotion slug={item.exercise?.slug ?? null} name={item.exercise?.name ?? "Ejercicio"} muscle={item.exercise?.muscle_group ?? "piernas"} labelled={false} className="aspect-[3/2] w-32 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className="min-w-0 pt-0.5 font-semibold leading-5">{item.exercise?.name ?? "Ejercicio"}</p>
            <div className="-mt-2 -mr-2 flex shrink-0">
              <button className="h-11 w-9 text-muted" aria-label="Subir" onClick={() => onMove(-1)}>↑</button>
              <button className="h-11 w-9 text-muted" aria-label="Bajar" onClick={() => onMove(1)}>↓</button>
            </div>
          </div>
          {item.exercise ? <MuscleLine exercise={item.exercise} className="mt-1" /> : null}
        </div>
      </div>
      {item.exercise?.instructions ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{item.exercise.instructions}</p> : null}
      <button className="h-11 text-sm font-semibold text-lime" onClick={onReplace}>Cambiar o reemplazar</button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Mini label="Series" value={item.target_sets} onChange={(value) => onChange({ ...item, target_sets: value })} />
        <Mini label="Reps" value={item.target_reps_min ?? 0} onChange={(value) => onChange({ ...item, target_reps_min: value, target_reps_max: Math.max(value, item.target_reps_max ?? value) })} />
        <Mini label="Descanso" value={item.rest_seconds} onChange={(value) => onChange({ ...item, rest_seconds: value })} />
      </div>
      {confirm ? (
        <button className="mt-3 text-sm text-danger" onClick={onDelete}>Quitar {item.exercise?.name} de este día</button>
      ) : (
        <button className="mt-3 text-sm text-muted" onClick={() => setConfirm(true)}>Quitar</button>
      )}
    </li>
  );
}

function Mini({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-xs text-faint">
      {label}
      <input inputMode="numeric" className="mt-1 h-12 w-full rounded-xl bg-surface text-center text-base text-foreground tabular" value={value} onChange={(event) => onChange(Number(event.target.value || 0))} />
    </label>
  );
}

export function LibraryScreen() {
  const exercises = useExercises();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "todos">("todos");
  const [open, setOpen] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const grouped = useMemo(() => {
    return (exercises.data ?? []).filter((item) => {
      const matches = item.name.toLowerCase().includes(query.toLowerCase());
      return matches && (group === "todos" || item.muscle_group === group);
    });
  }, [exercises.data, query, group]);

  if (exercises.isLoading) return <ScreenSkeleton />;
  if (exercises.error) return <Page><InlineError message={humanError(exercises.error)} onRetry={() => void exercises.refetch()} /></Page>;

  const featured = grouped[0] ?? null;
  const rest = featured ? grouped.slice(1) : grouped;

  return (
    <Page className="gap-4">
      <Link className="text-sm font-semibold text-lime" to="/entrenar">Volver</Link>
      <h1 className="text-3xl font-semibold tracking-tight">Ejercicios</h1>
      <label className="relative block">
        <span className="sr-only">Buscar ejercicio</span>
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="Buscar ejercicio"
          className="h-12 w-full rounded-2xl bg-surface pr-4 pl-11 text-base shadow-[0_6px_18px_rgba(18,32,51,0.05)] ring-1 ring-line outline-none placeholder:text-faint focus:ring-2 focus:ring-lime"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="no-scrollbar flex gap-2 overflow-auto pb-1">
        <FilterChip label="Todos" selected={group === "todos"} onClick={() => setGroup("todos")} />
        {(Object.keys(MUSCLE_LABEL) as MuscleGroup[]).map((item) => (
          <FilterChip key={item} label={MUSCLE_LABEL[item]} selected={group === item} onClick={() => setGroup(item)} />
        ))}
      </div>
      {featured ? (
        <button type="button" className="enter overflow-hidden rounded-[28px] bg-surface p-2 text-left shadow-[0_10px_30px_rgba(18,32,51,0.06)] transition-transform active:scale-[0.99]" onClick={() => setOpen(featured)}>
          <ExerciseMotion slug={featured.slug} name={featured.name} muscle={featured.muscle_group} className="aspect-[16/10] w-full rounded-[22px]" />
          <span className="flex items-start justify-between gap-3 px-2 pt-3 pb-2">
            <span className="min-w-0">
              <span className="block text-lg leading-6 font-semibold tracking-tight">{featured.name}</span>
              <MuscleLine exercise={featured} className="mt-1.5" />
            </span>
            <span className="shrink-0 pt-1 text-xs font-semibold text-lime">Ver pasos</span>
          </span>
        </button>
      ) : (
        <EmptyState title="Sin resultados" body="Prueba otro nombre o crea un ejercicio propio." />
      )}
      <ul className="flex flex-col gap-2">
        {rest.map((exercise, index) => (
          <li key={exercise.id} className="enter" style={{ "--i": Math.min(index, 10) } as CSSProperties}>
            <button className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface py-2 pr-4 pl-2 text-left shadow-[0_8px_20px_rgba(18,32,51,0.04)] transition-transform active:scale-[0.99]" onClick={() => setOpen(exercise)}>
              <ExerciseMotion slug={exercise.slug} name={exercise.name} muscle={exercise.muscle_group} labelled={false} className="aspect-[3/2] w-28 shrink-0 rounded-xl" />
              <span className="min-w-0">
                <span className="block font-semibold leading-5">{exercise.name}</span>
                <MuscleLine exercise={exercise} className="mt-1" />
                <span className="mt-0.5 block text-xs text-faint">{exercise.equipment}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button size="lg" variant="surface" onClick={() => setCreating(true)}>Crear ejercicio</Button>
      <Sheet open={Boolean(open)} title={open?.name ?? ""} onClose={() => setOpen(null)}>
        {open ? <ExerciseDetail exercise={open} catalog={exercises.data ?? []} onOpen={setOpen} /> : null}
      </Sheet>
      <Sheet open={creating} title="Ejercicio propio" onClose={() => setCreating(false)}>
        <CustomExerciseForm onDone={() => { setCreating(false); void exercises.refetch(); }} />
      </Sheet>
    </Page>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-[background-color,color,transform] duration-200 active:scale-95 ${selected ? "bg-lime text-white shadow-[0_6px_14px_rgba(29,78,216,0.28)]" : "bg-surface text-foreground"}`} onClick={onClick}>
      {label}
    </button>
  );
}

function ExerciseDetail({ exercise, catalog, onOpen }: { exercise: Exercise; catalog: Exercise[]; onOpen: (exercise: Exercise) => void }) {
  const alternatives = exercise.alternative_slugs
    .map((slug) => catalog.find((item) => item.slug === slug))
    .filter((item): item is Exercise => Boolean(item));
  return (
    <div className="flex flex-col gap-5 text-sm leading-6">
      <p className="-mt-2 text-muted">{exercise.machine_name ?? exercise.equipment}</p>
      <ExerciseDemo exercise={exercise} />
      <div className="rounded-2xl bg-background p-3">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">Zona que trabaja</p>
        <ExerciseMuscles exercise={exercise} />
      </div>
      {exercise.common_mistakes ? (
        <p className="leading-5 text-muted"><span className="font-semibold text-warning">Evita. </span>{exercise.common_mistakes}</p>
      ) : null}
      {alternatives.length ? (
        <section>
          <h3 className="text-xs font-semibold tracking-[0.14em] text-faint uppercase">Si está ocupada</h3>
          <ul className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
            {alternatives.map((item) => (
              <li key={item.id} className="w-36 shrink-0">
                <button type="button" className="w-full text-left transition-transform active:scale-[0.98]" onClick={() => onOpen(item)}>
                  <ExerciseMotion slug={item.slug} name={item.name} muscle={item.muscle_group} labelled={false} className="aspect-[3/2] w-full rounded-xl" />
                  <span className="mt-1.5 block text-xs leading-4 font-semibold">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Link className="flex h-12 items-center justify-center rounded-2xl bg-raised font-semibold text-lime transition-transform active:scale-[0.98]" to={`/progreso/fuerza/${exercise.id}`}>Ver mi progreso en este ejercicio</Link>
    </div>
  );
}

function CustomExerciseForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("pecho");
  const [equipment, setEquipment] = useState("");
  const [machine, setMachine] = useState("");
  const [tracking, setTracking] = useState<TrackingType>("weight_reps");
  const [instructions, setInstructions] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (name.trim().length < 2) return toast.error("El nombre es muy corto.");
    setPending(true);
    try {
      await createExercise({
        name: name.trim(),
        muscle_group: group,
        secondary_muscles: [],
        equipment: equipment.trim() || "Mi gimnasio",
        machine_name: machine.trim() || null,
        instructions: instructions.trim() || "Ejecuta el movimiento con control y anota la máquina que usaste.",
        common_mistakes: "",
        alternative_slugs: [],
        tracking_type: tracking,
      });
      onDone();
    } catch (caught) {
      toast.error(humanError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Equipo" value={equipment} onChange={(event) => setEquipment(event.target.value)} />
      <TextField label="Máquina de tu gimnasio" value={machine} onChange={(event) => setMachine(event.target.value)} />
      <label className="text-sm text-muted">
        Grupo
        <select className="mt-2 h-12 w-full rounded-2xl bg-surface px-3" value={group} onChange={(event) => setGroup(event.target.value as MuscleGroup)}>
          {(Object.keys(MUSCLE_LABEL) as MuscleGroup[]).map((item) => <option key={item} value={item}>{MUSCLE_LABEL[item]}</option>)}
        </select>
      </label>
      <label className="text-sm text-muted">
        Registro
        <select className="mt-2 h-12 w-full rounded-2xl bg-surface px-3" value={tracking} onChange={(event) => setTracking(event.target.value as TrackingType)}>
          <option value="weight_reps">Peso y repeticiones</option>
          <option value="reps">Repeticiones</option>
          <option value="time">Tiempo</option>
          <option value="distance">Distancia</option>
        </select>
      </label>
      <TextField label="Indicación breve" value={instructions} onChange={(event) => setInstructions(event.target.value)} />
      <Button size="lg" disabled={pending} onClick={() => void submit()}>{pending ? "Guardando" : "Guardar ejercicio"}</Button>
    </div>
  );
}
