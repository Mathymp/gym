export const TZ = "America/Santiago";

const weekdayIndex: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export const WEEKDAY_LABELS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export function asDate(input: Date | string | number) {
  return input instanceof Date ? input : new Date(input);
}

export function santiagoDate(input: Date | string | number = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asDate(input));
}

export function santiagoWeekday(input: Date | string | number = new Date()) {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(asDate(input));
  return weekdayIndex[label] ?? 1;
}

export function formatLongDate(input: Date | string | number = new Date()) {
  const text = new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(asDate(input));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMediumDate(input: Date | string | number) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(asDate(input));
}

export function formatDateTime(input: Date | string | number) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(asDate(input));
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatKg(value: number) {
  return `${formatNumber(value)} kg`;
}

export function formatCm(value: number) {
  return `${formatNumber(value)} cm`;
}

export function formatSignedKg(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value))} kg`;
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatMinutes(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function addIsoDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isoWeekday(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return utc === 0 ? 7 : utc;
}

export function startOfIsoWeek(iso: string) {
  return addIsoDays(iso, 1 - isoWeekday(iso));
}

export function monthGrid(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const [y, m] = first.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = isoWeekday(first) - 1;
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthTitle(year: number, month: number) {
  const text = new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function weekdayShort(index: number) {
  return ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][index] ?? "";
}
