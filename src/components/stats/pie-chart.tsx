"use client";

import { memo } from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
  type TooltipContentProps,
} from "recharts";
import { formatInt, formatPct } from "./stats-utils";

export interface PieSlice {
  key: string;
  label: string;
  value: number;
  /** Phần trăm đã chia bằng phần dư lớn nhất (tổng = 100). */
  pct: number;
  /** Biến CSS màu, vd "var(--viz-s1)". Recharts đọc thuộc tính `fill` từ dữ liệu. */
  fill: string;
}

/** Lát nhỏ hơn ngưỡng này không in nhãn trên biểu đồ (vẫn có ở legend/tooltip/bảng). */
const MIN_LABEL_PCT = 4;
const RAD = Math.PI / 180;

function SliceLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, outerRadius } = props;
  const slice = props.payload as PieSlice | undefined;
  if (
    !slice ||
    slice.pct < MIN_LABEL_PCT ||
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    typeof midAngle !== "number" ||
    typeof outerRadius !== "number"
  ) {
    return null;
  }
  const cos = Math.cos(-midAngle * RAD);
  const sin = Math.sin(-midAngle * RAD);
  const r = outerRadius + 8;
  return (
    <text
      x={cx + r * cos}
      y={cy + r * sin}
      textAnchor={cos >= 0 ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
      fill="var(--foreground)"
      className="tabular-nums"
    >
      {formatPct(slice.pct)}
    </text>
  );
}

function PieTooltip({ active, payload }: TooltipContentProps) {
  const slice = payload?.[0]?.payload as PieSlice | undefined;
  if (!active || !slice) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-0.5 w-3 shrink-0 rounded"
          style={{ backgroundColor: slice.fill }}
        />
        <span className="font-semibold tabular-nums">
          {formatInt(slice.value)} · {formatPct(slice.pct)}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{slice.label}</div>
    </div>
  );
}

/**
 * Donut recharts. Chỉ nhận các lát có giá trị > 0; tổng ở giữa là HTML phủ lên
 * (không nhận sự kiện chuột nên tooltip vẫn hoạt động).
 */
function PieChartView({
  slices,
  total,
  unit,
}: {
  slices: PieSlice[];
  total: number;
  unit: string;
}) {
  return (
    <div className="relative h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="42%"
            outerRadius="68%"
            startAngle={90}
            endAngle={-270}
            stroke="var(--card)"
            strokeWidth={2}
            label={SliceLabel}
            labelLine={false}
            isAnimationActive={false}
          />
          <Tooltip content={PieTooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-2xl leading-none font-semibold tabular-nums">
          {formatInt(total)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export default memo(PieChartView);
