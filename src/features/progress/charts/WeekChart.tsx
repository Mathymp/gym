import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type { WeekBar } from "./types";

const GRID = "#d5e1f0";
const TICK = "#52627a";
const LIME = "#1d4ed8";
const TEXT = "#122033";
const SURFACE = "#ffffff";

const numberFormat = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

const tick = { fill: TICK, fontSize: 12 };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function WeekTooltip({ active, payload, label }: TooltipContentProps) {
  const week = payload?.[0]?.payload as WeekBar | undefined;
  if (!active || !week) return null;

  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${GRID}`,
        borderRadius: 12,
        color: TEXT,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ margin: 0, marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0 }}>Entrenamientos: {numberFormat.format(week.workouts)}</p>
      <p style={{ margin: 0 }}>Minutos: {numberFormat.format(week.minutes)} min</p>
    </div>
  );
}

export function WeekChart({ weeks }: { weeks: WeekBar[] }) {
  if (weeks.length === 0 || !weeks.some((w) => Number.isFinite(w.workouts))) return null;

  const animate = !prefersReducedMotion();

  return (
    <div
      style={{ width: "100%", height: 220 }}
      role="img"
      aria-label="Entrenamientos por semana"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={16}
          />
          <YAxis
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
          />
          <Tooltip cursor={{ fill: GRID, fillOpacity: 0.5 }} content={WeekTooltip} />
          <Bar
            dataKey="workouts"
            name="Entrenamientos"
            fill={LIME}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            isAnimationActive={animate}
            animationDuration={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
