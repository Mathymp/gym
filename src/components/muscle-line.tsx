import { MUSCLE_LABEL, type Exercise } from "@/lib/types";

export function MuscleLine({ exercise, className }: { exercise: Pick<Exercise, "muscle_group" | "secondary_muscles">; className?: string }) {
  const secondary = exercise.secondary_muscles.filter((item) => item.toLowerCase() !== MUSCLE_LABEL[exercise.muscle_group].toLowerCase());
  return (
    <span className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs ${className ?? ""}`}>
      <span className="inline-flex items-center gap-1 rounded-md bg-[#fdecec] px-1.5 py-0.5 font-semibold text-[#b42318]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]" aria-hidden />
        {MUSCLE_LABEL[exercise.muscle_group]}
      </span>
      {secondary.length ? <span className="text-muted">+ {secondary.join(", ").toLowerCase()}</span> : null}
    </span>
  );
}
