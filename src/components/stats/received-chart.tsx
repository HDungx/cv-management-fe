"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Granularity, StatsResponse } from "@/lib/stats-types";
import { SERIES_COLOR } from "./viz-theme";
import { formatInt, periodLongLabel, periodShortLabel } from "./stats-utils";

interface Point {
  label: string;
  fullLabel: string;
  count: number;
}

const TICK = { fill: "var(--muted-foreground)", fontSize: 11 };
const AXIS_LINE = { stroke: "var(--border)" };
const CURSOR = { fill: "var(--muted)", opacity: 0.6 };
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-0.5 w-3 rounded"
          style={{ backgroundColor: SERIES_COLOR }}
        />
        <span className="font-semibold tabular-nums">
          {formatInt(point.count)} CV
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {point.fullLabel}
      </div>
    </div>
  );
}

export default function ReceivedChart({
  data,
  granularity,
}: {
  data: StatsResponse["received"];
  granularity: Granularity;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const points = useMemo<Point[]>(
    () =>
      data.map((d) => ({
        label: periodShortLabel(d.periodStart, granularity),
        fullLabel: periodLongLabel(d.periodStart, granularity),
        count: d.count,
      })),
    [data, granularity],
  );

  const summary = useMemo(() => {
    const total = points.reduce((s, p) => s + p.count, 0);
    const peak = points.reduce<Point | null>(
      (best, p) => (best === null || p.count > best.count ? p : best),
      null,
    );
    return { total, peak };
  }, [points]);

  const unit = granularity === "week" ? "tuần" : "tháng";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Tổng{" "}
          <strong className="text-foreground">
            {formatInt(summary.total)}
          </strong>{" "}
          CV trong {points.length} {unit}
          {summary.peak && summary.peak.count > 0 && (
            <>
              ; cao nhất {formatInt(summary.peak.count)} (
              {summary.peak.fullLabel.toLowerCase()})
            </>
          )}
          .
        </p>
        <div
          className="flex shrink-0 gap-1"
          role="group"
          aria-label="Kiểu hiển thị"
        >
          <Button
            size="sm"
            variant={view === "chart" ? "secondary" : "ghost"}
            aria-pressed={view === "chart"}
            onClick={() => setView("chart")}
          >
            Biểu đồ
          </Button>
          <Button
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            Bảng
          </Button>
        </div>
      </div>

      {view === "chart" ? (
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={MARGIN} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={TICK}
                tickLine={false}
                axisLine={AXIS_LINE}
                interval="preserveStartEnd"
                minTickGap={14}
              />
              <YAxis
                allowDecimals={false}
                tick={TICK}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={ChartTooltip} cursor={CURSOR} />
              <Bar
                dataKey="count"
                name="CV nhận"
                fill={SERIES_COLOR}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kỳ</TableHead>
                <TableHead className="text-right">Số CV nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((p, i) => (
                <TableRow key={data[i].periodStart}>
                  <TableCell>{p.fullLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(p.count)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
