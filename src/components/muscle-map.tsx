import { exerciseLevels, musclesFor, REGION_LABEL, type MuscleLevels, type Region } from "@/lib/muscles";
import type { Exercise } from "@/lib/types";

const FILL = ["#cdd8e6", "#f9b4b5", "#f07275", "#e5484d"];
const JOINT = "#dfe6f0";

type Shape = { region: Region; d: string; mirror?: boolean };

const DELTOID = "M30 39 C23 40 19 46 19 54 C19 59 21 63 23 66 C26 60 30 54 34 49 C36 45 35 41 30 39 Z";
const UPPER_ARM = "M22 68 C19 74 18 82 19 88 C21 91 25 91 27 88 C29 82 30 75 29 68 C27 65 24 65 22 68 Z";
const FOREARM = "M18 92 C15 99 14 107 15 114 C17 116 20 116 21 114 C23 106 26 99 27 92 C24 90 20 90 18 92 Z";

const FRONT: Shape[] = [
  { region: "trapecio", d: "M44 30 C41 34 36 37 31 39 L45 40 Z", mirror: true },
  { region: "hombros", d: DELTOID, mirror: true },
  { region: "pecho", d: "M48 42 L37 42 C32 46 29 52 29 58 C31 66 38 69 45 68 C48 67 49 64 49 60 Z", mirror: true },
  { region: "biceps", d: UPPER_ARM, mirror: true },
  { region: "antebrazos", d: FOREARM, mirror: true },
  { region: "oblicuos", d: "M31 68 C30 76 31 86 34 95 C36 101 39 105 41 106 L41 72 C38 71 34 70 31 68 Z", mirror: true },
  { region: "abdomen", d: "M43 71 C46 70 54 70 57 71 L57 104 C55 109 52 111 50 111 C48 111 45 109 43 104 Z" },
  { region: "cuadriceps", d: "M32 112 C28 124 27 140 29 154 C31 160 36 161 39 157 C42 146 44 132 45 117 C42 113 37 111 32 112 Z", mirror: true },
  { region: "aductores", d: "M47 114 C49 122 49 134 46 146 C45 138 45 126 46 116 Z", mirror: true },
  { region: "gemelos", d: "M30 170 C28 180 29 192 32 199 C34 201 37 200 38 198 C39 190 40 180 39 170 C36 167 32 167 30 170 Z", mirror: true },
];

const BACK: Shape[] = [
  { region: "trapecio", d: "M50 27 C47 31 42 35 31 39 C38 43 44 48 47 60 L50 74 L53 60 C56 48 62 43 69 39 C58 35 53 31 50 27 Z" },
  { region: "hombros", d: DELTOID, mirror: true },
  { region: "dorsales", d: "M33 50 C30 60 31 72 35 82 C38 88 42 91 46 92 L48 76 C46 64 42 56 33 50 Z", mirror: true },
  { region: "triceps", d: UPPER_ARM, mirror: true },
  { region: "antebrazos", d: FOREARM, mirror: true },
  { region: "lumbar", d: "M45 94 C48 96 52 96 55 94 L56 106 C53 108 47 108 44 106 Z" },
  { region: "gluteos", d: "M49 110 C43 108 36 109 33 115 C30 122 32 131 38 134 C44 136 48 133 49 128 Z", mirror: true },
  { region: "isquios", d: "M32 138 C29 146 29 154 31 160 C34 162 38 161 40 158 C43 151 45 144 46 138 C41 135 36 135 32 138 Z", mirror: true },
  { region: "gemelos", d: "M31 166 C27 174 28 186 32 192 C35 194 38 193 39 190 C41 182 41 174 39 166 C36 163 33 163 31 166 Z", mirror: true },
];

const MIRROR = "translate(100 0) scale(-1 1)";

function Joints({ view }: { view: "front" | "back" }) {
  return (
    <g fill={JOINT}>
      <ellipse cx="50" cy="15" rx="9" ry="11" />
      <rect x="45" y="24" width="10" height="9" rx="3" />
      {[0, 1].map((side) => (
        <g key={side} transform={side ? MIRROR : undefined}>
          <ellipse cx="16.5" cy="121" rx="3.6" ry="5.2" />
          <ellipse cx="35" cy={view === "front" ? 163.5 : 162.5} rx="5" ry="3.6" />
          <ellipse cx="35" cy="204" rx="5.5" ry="3" />
        </g>
      ))}
    </g>
  );
}

export function MuscleFigure({ view, levels, className }: { view: "front" | "back"; levels: MuscleLevels; className?: string }) {
  const shapes = view === "front" ? FRONT : BACK;
  return (
    <svg viewBox="0 0 100 210" className={className} aria-hidden>
      <Joints view={view} />
      <g stroke="#f3f6fb" strokeWidth="1.2" strokeLinejoin="round">
        {shapes.map((shape, index) => {
          const level = levels[shape.region] ?? 0;
          const fill = FILL[level];
          const hit = level > 0 ? "muscle-hit" : undefined;
          const style = { transition: "fill 400ms ease", animationDelay: `${index * 40}ms` };
          return (
            <g key={`${shape.region}-${index}`}>
              <path d={shape.d} fill={fill} className={hit} style={style} />
              {shape.mirror ? <path d={shape.d} fill={fill} className={hit} style={style} transform={MIRROR} /> : null}
            </g>
          );
        })}
        {view === "front" ? (
          <path d="M50 72 V109 M43.5 80 H56.5 M43.5 88 H56.5 M43.5 96 H56.5" fill="none" strokeWidth="0.9" />
        ) : (
          <path d="M50 30 V73" fill="none" strokeWidth="0.7" />
        )}
      </g>
    </svg>
  );
}

export function MuscleMap({ levels, className, labels = true }: { levels: MuscleLevels; className?: string; labels?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-1 ${className ?? ""}`}>
      {(["front", "back"] as const).map((view) => (
        <figure key={view} className="m-0 flex flex-col items-center">
          <MuscleFigure view={view} levels={levels} className="h-auto w-full" />
          {labels ? <figcaption className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">{view === "front" ? "Frente" : "Espalda"}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

export function ExerciseMuscles({ exercise, className }: { exercise: Pick<Exercise, "slug" | "muscle_group" | "secondary_muscles">; className?: string }) {
  const split = musclesFor(exercise);
  const levels = exerciseLevels(exercise);
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      <MuscleMap levels={levels} className="w-[8.5rem] shrink-0" />
      <dl className="min-w-0 text-xs leading-5">
        {split.primary.length ? (
          <div>
            <dt className="sr-only">Trabaja</dt>
            <dd className="flex flex-wrap gap-1">
              {split.primary.map((region) => (
                <span key={region} className="inline-flex items-center gap-1 rounded-md bg-[#fdecec] px-1.5 py-0.5 font-semibold text-[#b42318]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]" aria-hidden />
                  {REGION_LABEL[region]}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        {split.secondary.length ? (
          <div className="mt-1 text-muted">
            <dt className="inline">Apoyan: </dt>
            <dd className="inline">{split.secondary.map((region) => REGION_LABEL[region].toLowerCase()).join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
