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

export function programPhase(startedOn: string | null | undefined, _easyThrough: string | null | undefined, today: string): ProgramPhase | null {
  if (!startedOn) return null;
  const elapsed = dayNumber(startOfIsoWeek(today)) - dayNumber(startOfIsoWeek(startedOn));
  const week = Math.max(1, Math.floor(elapsed / 7) + 1);
  if (week <= 2) {
    return {
      week,
      title: "Retomar",
      easy: false,
      hint: "3 series en todo, con un peso que te deje 3 o 4 repeticiones en reserva. Si te cuesta, haz 4 o 5 ejercicios y suma el resto desde la semana 3.",
    };
  }
  if (week <= 4) {
    return {
      week,
      title: "Más esfuerzo",
      easy: false,
      hint: "Si recuperas bien, acerca el esfuerzo: que te queden 2 o 3 repeticiones en reserva.",
    };
  }
  if (week <= 8) {
    return {
      week,
      title: "Progresa",
      easy: false,
      hint: "Cuando completes el tope de repeticiones con buena técnica, sube el peso. Deja 1 a 3 repeticiones en reserva, sin ir al fallo siempre.",
    };
  }
  return {
    week,
    title: "Bloque listo",
    easy: false,
    hint: "Terminaron las 8 semanas. Revisa cómo recuperas y repite el bloque con más peso.",
  };
}

export function isEasyWeek(startedOn: string | null | undefined, easyThrough: string | null | undefined, today: string) {
  return programPhase(startedOn, easyThrough, today)?.easy ?? false;
}

export function endOfIsoWeek(iso: string) {
  return addIsoDays(startOfIsoWeek(iso), 6);
}
