import { MUSCLE_LABEL, type Exercise } from "@/lib/types";

export function MuscleLine({ exercise, className }: { exercise: Pick<Exercise, "muscle_group" | "secondary_muscles">; className?: string }) {
  const secondary = exercise.secondary_muscles.filter((item) => item.toLowerCase() !== MUSCLE_LABEL[exercise.muscle_group].toLowerCase());
  return (
    <span className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs ${className ?? ""}`}>
      <span className="rounded-md bg-lime/10 px-1.5 py-0.5 font-semibold text-lime">{MUSCLE_LABEL[exercise.muscle_group]}</span>
      {secondary.length ? <span className="text-muted">también {secondary.join(", ").toLowerCase()}</span> : null}
    </span>
  );
}
