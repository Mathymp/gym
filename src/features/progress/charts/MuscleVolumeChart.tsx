import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MuscleBar } from "./types";

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

export function MuscleVolumeChart({ bars }: { bars: MuscleBar[] }) {
  if (bars.length === 0 || !bars.some((b) => Number.isFinite(b.volume))) return null;

  const animate = !prefersReducedMotion();
  // Horizontal bars: keep the chart readable by growing with the number of groups.
  const height = Math.max(220, bars.length * 34 + 24);

  return (
    <div
      style={{ width: "100%", height }}
      role="img"
      aria-label="Volumen por grupo muscular"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bars}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={(v: number) => numberFormat.format(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            width={84}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: GRID, fillOpacity: 0.5 }}
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
          <Bar
            dataKey="volume"
            name="Volumen"
            fill={LIME}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={animate}
            animationDuration={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
