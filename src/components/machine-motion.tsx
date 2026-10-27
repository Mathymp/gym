import { useEffect, useState, type ReactNode } from "react";
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
  "press-inclinado-mancuernas": "press",
  "press-pecho-maquina": "press",
  "press-frances": "press",
  "peck-deck": "fly",
  "aperturas-mancuernas": "fly",
  "cruce-poleas": "fly",
  "fondos-pecho": "dip",
  "fondos-asistidos": "dip",
  "jalon-pecho": "pulldown",
  dominadas: "pulldown",
  "dominadas-asistidas": "pulldown",
  "remo-sentado": "row",
  "remo-maquina": "row",
  "remo-mancuerna": "row",
  "remo-barra": "row",
  "face-pulls": "row",
  "pullover-polea": "pulldown",
  "press-militar": "overhead",
  "press-hombros": "overhead",
  "press-hombros-maquina": "overhead",
  "extension-overhead": "overhead",
  "elevaciones-laterales": "raise",
  "elevaciones-frontales": "raise",
  pajaros: "raise",
  "curl-biceps": "curl",
  "curl-mancuernas": "curl",
  "curl-barra": "curl",
  "curl-martillo": "curl",
  "curl-polea": "curl",
  "curl-predicador": "curl",
  "extension-polea": "pushdown",
  "extension-triceps": "pushdown",
  sentadillas: "squat",
  "sentadilla-goblet": "squat",
  "hack-squat": "squat",
  zancadas: "squat",
  "prensa-piernas": "legpress",
  "prensa-45": "legpress",
  "prensa-horizontal": "legpress",
  "extension-cuadriceps": "legext",
  "curl-femoral-sentado": "legcurl",
  "curl-femoral-acostado": "legcurl",
  "peso-muerto-rumano": "hinge",
  "peso-muerto-rumano-mancuernas": "hinge",
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

function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return still;
}

function Motion({
  type,
  values,
  dur = "2.6s",
  still,
  children,
}: {
  type: "translate" | "rotate";
  values: string;
  dur?: string;
  still: boolean;
  children: ReactNode;
}) {
  return (
    <g>
      {still ? null : (
        <animateTransform attributeName="transform" type={type} values={values} dur={dur} repeatCount="indefinite" />
      )}
      {children}
    </g>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <rect width="320" height="160" rx="18" fill="#161814" />
      <path d="M28 138h264" stroke="#2a2e26" strokeWidth="2" />
      {children}
    </>
  );
}

