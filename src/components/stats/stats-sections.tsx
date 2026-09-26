"use client";

import { useMemo } from "react";
import { StageBadge } from "@/components/stage-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { StatsResponse } from "@/lib/stats-types";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/types";
import { BarList, type BarItem } from "./bar-list";
import { BlockSkeleton, ChartCard, EmptyBlock } from "./chart-card";
import { formatDecimal, formatInt, formatPercent } from "./stats-utils";
import { PieBreakdown, type PieInput } from "./pie-breakdown";
import { categoryColor, sliceColor, stageColor } from "./viz-theme";

const MAX_SOURCE_SLICES = 6;

/* ---------------------------------- Funnel --------------------------------- */

export function FunnelCard({ data }: { data?: StatsResponse }) {
  const items = useMemo<PieInput[] | null>(() => {
    if (!data) return null;
    return data.funnel.map((f) => ({
      key: f.stage,
      label: STAGE_LABELS[f.stage],
      value: f.count,
      color: stageColor(f.stage),
    }));
  }, [data]);
  const total = data?.funnel.reduce((s, f) => s + f.count, 0) ?? 0;

  return (
    <ChartCard
      title="Phễu theo trạng thái"
      description="Trạng thái hiện tại của các ứng viên nhận trong khoảng đã chọn."
    >
      {!items ? (
        <BlockSkeleton rows={7} />
      ) : total === 0 ? (
        <EmptyBlock message="Chưa có ứng viên nào trong khoảng đã chọn." />
      ) : (
        <PieBreakdown
          items={items}
          ariaLabel="Ứng viên theo trạng thái"
          dimensionLabel="Trạng thái"
        />
      )}
    </ChartCard>
  );
}

/* ---------------------------------- Source --------------------------------- */

export function SourceCard({ data }: { data?: StatsResponse }) {
  const items = useMemo<PieInput[]>(() => {
    if (!data) return [];
    const rows = data.bySource
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((s, i) => ({
        key: `${s.source ?? "__null"}-${i}`,
        label: s.source ?? "Không rõ",
        value: s.count,
      }));
    const head = rows.slice(0, MAX_SOURCE_SLICES).map((r, i) => ({
      ...r,
      color: sliceColor(i),
    }));
    if (rows.length <= MAX_SOURCE_SLICES) return head;
    const rest = rows.slice(MAX_SOURCE_SLICES);
    return [
      ...head,
      {
        key: "__other",
        label: `Nguồn khác (${rest.length})`,
        value: rest.reduce((sum, r) => sum + r.value, 0),
        color: "var(--viz-other)",
      },
    ];
  }, [data]);

  return (
    <ChartCard
      title="Theo nguồn"
      description="Nguồn CV của các ứng viên nhận trong khoảng đã chọn."
    >
      {!data ? (
        <BlockSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyBlock message="Chưa có dữ liệu về nguồn CV." />
      ) : (
        <PieBreakdown
          items={items}
          ariaLabel="Ứng viên theo nguồn"
          dimensionLabel="Nguồn"
        />
      )}
    </ChartCard>
  );
}

/* ----------------------------------- Roles --------------------------------- */

