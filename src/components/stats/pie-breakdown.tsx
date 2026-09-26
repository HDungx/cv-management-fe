"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PieSlice } from "./pie-chart";
import { allocatePercents, formatInt, formatPct } from "./stats-utils";

// recharts đo kích thước qua DOM nên chỉ render ở client; tách bundle riêng.
const PieChartView = dynamic(() => import("./pie-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-60 w-full items-center justify-center">
      <Skeleton className="size-40 rounded-full" />
    </div>
  ),
});

export interface PieInput {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Biểu đồ tròn (donut) + legend có số lượng và %, kèm chế độ xem dạng bảng.
 * Legend/bảng luôn liệt kê đủ mọi mục (kể cả 0); biểu đồ chỉ vẽ mục > 0.
 * Thông tin không chỉ nằm ở màu: tên + số lượng + % có ở legend, tooltip và bảng.
 */
function PieBreakdownImpl({
  items,
  ariaLabel,
  unit = "ứng viên",
  dimensionLabel,
}: {
  items: PieInput[];
  ariaLabel: string;
  unit?: string;
  dimensionLabel: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const { rows, total, drawn, top, summary } = useMemo(() => {
    const sum = items.reduce((s, i) => s + i.value, 0);
    const pcts = allocatePercents(items.map((i) => i.value));
    const all = items.map<PieSlice>((item, i) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      pct: pcts[i],
      fill: item.color,
    }));
    const biggest = all.reduce<PieSlice | null>(
      (best, s) => (best === null || s.value > best.value ? s : best),
      null,
    );
    const text =
      `${ariaLabel}: tổng ${formatInt(sum)} ${unit}. ` +
      all
        .filter((s) => s.value > 0)
        .map((s) => `${s.label} ${formatInt(s.value)} (${formatPct(s.pct)})`)
        .join("; ") +
      ".";
    return {
      rows: all,
      total: sum,
      drawn: all.filter((s) => s.value > 0),
      top: biggest,
      summary: text,
    };
  }, [items, ariaLabel, unit]);

  return (
    <div className="@container space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Tổng{" "}
          <strong className="text-foreground tabular-nums">
            {formatInt(total)}
          </strong>{" "}
          {unit}
          {top && top.value > 0 && (
            <>
              ; nhiều nhất: {top.label} (
              <span className="tabular-nums">
                {formatInt(top.value)}, {formatPct(top.pct)}
              </span>
              )
            </>
          )}
          .
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          aria-pressed={view === "table"}
          onClick={() => setView(view === "chart" ? "table" : "chart")}
        >
          {view === "chart" ? "Xem dạng bảng" : "Xem dạng biểu đồ"}
        </Button>
      </div>

      {view === "chart" ? (
        <div className="flex flex-col items-center gap-4 @lg:flex-row">
          <div
            role="img"
            aria-label={summary}
            className="w-full max-w-[280px] shrink-0"
          >
            <PieChartView slices={drawn} total={total} unit={unit} />
          </div>
          <ul
            aria-label={`Chú giải: ${ariaLabel}`}
            className="w-full min-w-0 flex-1 space-y-1"
          >
            {rows.map((r) => (
              <li
                key={r.key}
                className="flex items-center gap-2 rounded-md px-1 py-0.5 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: r.fill }}
                />
                <span className="min-w-0 flex-1 truncate" title={r.label}>
                  {r.label}
                </span>
                <span className="font-medium tabular-nums">
                  {formatInt(r.value)}
                </span>
                <span className="w-14 text-right text-muted-foreground tabular-nums">
                  {formatPct(r.pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dimensionLabel}</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead className="text-right">Tỷ lệ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-[3px]"
                        style={{ backgroundColor: r.fill }}
                      />
                      {r.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(r.value)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPct(r.pct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Tổng</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatInt(total)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {total > 0 ? formatPct(100) : "—"}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}

export const PieBreakdown = memo(PieBreakdownImpl);