function Scene({ kind, still }: { kind: Kind; still: boolean }) {
  if (kind === "press" || kind === "fly") {
    const open = kind === "fly";
    return (
      <Frame>
        <rect x="108" y="78" width="70" height="46" rx="8" fill="#2a2e26" />
        <rect x="86" y="58" width="22" height="52" rx="6" fill="#3a3f34" />
        <circle cx="118" cy="70" r="8" fill="#f4f5f0" />
        <Motion type="rotate" values={open ? "-28 128 86; 8 128 86; -28 128 86" : "8 128 86; 34 128 86; 8 128 86"} still={still}>
          <rect x="128" y="82" width="78" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="206" cy="86" r="7" fill="#d6ef6e" />
        </Motion>
        <Motion type="rotate" values={open ? "28 128 102; -8 128 102; 28 128 102" : "-8 128 102; -34 128 102; -8 128 102"} still={still}>
          <rect x="128" y="98" width="78" height="8" rx="4" fill="#c0dc4e" />
          <circle cx="206" cy="102" r="7" fill="#c0dc4e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "pulldown" || kind === "dip") {
    return (
      <Frame>
        <rect x="150" y="24" width="8" height="92" rx="3" fill="#3a3f34" />
        <rect x="118" y="92" width="36" height="40" rx="8" fill="#2a2e26" />
        <circle cx="136" cy="78" r="8" fill="#f4f5f0" />
        <Motion type="translate" values="0 0; 0 22; 0 0" still={still}>
          <rect x="92" y="36" width="124" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="96" cy="40" r="6" fill="#d6ef6e" />
          <circle cx="212" cy="40" r="6" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "row") {
    return (
      <Frame>
        <rect x="70" y="96" width="120" height="12" rx="6" fill="#2a2e26" />
        <rect x="176" y="70" width="16" height="50" rx="6" fill="#3a3f34" />
        <circle cx="168" cy="78" r="8" fill="#f4f5f0" />
        <Motion type="translate" values="28 0; 0 0; 28 0" still={still}>
          <rect x="70" y="74" width="86" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="74" cy="78" r="7" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "overhead" || kind === "raise") {
    const lateral = kind === "raise";
    return (
      <Frame>
        <rect x="146" y="70" width="28" height="58" rx="10" fill="#2a2e26" />
        <circle cx="160" cy="58" r="10" fill="#f4f5f0" />
        <Motion type="rotate" values={lateral ? "70 146 78; 10 146 78; 70 146 78" : "40 146 78; -10 146 78; 40 146 78"} still={still}>
          <rect x="78" y="74" width="68" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="82" cy="78" r="6" fill="#d6ef6e" />
        </Motion>
        <Motion type="rotate" values={lateral ? "-70 174 78; -10 174 78; -70 174 78" : "-40 174 78; 10 174 78; -40 174 78"} still={still}>
          <rect x="174" y="74" width="68" height="8" rx="4" fill="#c0dc4e" />
          <circle cx="238" cy="78" r="6" fill="#c0dc4e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "curl" || kind === "pushdown") {
    const down = kind === "pushdown";
    return (
      <Frame>
        <rect x="118" y="28" width="8" height="70" rx="3" fill="#3a3f34" />
        <rect x="138" y="78" width="26" height="52" rx="10" fill="#2a2e26" />
        <circle cx="151" cy="66" r="9" fill="#f4f5f0" />
        <Motion type="rotate" values={down ? "-70 154 84; -8 154 84; -70 154 84" : "-8 154 84; -78 154 84; -8 154 84"} still={still}>
          <rect x="154" y="80" width="62" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="214" cy="84" r="6" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "squat" || kind === "legpress") {
    if (kind === "legpress") {
      return (
        <Frame>
          <rect x="36" y="78" width="78" height="46" rx="10" fill="#2a2e26" />
          <rect x="28" y="48" width="22" height="70" rx="8" fill="#3a3f34" />
          <circle cx="78" cy="66" r="11" fill="#f4f5f0" />
          <Motion type="translate" values="0 0; 28 -8; 0 0" still={still}>
            <rect x="168" y="42" width="22" height="78" rx="8" fill="#d6ef6e" transform="rotate(-18 179 81)" />
            <rect x="132" y="96" width="70" height="10" rx="5" fill="#c0dc4e" />
          </Motion>
          <rect x="118" y="108" width="54" height="10" rx="5" fill="#9aa193" />
        </Frame>
      );
    }
    return (
      <Frame>
        <rect x="118" y="28" width="84" height="8" rx="4" fill="#3a3f34" />
        <Motion type="translate" values="0 0; 0 18; 0 0" still={still}>
          <circle cx="160" cy="58" r="12" fill="#f4f5f0" />
          <rect x="146" y="74" width="28" height="40" rx="10" fill="#2a2e26" />
          <rect x="124" y="108" width="72" height="10" rx="5" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "hinge") {
    return (
      <Frame>
        <circle cx="168" cy="124" r="7" fill="#9aa193" />
        <Motion type="rotate" values="-8 168 124; -42 168 124; -8 168 124" still={still}>
          <rect x="160" y="62" width="16" height="64" rx="8" fill="#2a2e26" />
          <circle cx="168" cy="52" r="9" fill="#f4f5f0" />
          <rect x="96" y="92" width="72" height="8" rx="4" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "legcurl" || kind === "legext") {
    const curl = kind === "legcurl";
    return (
      <Frame>
        <rect x="70" y="78" width="110" height="16" rx="8" fill="#2a2e26" />
        <circle cx="92" cy="70" r="8" fill="#f4f5f0" />
        <Motion type="rotate" values={curl ? "0 168 86; -55 168 86; 0 168 86" : "-50 168 86; 8 168 86; -50 168 86"} still={still}>
          <rect x="168" y="82" width="58" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="226" cy="86" r="7" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "thrust" || kind === "crunch" || kind === "plank") {
    return (
      <Frame>
        <rect x="188" y="78" width="28" height="48" rx="8" fill="#3a3f34" />
        <Motion type="rotate" values={kind === "plank" ? "-8 196 96; -2 196 96; -8 196 96" : "18 196 96; -6 196 96; 18 196 96"} still={still} dur="2.8s">
          <rect x="96" y="90" width="100" height="14" rx="7" fill="#2a2e26" />
          <circle cx="104" cy="84" r="8" fill="#f4f5f0" />
          <rect x="132" y="78" width="46" height="8" rx="4" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  if (kind === "knee" || kind === "calf" || kind === "abduct") {
    return (
      <Frame>
        <rect x="148" y="36" width="8" height="78" rx="3" fill="#3a3f34" />
        <circle cx="152" cy="58" r="8" fill="#f4f5f0" />
        <rect x="140" y="70" width="24" height="40" rx="8" fill="#2a2e26" />
        <Motion type={kind === "abduct" ? "rotate" : "translate"} values={kind === "abduct" ? "10 152 112; 28 152 112; 10 152 112" : kind === "calf" ? "0 8; 0 0; 0 8" : "0 18; 0 0; 0 18"} still={still}>
          <rect x="132" y="108" width="40" height="8" rx="4" fill="#d6ef6e" />
          <circle cx="170" cy="112" r="6" fill="#d6ef6e" />
        </Motion>
      </Frame>
    );
  }
  return (
    <Frame>
      <rect x="46" y="108" width="228" height="10" rx="5" fill="#2a2e26" />
      <Motion type="translate" values="0 0; 86 0; 0 0" still={still} dur="2.2s">
        <rect x="58" y="96" width="36" height="12" rx="4" fill="#d6ef6e" />
      </Motion>
      <circle cx="214" cy="78" r="22" fill="none" stroke="#3a3f34" strokeWidth="8" />
      <Motion type="rotate" values="0 214 78; 360 214 78" still={still} dur="2.2s">
        <rect x="210" y="58" width="8" height="22" rx="3" fill="#d6ef6e" />
      </Motion>
    </Frame>
  );
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
  const still = useStill();
  const kind = (slug && KIND[slug]) || FALLBACK[muscle];
  return (
    <figure className={compact ? "mt-3" : ""}>
      <svg viewBox="0 0 320 160" className={`block w-full ${compact ? "h-28" : "h-44"}`} role="img" aria-label={`Diagrama animado de ${name}`}>
        <title>{name}</title>
        <Scene kind={kind} still={still} />
      </svg>
      <figcaption className="mt-1 text-xs text-faint">Diagrama del movimiento en la máquina</figcaption>
    </figure>
  );
}
