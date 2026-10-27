import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, EmptyState, InlineError, Kicker, Page, Sheet, TextField } from "@/components/ui";
import { ScreenSkeleton } from "@/components/shell";
import {
  activatePlan,
  createBlankPlan,
  createExercise,
  removePlanExercise,
  savePlanDay,
  savePlanExercise,
  savePlanMeta,
  swapPlanDays,
} from "@/lib/api";
import { humanError } from "@/lib/errors";
import { WEEKDAY_LABELS } from "@/lib/format";
import { dayKindLabel } from "@/lib/metrics";
import { newId } from "@/lib/utils";
import { MUSCLE_LABEL, type DayKind, type Exercise, type MuscleGroup, type PlanDay, type PlanExercise, type TrackingType } from "@/lib/types";
import { MachineMotion, machinePhotoSrc } from "@/components/machine-motion";
import { useActivePlan, useExercises, useOpenSession, usePlans, useRefresh } from "@/features/use-data";

export function TrainScreen() {
  const { plan, plans, profile } = useActivePlan();
  const open = useOpenSession();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  if (plans.isLoading || profile.isLoading) return <ScreenSkeleton />;
  if (plans.error) return <Page><InlineError message={humanError(plans.error)} onRetry={() => void plans.refetch()} /></Page>;

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
      </header>
      {open.data ? (
        <Button className="w-full" size="lg" onClick={() => navigate(`/sesion/${open.data!.id}`)}>Continuar sesión abierta</Button>
      ) : null}
      {plan ? (
        <ul className="flex flex-col gap-2">
          {plan.days.map((day) => (
            <li key={day.id}>
              <Link className="flex min-h-[4.5rem] items-center justify-between gap-3 rounded-[24px] bg-surface px-4 shadow-[0_8px_24px_rgba(18,32,51,0.05)]" to={`/entrenar/rutina/${plan.id}?dia=${day.id}`}>
                <span>
                  <span className="block font-semibold">{day.label}</span>
                  <span className="text-sm text-muted">{WEEKDAY_LABELS[day.weekday]} · {dayKindLabel(day.day_kind)} · {day.exercises.length} ejercicios</span>
                </span>
                <span className="rounded-full bg-raised px-3 py-2 text-sm font-semibold text-lime">Editar</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Todavía no hay rutina" body="Crea una rutina y elige los ejercicios de cada día." />
      )}
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
                <button className="h-11 text-sm text-lime" onClick={() => void activatePlan(item.id).then(() => refresh())}>Activar</button>
              )}
            </li>
          ))}
        </ul>
      </section>
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
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const day = plan?.days.find((item) => item.id === dayId) ?? plan?.days[0] ?? null;

  if (plans.isLoading || exercises.isLoading) return <ScreenSkeleton />;
  if (!plan || !day) return <Page><EmptyState title="No está esa rutina" body="Vuelve a entrenar y elige una rutina existente." /></Page>;

  async function updateDay(next: PlanDay) {
    try {
      await savePlanDay(plan!, next);
      await refresh();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  async function addExercise(exercise: Exercise) {
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
      await savePlanExercise(plan!, day!.id, row, "insert");
      setPicker(false);
      await refresh();
    } catch (caught) {
      toast.error(humanError(caught));
    }
  }

  const filtered = (exercises.data ?? []).filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

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
      <div className="flex gap-2 overflow-auto">
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
        Pasar este día al lugar de otro
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
      <ul className="border-t border-line">
        {day.exercises.map((item, index) => (
          <PlanExerciseRow
            key={item.id}
            item={item}
            onChange={(next) => void savePlanExercise(plan, day.id, next, "update").then(() => refresh())}
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
      <Button size="lg" onClick={() => setPicker(true)}>Agregar ejercicio</Button>
      <Sheet open={picker} title="Agregar ejercicio" onClose={() => setPicker(false)}>
        <TextField label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul className="mt-4">
          {filtered.slice(0, 30).map((exercise) => (
            <li key={exercise.id}>
              <button className="flex min-h-14 w-full items-center justify-between border-b border-line text-left" onClick={() => void addExercise(exercise)}>
                <span>{exercise.name}</span>
                <span className="text-xs text-faint">{MUSCLE_LABEL[exercise.muscle_group]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Page>
  );
}

function PlanExerciseRow({
  item,
  onChange,
  onDelete,
  onMove,
}: {
  item: PlanExercise;
  onChange: (item: PlanExercise) => void;
  onDelete: () => void;
  onMove: (direction: number) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="border-b border-line py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{item.exercise?.name ?? "Ejercicio"}</p>
        <div className="flex">
          <button className="h-11 w-11" aria-label="Subir" onClick={() => onMove(-1)}>↑</button>
          <button className="h-11 w-11" aria-label="Bajar" onClick={() => onMove(1)}>↓</button>
        </div>
      </div>
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
      <TextField label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="no-scrollbar flex gap-2 overflow-auto pb-1">
        <FilterChip label="Todos" selected={group === "todos"} onClick={() => setGroup("todos")} />
        {(Object.keys(MUSCLE_LABEL) as MuscleGroup[]).map((item) => (
          <FilterChip key={item} label={MUSCLE_LABEL[item]} selected={group === item} onClick={() => setGroup(item)} />
        ))}
      </div>
      {featured ? (
        <button type="button" className="overflow-hidden rounded-[28px] bg-surface text-left shadow-[0_10px_30px_rgba(18,32,51,0.06)]" onClick={() => setOpen(featured)}>
          <MachineMotion slug={featured.slug} name={featured.name} muscle={featured.muscle_group} />
          <span className="block px-4 pt-3 text-lg font-semibold">{featured.name}</span>
          <span className="block px-4 text-sm text-muted">{MUSCLE_LABEL[featured.muscle_group]} · {featured.equipment}</span>
          <span className="block px-4 pb-4 pt-2 text-sm leading-5 text-foreground"><span className="font-semibold text-lime">Consejo. </span>{featured.instructions}</span>
        </button>
      ) : (
        <EmptyState title="Sin resultados" body="Prueba otro nombre o crea un ejercicio propio." />
      )}
      <ul className="flex flex-col gap-2">
        {rest.map((exercise) => (
          <li key={exercise.id}>
            <button className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface py-2 pr-4 pl-2 text-left shadow-[0_8px_20px_rgba(18,32,51,0.04)]" onClick={() => setOpen(exercise)}>
              <img src={machinePhotoSrc(exercise.slug, exercise.muscle_group)} alt="" width={72} height={72} className="h-16 w-16 shrink-0 rounded-xl bg-white object-contain" />
              <span>
                <span className="block font-medium">{exercise.name}</span>
                <span className="text-sm text-muted">{MUSCLE_LABEL[exercise.muscle_group]} · {exercise.equipment}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button size="lg" variant="surface" onClick={() => setCreating(true)}>Crear ejercicio</Button>
      <Sheet open={Boolean(open)} title={open?.name ?? ""} onClose={() => setOpen(null)}>
        {open ? <ExerciseDetail exercise={open} /> : null}
      </Sheet>
      <Sheet open={creating} title="Ejercicio propio" onClose={() => setCreating(false)}>
        <CustomExerciseForm onDone={() => { setCreating(false); void exercises.refetch(); }} />
      </Sheet>
    </Page>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${selected ? "bg-lime text-ink" : "bg-surface text-muted"}`} onClick={onClick}>
      {label}
    </button>
  );
}

function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const alternatives = exercise.alternative_slugs.join(", ");
  return (
    <div className="flex flex-col gap-4 text-sm leading-6">
      <p className="text-muted">{MUSCLE_LABEL[exercise.muscle_group]} · {exercise.equipment}</p>
      <MachineMotion slug={exercise.slug} name={exercise.name} muscle={exercise.muscle_group} />
      {exercise.machine_name ? <p>Máquina: {exercise.machine_name}</p> : null}
      {exercise.secondary_muscles.length > 0 ? <p>También: {exercise.secondary_muscles.join(", ")}</p> : null}
      <div className="rounded-2xl bg-raised px-4 py-3">
        <p className="text-xs font-semibold tracking-wide text-lime">Consejo</p>
        <p className="mt-1">{exercise.instructions}</p>
      </div>
      {exercise.common_mistakes ? (
        <div className="rounded-2xl border border-line px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-warning">Evita</p>
          <p className="mt-1 text-muted">{exercise.common_mistakes}</p>
        </div>
      ) : null}
      {alternatives ? <p>Alternativas: {alternatives}</p> : null}
      <Link className="font-semibold text-lime" to={`/progreso/fuerza/${exercise.id}`}>Ver progreso</Link>
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
