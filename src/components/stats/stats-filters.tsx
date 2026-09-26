"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Granularity, StatsRange } from "@/lib/stats-types";
import { isFilterEmpty, type StatsFilter } from "./stats-filter";
import {
  addDaysIso,
  addMonthsIso,
  estimateBuckets,
  formatIsoDate,
  GRANULARITY_UNIT,
} from "./stats-utils";

const MAX_BUCKETS = 366;

const GRANULARITY_OPTIONS: { value: Granularity | undefined; label: string }[] =
  [
    { value: undefined, label: "Tự động" },
    { value: "day", label: "Ngày" },
    { value: "week", label: "Tuần" },
    { value: "month", label: "Tháng" },
  ];

interface Preset {
  key: string;
  label: string;
  from: (today: string) => string;
}

const PRESETS: Preset[] = [
  { key: "7d", label: "7 ngày", from: (t) => addDaysIso(t, -6) },
  { key: "30d", label: "30 ngày", from: (t) => addDaysIso(t, -29) },
  {
    key: "3m",
    label: "3 tháng",
    from: (t) => addDaysIso(addMonthsIso(t, -3), 1),
  },
  {
    key: "12m",
    label: "12 tháng",
    from: (t) => addDaysIso(addMonthsIso(t, -12), 1),
  },
  { key: "ytd", label: "Năm nay", from: (t) => `${t.slice(0, 4)}-01-01` },
];

/** Kiểm tra ô ngày tùy chọn; trả thông báo lỗi (tiếng Việt) hoặc null. */
function validateDraft(
  from: string,
  to: string,
  today: string,
  granularity: Granularity | undefined,
): string | null {
  if (from && from > today) {
    return `Từ ngày không được sau hôm nay (${formatIsoDate(today)}).`;
  }
  if (to && to > today) {
    return `Đến ngày không được sau hôm nay (${formatIsoDate(today)}).`;
  }
  if (from && to && from > to) {
    return "Từ ngày phải trước hoặc bằng Đến ngày.";
  }
  if (granularity && from) {
    const buckets = estimateBuckets(from, to || today, granularity);
    if (buckets > MAX_BUCKETS) {
      return `Khoảng này có hơn ${MAX_BUCKETS} cột khi xem theo ${GRANULARITY_UNIT[granularity]}. Hãy thu hẹp khoảng hoặc chọn độ chi tiết lớn hơn.`;
    }
  }
  return null;
}

/**
 * Bộ lọc khoảng ngày + độ chi tiết. Trạng thái "đã áp dụng" nằm ở URL (do trang
 * quản lý); ở đây chỉ giữ bản nháp của hai ô ngày. Cha đặt `key` theo from/to đã
 * áp dụng để bản nháp tự đồng bộ khi URL đổi (preset, Back/Forward, Đặt lại).
 */
export function StatsFilters({
  filter,
  today,
  range,
  serverError,
  onChange,
}: {
  filter: StatsFilter;
  /** Hôm nay theo giờ máy, YYYY-MM-DD. */
  today: string;
  /** Khoảng thực tế BE đã áp dụng (từ lần tải gần nhất). */
  range?: StatsRange;
  /** Thông báo 400 của BE cho bộ lọc hiện tại. */
  serverError?: string;
  onChange: (next: StatsFilter) => void;
}) {
  const [from, setFrom] = useState(filter.from ?? "");
  const [to, setTo] = useState(filter.to ?? "");

  const error = useMemo(
    () => validateDraft(from, to, today, filter.granularity),
    [from, to, today, filter.granularity],
  );
  const dirty = from !== (filter.from ?? "") || to !== (filter.to ?? "");

  function apply() {
    if (error || !dirty) return;
    onChange({
      from: from || undefined,
      to: to || undefined,
      granularity: filter.granularity,
    });
  }

  return (
    <section
      aria-label="Bộ lọc thống kê"
      className="space-y-3 rounded-xl bg-card p-3 text-card-foreground ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div
          role="group"
          aria-label="Khoảng nhanh"
          className="flex flex-wrap items-center gap-1"
        >
          {PRESETS.map((p) => {
            const presetFrom = p.from(today);
            const active = filter.from === presetFrom && filter.to === today;
            return (
              <Button
                key={p.key}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    from: presetFrom,
                    to: today,
                    granularity: filter.granularity,
                  })
                }
              >
                {p.label}
              </Button>
            );
          })}
        </div>
        <div
          role="group"
          aria-label="Độ chi tiết"
          className="flex flex-wrap items-center gap-1"
        >
          <span className="mr-1 text-sm text-muted-foreground">
            Chi tiết theo
          </span>
          {GRANULARITY_OPTIONS.map((o) => {
            const active = filter.granularity === o.value;
            return (
              <Button
                key={o.label}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                aria-pressed={active}
                onClick={() => onChange({ ...filter, granularity: o.value })}
              >
                {o.label}
              </Button>
            );
          })}
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="stats-from">Từ ngày</Label>
          <Input
            id="stats-from"
            type="date"
            value={from}
            max={to || today}
            aria-invalid={error !== null}
            className="w-40 dark:scheme-dark"
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stats-to">Đến ngày</Label>
          <Input
            id="stats-to"
            type="date"
            value={to}
            min={from || undefined}
            max={today}
            aria-invalid={error !== null}
            className="w-40 dark:scheme-dark"
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={error !== null || !dirty}>
          Áp dụng
        </Button>
        {!isFilterEmpty(filter) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange({})}
          >
            <RotateCcw />
            Đặt lại mặc định
          </Button>
        )}
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        {range ? (
          <>
            Đang xem: từ{" "}
            <strong className="font-medium text-foreground">
              {formatIsoDate(range.from)}
            </strong>{" "}
            đến{" "}
            <strong className="font-medium text-foreground">
              {formatIsoDate(range.to)}
            </strong>{" "}
            · theo {GRANULARITY_UNIT[range.granularity]}
          </>
        ) : (
          "Đang tải khoảng thời gian..."
        )}
        <span className="block text-xs">
          Thống kê tính trên ứng viên có ngày tạo trong khoảng đã chọn. Ngày
          tính theo giờ UTC (&quot;hôm nay&quot; ở đây theo giờ máy bạn nên có
          thể lệch tối đa 1 ngày).
        </span>
      </p>
    </section>
  );
}
