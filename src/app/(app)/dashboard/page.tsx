"use client";

import { FileUp, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import {
  filterToQuery,
  isFilterEmpty,
  parseFilter,
  type StatsFilter,
} from "@/components/stats/stats-filter";
import { StatsFilters } from "@/components/stats/stats-filters";
import {
  formatInt,
  formatPercent,
  todayLocalIso,
} from "@/components/stats/stats-utils";
import { VizStyles } from "@/components/stats/viz-theme";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { StatsResponse } from "@/lib/stats-types";
import { cn } from "@/lib/utils";

interface Result {
  key: string;
  data?: StatsResponse;
  error?: ApiError;
}

export default function DashboardPage() {
  // useSearchParams cần Suspense để phần còn lại của trang vẫn prerender được.
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <div className="viz-root space-y-4">
      <h1 className="text-xl font-semibold">Thống kê</h1>
      <KpiRow />
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = useMemo(() => parseFilter(searchParams), [searchParams]);
  const query = filterToQuery(filter);
  const [today] = useState(() => todayLocalIso());

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [last, setLast] = useState<StatsResponse | null>(null);

  const requestKey = `${query}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<StatsResponse>(query ? `/stats?${query}` : "/stats", {
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setLast(data);
        setResult({ key: requestKey, data });
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
  }, [query, requestKey]);

  const settled = result?.key === requestKey;
  const error = settled ? result.error : undefined;
  // 400 = bộ lọc không hợp lệ: báo tại bộ lọc, giữ nguyên số liệu của lần trước.
  const filterError = error?.status === 400 ? error.message : undefined;
  const fatal = error && !filterError ? error : undefined;
  // Đang tải lại: giữ nguyên bản vẽ cũ (mờ đi) thay vì nháy skeleton.
  const data = settled && result.data ? result.data : (last ?? undefined);
  const refetching = !settled && last !== null;

  const applyFilter = useCallback(
    (next: StatsFilter) => {
      const qs = filterToQuery(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return (
    <div className="viz-root space-y-4">
      <VizStyles />
      <div>
        <h1 className="text-xl font-semibold">Thống kê</h1>
        <p className="text-sm text-muted-foreground">
          {data
            ? `Cập nhật lúc ${formatDateTime(data.generatedAt)}`
            : "Đang tải..."}
        </p>
      </div>

      <StatsFilters
        key={`${filter.from ?? ""}|${filter.to ?? ""}`}
        filter={filter}
        today={today}
        range={data?.range}
        serverError={filterError}
        onChange={applyFilter}
      />

      {fatal ? (
        <ErrorState error={fatal} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : filterError && !data ? null : (
        <div
          aria-busy={!data || refetching}
          className={cn(
            "space-y-4 transition-opacity",
            refetching && "opacity-50",
          )}
        >
          <KpiRow data={data} />
          {data && data.totals.candidates === 0 ? (
            <EmptyDashboard
              onReset={
                isFilterEmpty(filter) ? undefined : () => applyFilter({})
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <FunnelCard data={data} />
              <ReceivedCard
                data={data?.received}
                granularity={data?.range.granularity ?? "month"}
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
      <KpiTile
        label="Ứng viên nhận trong khoảng đã chọn"
        value={t && formatInt(t.candidates)}
        hint="Tính theo ngày tạo hồ sơ"
      />
      <KpiTile
        label="Đang xử lý"
        value={t && formatInt(t.active)}
        hint="Trong nhóm đã nhận, chưa có kết quả cuối"
      />
      <KpiTile
        label="Đã tuyển"
        value={t && formatInt(t.hired)}
        hint="Trạng thái hiện tại là Đã nhận"
      />
      <KpiTile
        label="Tỷ lệ tuyển / ứng viên nhận"
        value={t && formatPercent(t.hired, t.candidates)}
        hint={
          t && `${formatInt(t.hired)} / ${formatInt(t.candidates)} ứng viên`
        }
      />
    </div>
  );
}

/* ---------------------------------- States --------------------------------- */

function EmptyDashboard({ onReset }: { onReset?: () => void }) {
  return (
    <ChartCard title="Không có dữ liệu trong khoảng đã chọn">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          Chưa có ứng viên nào được tạo trong khoảng này. Hãy mở rộng khoảng
          ngày, hoặc import CV / thêm ứng viên để các biểu đồ xuất hiện ở đây.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {onReset && (
            <Button variant="outline" onClick={onReset}>
              <RotateCcw />
              Đặt lại mặc định
            </Button>
          )}
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
