import type { MuscleGroup } from "@/lib/types";
import { ExerciseMotion } from "@/components/exercise-motion";

export function MachineMotion({
  slug,
  name,
  muscle,
  compact = false,
}: {
  slug: string | null;
  name: string;
  muscle: MuscleGroup;
  compact?: boolean;
}) {
  return (
    <ExerciseMotion
      slug={slug}
      name={name}
      muscle={muscle}
      steps
      className={`block aspect-[3/2] w-full rounded-2xl ${compact ? "mt-3" : ""}`}
    />
  );
}
