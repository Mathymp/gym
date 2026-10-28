import { EXERCISE_MEDIA } from "@/data/exercise-media";
import { EXERCISE_STEPS } from "@/data/exercise-steps";
import { MuscleFigure } from "@/components/muscle-map";
import { exerciseLevels } from "@/lib/muscles";
import { MUSCLE_LABEL, type Exercise, type MuscleGroup } from "@/lib/types";

export function exerciseFrames(slug: string | null) {
  if (!slug || !EXERCISE_MEDIA[slug]) return null;
  const base = `${import.meta.env.BASE_URL}exercises/${slug}`;
  return [`${base}/0.jpg`, `${base}/1.jpg`] as const;
}

function NoPhoto({ slug, name, muscle, labelled, className }: { slug: string | null; name: string; muscle: MuscleGroup; labelled: boolean; className?: string }) {
  const levels = exerciseLevels({ slug, muscle_group: muscle, secondary_muscles: [] });
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-raised ${className ?? ""}`}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? `${name}, zona ${MUSCLE_LABEL[muscle]}` : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <MuscleFigure view="front" levels={levels} className="h-[82%] w-auto" />
      {labelled ? <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-muted">Sin foto de esta máquina</span> : null}
    </div>
  );
}

export function ExerciseMotion({
  slug,
  name,
  muscle,
  className,
  labelled = true,
}: {
  slug: string | null;
  name: string;
  muscle: MuscleGroup;
  className?: string;
  labelled?: boolean;
}) {
  const frames = exerciseFrames(slug);
  if (!frames) return <NoPhoto slug={slug} name={name} muscle={muscle} labelled={labelled} className={className} />;
  return (
    <div
      className={`relative isolate overflow-hidden bg-[#1b2230] ${className ?? ""}`}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? `${name}: posición inicial y final` : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      <img src={frames[0]} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <img src={frames[1]} alt="" loading="lazy" decoding="async" className="motion-frame absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

export function exerciseSteps(exercise: Pick<Exercise, "slug" | "instructions" | "tracking_type">) {
  const known = exercise.slug ? EXERCISE_STEPS[exercise.slug] : undefined;
  if (known) {
    const labels = exercise.tracking_type === "time"
      ? ["Posición", "Activa", "Sostén"]
      : exercise.tracking_type === "distance"
        ? ["Prepara", "Ritmo", "Postura"]
        : ["Posición", "Movimiento", "Vuelta"];
    return known.map((text, index) => ({ label: labels[index], text }));
  }
  const sentences = exercise.instructions
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const setup = sentences[0] ?? "Ubícate como en la primera foto.";
  const move = sentences.slice(1).join(" ") || "Haz el recorrido completo hasta la posición de la segunda foto.";
  const back = exercise.tracking_type === "time"
    ? "Sostén la posición respirando normal. Apoya al terminar el tiempo."
    : "Vuelve lento a la posición inicial, sin soltar el peso de golpe.";
  return [
    { label: "Posición", text: setup },
    { label: "Movimiento", text: move },
    { label: "Vuelta", text: back },
  ];
}

export function ExerciseDemo({
  exercise,
  className,
}: {
  exercise: Pick<Exercise, "slug" | "name" | "muscle_group" | "instructions" | "tracking_type">;
  className?: string;
}) {
  const frames = exerciseFrames(exercise.slug);
  const steps = exerciseSteps(exercise);
  return (
    <figure className={`m-0 ${className ?? ""}`}>
      {frames ? (
        <div className="relative isolate aspect-[3/2] w-full overflow-hidden rounded-2xl bg-[#1b2230]" role="img" aria-label={`${exercise.name}: posición inicial, movimiento y vuelta`}>
          <img src={frames[0]} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <img src={frames[1]} alt="" loading="lazy" decoding="async" className="demo-frame absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : (
        <NoPhoto slug={exercise.slug} name={exercise.name} muscle={exercise.muscle_group} labelled className="aspect-[3/2] w-full rounded-2xl" />
      )}
      <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
        {steps.map((step, index) => (
          <span key={step.label} className="h-1 overflow-hidden rounded-full bg-raised">
            <span className={`demo-bar demo-bar-${index + 1} block h-full origin-left rounded-full bg-lime`} />
          </span>
        ))}
      </div>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((step, index) => (
          <li key={step.label} className={`demo-step demo-step-${index + 1} flex gap-3`}>
            <span className="demo-badge flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular">{index + 1}</span>
            <span className="min-w-0 text-sm leading-5">
              <span className="font-semibold text-foreground">{step.label}. </span>
              <span className="text-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
