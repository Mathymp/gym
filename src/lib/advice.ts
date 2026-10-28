import { formatKg, formatMediumDate } from "@/lib/format";

export type AdviceEntry = {
  exercise_id: string;
  session_id: string;
  started_at: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  is_warmup: boolean;
};

export type Advice = {
  line: string;
  suggestion: string;
  date: string;
  weight: number | null;
  reps: number[];
  nextWeight: number | null;
};

export function previousAdvice(
  entries: AdviceEntry[],
  exerciseId: string,
  sessionId: string,
  target: { min: number | null; max: number | null } | null,
  equipment = "",
): Advice | null {
  const rows = entries.filter((entry) => entry.exercise_id === exerciseId && entry.session_id !== sessionId && !entry.is_warmup);
  if (rows.length === 0) return null;
  const latest = rows[0].session_id;
  const sets = rows.filter((entry) => entry.session_id === latest).reverse();
  const dated = formatMediumDate(rows[0].started_at);
  const reps = sets.map((entry) => entry.reps).filter((value): value is number => value != null);
  const weight = sets.reduce<number | null>((top, entry) => (entry.weight_kg != null && (top == null || entry.weight_kg > top) ? entry.weight_kg : top), null);
  const seconds = sets.find((entry) => entry.duration_seconds)?.duration_seconds ?? null;
  const line = weight != null && reps.length
    ? `Antes, ${dated}: ${formatKg(weight)} × ${reps.join(", ")}`
    : reps.length
      ? `Antes, ${dated}: ${reps.join(", ")} reps`
      : seconds
        ? `Antes, ${dated}: ${seconds} s`
        : null;
  if (!line) return null;
  const step = /mancuerna/i.test(equipment) ? 2 : 2.5;
  let nextWeight = weight;
  let suggestion = "Parte con ese peso. Si completas el rango en todas las series, la próxima sube un poco.";
  if (target?.max != null && reps.length > 0 && reps.every((value) => value >= target.max!)) {
    nextWeight = weight != null ? weight + step : null;
    suggestion = nextWeight != null ? `La vez anterior llegaste al tope. Prueba ${formatKg(nextWeight)}.` : "La vez anterior llegaste al tope. Sube un poco.";
  } else if (target?.min != null && reps.some((value) => value < target.min!)) {
    suggestion = "La vez anterior te quedaste bajo el rango. Mantén el peso.";
  }
  return { line, suggestion, date: rows[0].started_at, weight, reps, nextWeight };
}
