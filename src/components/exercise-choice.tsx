import { useState } from "react";
import { ExerciseMotion } from "@/components/exercise-motion";
import { MuscleLine } from "@/components/muscle-line";
import { MUSCLE_LABEL, type Exercise, type MuscleGroup } from "@/lib/types";

type Filter = "hoy" | "todo" | MuscleGroup;

export function ExerciseChoice({
  exercises,
  zone,
  zones,
  preferredSlugs = [],
  excludeId,
  onPick,
}: {
  exercises: Exercise[];
  zone?: MuscleGroup;
  zones?: MuscleGroup[];
  preferredSlugs?: string[];
  excludeId?: string;
  onPick: (exercise: Exercise) => void;
}) {
  const dayZones = new Set(zones?.length ? zones : zone ? [zone] : []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(zone ?? (dayZones.size ? "hoy" : "todo"));
  const text = query.trim().toLowerCase();
  const preferred = new Set(preferredSlugs);
  const options = exercises
    .filter((item) => {
      if (item.id === excludeId) return false;
      if (text) return item.name.toLowerCase().includes(text);
      if (filter === "todo") return true;
      if (filter === "hoy") return dayZones.has(item.muscle_group) || (item.slug != null && preferred.has(item.slug));
      return item.muscle_group === filter || (filter === zone && item.slug != null && preferred.has(item.slug));
    })
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "es"))
    .slice(0, 60);

  function rank(item: Exercise) {
    if (item.slug && preferred.has(item.slug)) return 0;
    if (zone && item.muscle_group === zone) return 1;
    if (dayZones.has(item.muscle_group)) return 2;
    return 3;
  }

  const chips: Array<{ id: Filter; label: string }> = [
    ...(dayZones.size ? [{ id: "hoy" as const, label: "De hoy" }] : []),
    { id: "todo", label: "Todo" },
    ...(Object.keys(MUSCLE_LABEL) as MuscleGroup[]).map((item) => ({ id: item, label: MUSCLE_LABEL[item] })),
  ];

  return (
    <div>
      <input
        className="h-12 w-full rounded-2xl bg-background px-4"
        placeholder="Buscar por nombre"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Buscar ejercicio"
      />
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Zona muscular">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={filter === chip.id}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors ${filter === chip.id ? "bg-lime text-white" : "bg-raised text-foreground"}`}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {preferredSlugs.length && !text ? <p className="mt-3 text-xs text-muted">Arriba van las alternativas que trabajan lo mismo.</p> : null}
      <ul className="mt-2">
        {options.map((exercise) => {
          const alternative = exercise.slug != null && preferred.has(exercise.slug);
          return (
            <li key={exercise.id}>
              <button type="button" className="flex w-full items-center gap-3 border-b border-line py-3 text-left active:bg-raised/60" onClick={() => onPick(exercise)}>
                <ExerciseMotion slug={exercise.slug} name={exercise.name} muscle={exercise.muscle_group} labelled={false} className="aspect-[3/2] w-[8.5rem] shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  {alternative ? <span className="mb-1 block text-[11px] font-semibold tracking-[0.1em] text-lime uppercase">Alternativa</span> : null}
                  <span className="block font-semibold leading-5">{exercise.name}</span>
                  <MuscleLine exercise={exercise} className="mt-1.5" />
                  <span className="mt-1 block text-xs text-faint">{exercise.equipment}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {options.length === 0 ? <p className="mt-4 text-sm text-muted">No hay ejercicios con ese filtro. Prueba con “Todo”.</p> : null}
    </div>
  );
}
