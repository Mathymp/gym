import { EXERCISE_MEDIA } from "@/data/exercise-media";
import { MUSCLE_LABEL, type MuscleGroup } from "@/lib/types";

export function exerciseFrames(slug: string | null) {
  if (!slug || !EXERCISE_MEDIA[slug]) return null;
  const base = `${import.meta.env.BASE_URL}exercises/${slug}`;
  return [`${base}/0.jpg`, `${base}/1.jpg`] as const;
}

export function ExerciseMotion({
  slug,
  name,
  muscle,
  className,
  labelled = true,
  steps = false,
}: {
  slug: string | null;
  name: string;
  muscle: MuscleGroup;
  className?: string;
  labelled?: boolean;
  steps?: boolean;
}) {
  const frames = exerciseFrames(slug);
  if (!frames) {
    return (
      <div
        className={`flex flex-col justify-end overflow-hidden bg-raised p-3 ${className ?? ""}`}
        role={labelled ? "img" : undefined}
        aria-label={labelled ? `${name}, sin foto` : undefined}
        aria-hidden={labelled ? undefined : true}
      >
        <span className="text-[11px] font-semibold tracking-[0.12em] text-lime uppercase">{MUSCLE_LABEL[muscle]}</span>
        {labelled ? <span className="mt-0.5 text-xs text-muted">Sin foto de esta máquina</span> : null}
      </div>
    );
  }
  return (
    <div
      className={`relative isolate overflow-hidden bg-[#1b2230] ${className ?? ""}`}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? `${name}: posición inicial y final` : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <img src={frames[0]} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-contain" />
      <img src={frames[1]} alt="" loading="lazy" decoding="async" className="motion-frame absolute inset-0 h-full w-full object-contain" />
      {steps ? (
        <div className="absolute bottom-2 left-2 flex gap-1 text-[11px] font-semibold" aria-hidden>
          <span className="motion-step-start rounded-full px-2 py-1">1 Inicio</span>
          <span className="motion-step-end rounded-full px-2 py-1">2 Final</span>
        </div>
      ) : null}
    </div>
  );
}
