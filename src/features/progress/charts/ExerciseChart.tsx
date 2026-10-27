import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExercisePoint } from "./types";

const GRID = "#2a2e26";
const TICK = "#9aa193";
const LIME = "#d6ef6e";
const TEXT = "#f4f5f0";
const SURFACE = "#1c1f1a";

const numberFormat = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });

const tick = { fill: TICK, fontSize: 12 };

const tooltipProps = {
  contentStyle: {
    background: SURFACE,
    border: `1px solid ${GRID}`,
    borderRadius: 12,
    color: TEXT,
  },
  labelStyle: { color: TEXT },
  itemStyle: { color: TEXT },
} as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function formatKg(value: unknown): string {
  return typeof value === "number" ? `${numberFormat.format(value)} kg` : "—";
}

export function ExerciseChart({
  points,
  mode,
}: {
  points: ExercisePoint[];
  mode: "weight" | "volume";
}) {
  const animate = !prefersReducedMotion();
  const margin = { top: 8, right: 8, bottom: 0, left: 0 };

  if (mode === "weight") {
    const data = points.filter((p) => p.weight !== null && Number.isFinite(p.weight));
    if (data.length === 0) return null;

    return (
      <div style={{ width: "100%", height: 220 }} role="img" aria-label="Gráfico del ejercicio">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margin}>
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
              width={44}
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.9)),
                (dataMax: number) => Math.ceil(dataMax * 1.05),
              ]}
              tickFormatter={(v: number) => numberFormat.format(v)}
            />
            <Tooltip
              cursor={{ stroke: GRID }}
              {...tooltipProps}
              formatter={(value, name) => [formatKg(value), name]}
            />
            <Line
              type="monotone"
              dataKey="weight"
              name="Peso"
              stroke={LIME}
              strokeWidth={2}
              dot={data.length === 1 ? { r: 3, fill: LIME, stroke: LIME } : false}
              activeDot={{ r: 4, fill: LIME, stroke: SURFACE }}
              isAnimationActive={animate}
              animationDuration={400}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (points.length === 0 || !points.some((p) => Number.isFinite(p.volume))) return null;

  return (
    <div style={{ width: "100%", height: 220 }} role="img" aria-label="Gráfico del ejercicio">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={margin}>
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
            width={44}
            domain={[0, "auto"]}
            tickFormatter={(v: number) => numberFormat.format(v)}
          />
          <Tooltip
            cursor={{ fill: GRID, fillOpacity: 0.5 }}
            {...tooltipProps}
            formatter={(value, name) => [formatKg(value), name]}
          />
          <Bar
            dataKey="volume"
            name="Volumen"
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
