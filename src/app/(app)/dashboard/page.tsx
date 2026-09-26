"use client";

import { FileUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChartCard } from "@/components/stats/chart-card";
import { ReceivedCard } from "@/components/stats/received-card";
import {
  DurationCard,
  FunnelCard,
  RoleCard,
  SkillsCard,
  SourceCard,
  TransitionCard,
} from "@/components/stats/stats-sections";
import { formatInt, formatPercent } from "@/components/stats/stats-utils";
import { VizStyles } from "@/components/stats/viz-theme";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Granularity, StatsResponse } from "@/lib/stats-types";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: Record<Granularity, number[]> = {
  week: [8, 12, 26],
  month: [6, 12],
};
const DEFAULT_PERIODS = 12;
const UNIT: Record<Granularity, string> = { week: "tuần", month: "tháng" };

interface Loaded {
  data: StatsResponse;
  /** Granularity của dữ liệu đã tải (có thể khác lựa chọn hiện tại khi đang tải lại). */
  granularity: Granularity;
}

interface Result {
  key: string;
  loaded?: Loaded;
  error?: ApiError;
}

export default function DashboardPage() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [periods, setPeriods] = useState(DEFAULT_PERIODS);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [last, setLast] = useState<Loaded | null>(null);

  const requestKey = `${granularity}:${periods}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<StatsResponse>(
      `/stats?granularity=${granularity}&periods=${periods}`,
      { signal: controller.signal },
    )
      .then((data) => {
        const loaded = { data, granularity };
        setLast(loaded);
        setResult({ key: requestKey, loaded });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error:
            err instanceof ApiError
              ? err
              : new ApiError(0, "Đã xảy ra lỗi không xác định."),
        });
      });
    return () => controller.abort();
  }, [granularity, periods, requestKey]);

  const settled = result?.key === requestKey;
  const error = settled ? result.error : undefined;
  // Đang tải lại: giữ nguyên bản vẽ cũ (mờ đi) thay vì nháy skeleton.
  const shown = settled ? result.loaded : last;
  const data = shown?.data;
  const refetching = !settled && last !== null;

  function chooseGranularity(next: Granularity) {
    if (next === granularity) return;
    setGranularity(next);
    setPeriods(DEFAULT_PERIODS);
  }

  return (
    <div className="viz-root space-y-4">
      <VizStyles />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Thống kê</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `Cập nhật lúc ${formatDateTime(data.generatedAt)}`
              : "Đang tải..."}
          </p>
        </div>
        <PeriodControls
          granularity={granularity}
          periods={periods}
          onGranularity={chooseGranularity}
          onPeriods={setPeriods}
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <div
          aria-busy={!data || refetching}
          className={cn(
            "space-y-4 transition-opacity",
            refetching && "opacity-50",
          )}
        >
          <KpiRow data={data} />
          {data && data.totals.candidates === 0 ? (
            <EmptyDashboard />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <FunnelCard data={data} />
              <ReceivedCard
                data={data?.received}
                granularity={shown?.granularity ?? granularity}
              />
              <SourceCard data={data} />
              <DurationCard data={data} />
              <RoleCard data={data} />
              <TransitionCard data={data} />
              <SkillsCard data={data} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Controls -------------------------------- */

function PeriodControls({
  granularity,
  periods,
  onGranularity,
  onPeriods,
}: {
  granularity: Granularity;
  periods: number;
  onGranularity: (g: Granularity) => void;
  onPeriods: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div
        role="group"
        aria-label="Đơn vị kỳ"
        className="flex items-center gap-1"
      >
        {(["week", "month"] as const).map((g) => (
          <Button
            key={g}
            size="sm"
            variant={granularity === g ? "secondary" : "ghost"}
            aria-pressed={granularity === g}
            onClick={() => onGranularity(g)}
          >
            {g === "week" ? "Theo tuần" : "Theo tháng"}
          </Button>
        ))}
      </div>
      <div
        role="group"
        aria-label={`Số ${UNIT[granularity]} gần nhất`}
        className="flex items-center gap-1"
      >
        {PERIOD_OPTIONS[granularity].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={periods === n ? "secondary" : "ghost"}
            aria-pressed={periods === n}
            onClick={() => onPeriods(n)}
          >
            {n} {UNIT[granularity]}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------ KPI ---------------------------------- */

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1 h-8 w-20" />
        ) : (
          <p className="mt-1 text-3xl font-semibold">{value}</p>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function KpiRow({ data }: { data?: StatsResponse }) {
  const t = data?.totals;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile label="Tổng ứng viên" value={t && formatInt(t.candidates)} />
      <KpiTile
        label="Đang xử lý"
        value={t && formatInt(t.active)}
        hint="Chưa có kết quả cuối"
      />
      <KpiTile label="Đã nhận" value={t && formatInt(t.hired)} />
      <KpiTile
        label="Tỷ lệ nhận / tổng"
        value={t && formatPercent(t.hired, t.candidates)}
        hint={
          t && `${formatInt(t.hired)} / ${formatInt(t.candidates)} ứng viên`
        }
      />
    </div>
  );
}

/* ---------------------------------- States --------------------------------- */

function EmptyDashboard() {
  return (
    <ChartCard title="Chưa có dữ liệu để thống kê">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Hãy import CV hoặc thêm ứng viên, các biểu đồ sẽ xuất hiện ở đây.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/import" className={buttonVariants()}>
            <FileUp />
            Import CV
          </Link>
          <Link
            href="/candidates"
            className={buttonVariants({ variant: "outline" })}
          >
            Danh sách ứng viên
          </Link>
        </div>
      </div>
    </ChartCard>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  const forbidden = error.status === 403;
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-12 text-center"
    >
      <p className="font-medium text-destructive">
        {forbidden
          ? "Tài khoản chưa được cấp quyền"
          : "Không tải được thống kê"}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {forbidden
          ? "Email của bạn chưa nằm trong danh sách được phép (ALLOWED_EMAILS ở backend)."
          : error.message}
      </p>
      {!forbidden && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw />
          Thử lại
        </Button>
      )}
    </div>
  );
}
