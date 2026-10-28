import { DAY_PACKS, type DayPack } from "@/data/packs";
import { ExerciseMotion } from "@/components/exercise-motion";

export function DayPackList({
  action,
  pending,
  onPick,
}: {
  action: string;
  pending: boolean;
  onPick: (pack: DayPack) => void;
}) {
  const zones = [...new Set(DAY_PACKS.map((pack) => pack.zone))];
  return (
    <div className="flex flex-col gap-5">
      {zones.map((zone) => (
        <section key={zone}>
          <h3 className="text-sm font-semibold text-muted">{zone}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {DAY_PACKS.filter((pack) => pack.zone === zone).map((pack) => (
              <li key={pack.id}>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`${action} ${pack.label}`}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left shadow-[0_8px_20px_rgba(18,32,51,0.04)] disabled:opacity-40"
                  onClick={() => onPick(pack)}
                >
                  <ExerciseMotion slug={pack.exercises[0]?.slug ?? null} name={pack.label} muscle="piernas" labelled={false} className="aspect-[3/2] w-24 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{pack.label}</span>
                    <span className="mt-0.5 block text-sm leading-5 text-muted">{pack.summary}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-lime px-3 py-2 text-sm font-semibold text-white">{action}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