function SalaryCell({
  salary,
}: {
  salary: StatsResponse["byRole"][number]["salary"];
}) {
  if (salary.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ul className="space-y-0.5">
      {salary.map((s) => {
        const min =
          s.avgMin != null
            ? formatMoney(Math.round(s.avgMin), s.currency)
            : null;
        const max =
          s.avgMax != null
            ? formatMoney(Math.round(s.avgMax), s.currency)
            : null;
        const text =
          min && max
            ? `${min} – ${max}`
            : min
              ? `Từ ${min}`
              : max
                ? `Đến ${max}`
                : "—";
        return (
          <li key={s.currency} className="whitespace-nowrap">
            {text}
            <span className="ml-1 text-xs text-muted-foreground">
              ({formatInt(s.samples)} mẫu)
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function RoleCard({ data }: { data?: StatsResponse }) {
  const rows = data?.byRole ?? [];
  const max = Math.max(0, ...rows.map((r) => r.count));

  return (
    <ChartCard
      title="Theo vị trí ứng tuyển"
      description="Top vị trí của ứng viên nhận trong khoảng đã chọn và lương kỳ vọng trung bình, tính riêng từng đơn vị tiền (chỉ trên hồ sơ có nhập lương)."
      className="lg:col-span-2"
    >
      {!data ? (
        <BlockSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyBlock message="Chưa có dữ liệu vị trí ứng tuyển." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vị trí</TableHead>
              <TableHead className="w-40 sm:w-64">Số ứng viên</TableHead>
              <TableHead>Lương kỳ vọng trung bình (min – max)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.role ?? "__null"}-${i}`}>
                <TableCell
                  className="max-w-48 truncate"
                  title={r.role ?? undefined}
                >
                  {r.role ?? (
                    <span className="text-muted-foreground">
                      Chưa có vị trí
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1">
                      <div
                        className="h-full rounded-r-[4px]"
                        style={{
                          width: `${max > 0 ? Math.max((r.count / max) * 100, 1.5) : 0}%`,
                          backgroundColor: "var(--viz-s1)",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium tabular-nums">
                      {formatInt(r.count)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <SalaryCell salary={r.salary} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ChartCard>
  );
}

/* ------------------------------ Stage durations ---------------------------- */

export function DurationCard({ data }: { data?: StatsResponse }) {
  const items = useMemo<BarItem[]>(() => {
    if (!data) return [];
    return data.stageDurations.map((d) => ({
      key: d.stage,
      label: STAGE_LABELS[d.stage],
      value: d.avgDays ?? 0,
      valueLabel: d.avgDays == null ? "—" : `${formatDecimal(d.avgDays)} ngày`,
      sublabel: d.samples > 0 ? `${formatInt(d.samples)} mẫu` : "Chưa có mẫu",
    }));
  }, [data]);
  const hasAny = data?.stageDurations.some((d) => d.avgDays != null) ?? false;

  return (
    <ChartCard
      title="Thời gian trung bình mỗi vòng"
      description="Số ngày ứng viên (nhận trong khoảng đã chọn) ở lại một trạng thái trước khi chuyển đi."
    >
      {!data ? (
        <BlockSkeleton rows={7} />
      ) : !hasAny ? (
        <EmptyBlock message="Chưa đủ lịch sử chuyển trạng thái để tính." />
      ) : (
        <BarList
          items={items}
          ariaLabel="Thời gian trung bình ở mỗi trạng thái"
        />
      )}
    </ChartCard>
  );
}

/* -------------------------------- Transitions ------------------------------ */

/** Cường độ ô: 8%–60% màu series trên nền thẻ; chữ luôn dùng màu ink. */
function cellBackground(ratio: number): string {
  const pct = 8 + Math.min(1, Math.max(0, ratio)) * 52;
  return `color-mix(in oklab, var(--viz-s1) ${pct}%, transparent)`;
}

export function TransitionCard({ data }: { data?: StatsResponse }) {
  const matrix = useMemo(() => {
    if (!data) return null;
    const cells = new Map<string, number>();
    const fromTotals = new Map<Stage, number>();
    const toSet = new Set<Stage>();
    for (const t of data.transitions) {
      cells.set(`${t.fromStage}>${t.toStage}`, t.count);
      fromTotals.set(t.fromStage, (fromTotals.get(t.fromStage) ?? 0) + t.count);
      toSet.add(t.toStage);
    }
    return {
      cells,
      fromTotals,
      rows: STAGES.filter((s) => (fromTotals.get(s) ?? 0) > 0),
      cols: STAGES.filter((s) => toSet.has(s)),
    };
  }, [data]);

  return (
    <ChartCard
      title="Tỷ lệ chuyển vòng"
      description="Mỗi hàng là trạng thái nguồn; mỗi ô là phần trăm lượt chuyển ra khỏi trạng thái đó đã đi tới trạng thái đích (mẫu số = tổng lượt chuyển ra của hàng; số nhỏ bên dưới là số lượt)."
      className="lg:col-span-2"
    >
      {!matrix ? (
        <BlockSkeleton rows={5} />
      ) : matrix.rows.length === 0 ? (
        <EmptyBlock message="Chưa có lượt chuyển trạng thái nào." />
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Từ trạng thái</TableHead>
                <TableHead className="text-right">
                  Tổng lượt chuyển ra
                </TableHead>
                {matrix.cols.map((c) => (
                  <TableHead key={c} className="text-center">
                    <span className="sr-only">Tới </span>
                    {STAGE_LABELS[c]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.rows.map((from) => {
                const total = matrix.fromTotals.get(from) ?? 0;
                return (
                  <TableRow key={from}>
                    <TableCell>
                      <StageBadge stage={from} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(total)}
                    </TableCell>
                    {matrix.cols.map((to) => {
                      const n = matrix.cells.get(`${from}>${to}`) ?? 0;
                      return (
                        <TableCell
                          key={to}
                          className="min-w-16 text-center tabular-nums"
                          style={
                            n > 0 && total > 0
                              ? { backgroundColor: cellBackground(n / total) }
                              : undefined
                          }
                          title={`${STAGE_LABELS[from]} → ${STAGE_LABELS[to]}: ${formatInt(n)}/${formatInt(total)} lượt`}
                        >
                          {n > 0 ? (
                            <>
                              <span className="font-medium">
                                {formatPercent(n, total)}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {formatInt(n)}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>0%</span>
            <span
              aria-hidden="true"
              className="h-2 w-24 rounded"
              style={{
                background: `linear-gradient(to right, ${cellBackground(0)}, ${cellBackground(1)})`,
                boxShadow: "inset 0 0 0 1px var(--border)",
              }}
            />
            <span>100% (theo tổng lượt chuyển ra của hàng)</span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

/* ---------------------------------- Skills --------------------------------- */

export function SkillsCard({ data }: { data?: StatsResponse }) {
  const { top, groups, legend } = useMemo(() => {
    if (!data) {
      return {
        top: [] as BarItem[],
        groups: [] as BarItem[],
        legend: [] as StatsResponse["skillsByCategory"],
      };
    }
    const labelOf = new Map(
      data.skillsByCategory.map((c) => [c.category, c.label]),
    );
    return {
      top: data.topSkills.map<BarItem>((s) => ({
        key: s.skill,
        label: s.skill,
        value: s.count,
        valueLabel: formatInt(s.count),
        color: categoryColor(s.category),
        title: `${s.skill} (${labelOf.get(s.category) ?? s.category}): ${formatInt(s.count)} ứng viên`,
      })),
      groups: data.skillsByCategory.map<BarItem>((c) => ({
        key: c.category,
        label: c.label,
        value: c.count,
        valueLabel: formatInt(c.count),
        color: categoryColor(c.category),
      })),
      legend: data.skillsByCategory,
    };
  }, [data]);

  return (
    <ChartCard
      title="Kỹ năng"
      description="Kỹ năng của ứng viên nhận trong khoảng đã chọn: top kỹ năng (số ứng viên có kỹ năng đó) và tổng theo nhóm; màu thanh theo nhóm."
      className="lg:col-span-2"
    >
      {!data ? (
        <BlockSkeleton rows={6} />
      ) : top.length === 0 ? (
        <EmptyBlock message="Chưa có dữ liệu kỹ năng." />
      ) : (
        <div className="space-y-4">
          <ul
            aria-label="Chú giải nhóm kỹ năng"
            className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm"
          >
            {legend.map((c) => (
              <li key={c.category} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-[3px]"
                  style={{ backgroundColor: categoryColor(c.category) }}
                />
                {c.label}
              </li>
            ))}
          </ul>
          <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Top {top.length} kỹ năng
              </h3>
              <BarList items={top} ariaLabel="Top kỹ năng theo số ứng viên" />
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Theo nhóm
              </h3>
              <BarList items={groups} ariaLabel="Tổng theo nhóm kỹ năng" />
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
