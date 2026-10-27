import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeightPoint } from "./types";

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

export function WeightChart({ points }: { points: WeightPoint[] }) {
  const hasWeight = points.some((p) => Number.isFinite(p.weight));
  if (points.length === 0 || !hasWeight) return null;

  const hasAverage = points.some((p) => p.average !== null && Number.isFinite(p.average));
  const animate = !prefersReducedMotion();

  return (
    <div style={{ width: "100%", height: 220 }} role="img" aria-label="Gráfico de peso">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              (dataMin: number) => Math.floor(dataMin - 1),
              (dataMax: number) => Math.ceil(dataMax + 1),
            ]}
            tickFormatter={(v: number) => numberFormat.format(v)}
          />
          <Tooltip
            cursor={{ stroke: GRID }}
            contentStyle={{
              background: SURFACE,
              border: `1px solid ${GRID}`,
              borderRadius: 12,
              color: TEXT,
            }}
            labelStyle={{ color: TEXT }}
            itemStyle={{ color: TEXT }}
            formatter={(value, name) => [
              typeof value === "number" ? `${numberFormat.format(value)} kg` : "—",
              name,
            ]}
          />
          <Line
            type="monotone"
            dataKey="weight"
            name="Peso"
            stroke={LIME}
            strokeWidth={2}
            dot={points.length === 1 ? { r: 3, fill: LIME, stroke: LIME } : false}
            activeDot={{ r: 4, fill: LIME, stroke: SURFACE }}
            isAnimationActive={animate}
            animationDuration={400}
          />
          {hasAverage && (
            <Line
              type="monotone"
              dataKey="average"
              name="Promedio semanal"
              stroke={TICK}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, fill: TICK, stroke: SURFACE }}
              connectNulls
              isAnimationActive={animate}
              animationDuration={400}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
