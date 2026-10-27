import { useState } from "react";
import { machinePhotoSrc } from "@/components/machine-motion";
import { MUSCLE_LABEL, type Exercise, type MuscleGroup } from "@/lib/types";

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
  const [query, setQuery] = useState("");
  const [onlyDay, setOnlyDay] = useState(Boolean(zone || zones?.length));
  const text = query.trim().toLowerCase();
  const preferred = new Set(preferredSlugs);
  const dayZones = new Set(zones?.length ? zones : zone ? [zone] : []);
  const options = exercises
    .filter((item) => {
      if (item.id === excludeId) return false;
      if (text && !item.name.toLowerCase().includes(text)) return false;
      if (!onlyDay || dayZones.size === 0) return true;
      return dayZones.has(item.muscle_group) || (item.slug != null && preferred.has(item.slug));
    })
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "es"))
    .slice(0, 40);

  function rank(item: Exercise) {
    if (item.slug && preferred.has(item.slug)) return 0;
    if (zone && item.muscle_group === zone) return 1;
    if (dayZones.has(item.muscle_group)) return 2;
    return 3;
  }

  const zoneLabel = zone ? MUSCLE_LABEL[zone].toLowerCase() : "esta zona";

  return (
    <div>
      <p className="text-sm leading-6 text-muted">
        {preferredSlugs.length
          ? `Primero las alternativas de este ejercicio, después lo demás de ${zoneLabel} que entra hoy.`
          : `Opciones de lo que hoy estás trabajando.`}
      </p>
      <input
        className="mt-3 h-12 w-full rounded-2xl bg-background px-3"
        placeholder="Buscar"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Buscar ejercicio"
      />
      {dayZones.size > 0 ? (
        <button type="button" className="mt-3 h-11 text-sm font-semibold text-lime" onClick={() => setOnlyDay((value) => !value)}>
          {onlyDay ? "Ver otras zonas" : "Solo lo de hoy"}
        </button>
      ) : null}
      <ul className="mt-2">
        {options.map((exercise) => {
          const alternative = exercise.slug != null && preferred.has(exercise.slug);
          return (
            <li key={exercise.id}>
              <button type="button" className="flex min-h-16 w-full items-center gap-3 border-b border-line py-2 text-left" onClick={() => onPick(exercise)}>
                <img
                  src={machinePhotoSrc(exercise.slug, exercise.muscle_group)}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{exercise.name}</span>
                  <span className="text-xs text-faint">{alternative ? "Alternativa · " : ""}{MUSCLE_LABEL[exercise.muscle_group]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {options.length === 0 ? <p className="mt-3 text-sm text-muted">No hay otro ejercicio para esta zona.</p> : null}
    </div>
  );
}
