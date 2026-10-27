import { addIsoDays, startOfIsoWeek } from "@/lib/format";

export type ProgramPhase = {
  week: number;
  title: string;
  easy: boolean;
  hint: string;
};

function dayNumber(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

export function programPhase(startedOn: string | null | undefined, easyThrough: string | null | undefined, today: string): ProgramPhase | null {
  if (!startedOn) return null;
  const elapsed = dayNumber(startOfIsoWeek(today)) - dayNumber(startOfIsoWeek(startedOn));
  const week = Math.max(1, Math.floor(elapsed / 7) + 1);
  const forcedEasy = Boolean(easyThrough && today <= easyThrough);
  if (week <= 2) {
    return {
      week,
      title: "Adaptación",
      easy: true,
      hint: "Semana de adaptación: donde el plan dice 3 series, hoy haces 2. Peso moderado, que te queden unas 2 o 3 repeticiones.",
    };
  }
  if (week <= 4) {
    return {
      week,
      title: "Series del plan",
      easy: forcedEasy,
      hint: forcedEasy
        ? "Esta semana está en fácil: 2 series donde el plan dice 3."
        : "Haz las series del plan. Busca el rango de repeticiones con buena postura.",
    };
  }
  if (week <= 6) {
    return {
      week,
      title: "Sube el peso",
      easy: forcedEasy,
      hint: forcedEasy
        ? "Esta semana está en fácil: 2 series donde el plan dice 3."
        : "Si completas el tope de repeticiones en todas las series, sube el peso lo mínimo.",
    };
  }
  if (week <= 8) {
    return {
      week,
      title: "Mantén",
      easy: forcedEasy,
      hint: forcedEasy
        ? "Esta semana está en fácil: 2 series donde el plan dice 3."
        : "Sigue la progresión. En la última serie de un aislado puedes acercarte al fallo, sin perder la postura.",
    };
  }
  return {
    week,
    title: "Bloque listo",
    easy: forcedEasy,
    hint: "Terminaron las 8 semanas. Puedes repetir el bloque o seguir con las series completas.",
  };
}

export function isEasyWeek(startedOn: string | null | undefined, easyThrough: string | null | undefined, today: string) {
  return programPhase(startedOn, easyThrough, today)?.easy ?? false;
}

export function endOfIsoWeek(iso: string) {
  return addIsoDays(startOfIsoWeek(iso), 6);
}
