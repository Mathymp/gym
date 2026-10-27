import type { MuscleGroup } from "@/lib/types";

type Kind =
  | "press"
  | "fly"
  | "pulldown"
  | "row"
  | "overhead"
  | "raise"
  | "curl"
  | "pushdown"
  | "squat"
  | "legpress"
  | "hinge"
  | "legcurl"
  | "legext"
  | "thrust"
  | "calf"
  | "plank"
  | "crunch"
  | "knee"
  | "cardio"
  | "dip"
  | "abduct";

const KIND: Record<string, Kind> = {
  "press-banca": "press",
  "press-inclinado-barra": "press",
  "press-inclinado-mancuernas": "raise",
  "press-pecho-maquina": "press",
  "press-frances": "press",
  "peck-deck": "fly",
  "aperturas-mancuernas": "raise",
  "cruce-poleas": "fly",
  "fondos-pecho": "dip",
  "fondos-asistidos": "dip",
  "jalon-pecho": "pulldown",
  dominadas: "pulldown",
  "dominadas-asistidas": "pulldown",
  "remo-sentado": "row",
  "remo-maquina": "row",
  "remo-mancuerna": "raise",
  "remo-barra": "row",
  "face-pulls": "row",
  "pullover-polea": "pulldown",
  "press-militar": "overhead",
  "press-hombros": "raise",
  "press-hombros-maquina": "overhead",
  "extension-overhead": "overhead",
  "elevaciones-laterales": "raise",
  "elevaciones-frontales": "raise",
  pajaros: "raise",
  "curl-biceps": "raise",
  "curl-mancuernas": "raise",
  "curl-barra": "curl",
  "curl-martillo": "raise",
  "curl-polea": "curl",
  "curl-predicador": "curl",
  "extension-polea": "pushdown",
  "extension-triceps": "pushdown",
  sentadillas: "squat",
  "sentadilla-goblet": "raise",
  "hack-squat": "squat",
  zancadas: "raise",
  "prensa-piernas": "legpress",
  "prensa-45": "legpress",
  "prensa-horizontal": "legpress",
  "extension-cuadriceps": "legext",
  "curl-femoral-sentado": "legcurl",
  "curl-femoral-acostado": "legcurl",
  "peso-muerto-rumano": "hinge",
  "peso-muerto-rumano-mancuernas": "raise",
  "peso-muerto": "hinge",
  "hip-thrust": "thrust",
  "puente-gluteo": "thrust",
  "elevaciones-pantorrillas": "calf",
  "gemelos-sentado": "calf",
  abductores: "abduct",
  plancha: "plank",
  crunch: "crunch",
  "crunch-maquina": "crunch",
  "elevaciones-piernas": "knee",
  "elevaciones-rodillas": "knee",
  caminadora: "cardio",
  bicicleta: "cardio",
  eliptica: "cardio",
  escaladora: "cardio",
};

const FALLBACK: Record<MuscleGroup, Kind> = {
  pecho: "press",
  espalda: "row",
  hombros: "overhead",
  biceps: "curl",
  triceps: "pushdown",
  piernas: "squat",
  abdomen: "crunch",
  cardio: "cardio",
};

export function machinePhotoSrc(slug: string | null, muscle: MuscleGroup) {
  const kind = (slug && KIND[slug]) || FALLBACK[muscle];
  return `${import.meta.env.BASE_URL}machines/${kind}.jpg?v=3`;
}

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
    <figure className={compact ? "mt-3" : ""}>
      <img
        src={machinePhotoSrc(slug, muscle)}
        alt={`Posición de ${name}`}
        width={960}
        height={720}
        className={`block w-full rounded-2xl bg-white object-contain ${compact ? "h-36" : "h-56"}`}
      />
    </figure>
  );
}
