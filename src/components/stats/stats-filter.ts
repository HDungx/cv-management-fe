import type { Granularity } from "@/lib/stats-types";
import { isIsoDate } from "./stats-utils";

/** Bộ lọc thống kê; trường vắng = dùng mặc định của BE. */
export interface StatsFilter {
  from?: string;
  to?: string;
  /** Vắng = "Tự động" (không gửi lên BE). */
  granularity?: Granularity;
}

export const GRANULARITIES: readonly Granularity[] = ["day", "week", "month"];

/** Đọc bộ lọc từ URL; giá trị sai định dạng bị bỏ qua thay vì làm hỏng trang. */
export function parseFilter(params: URLSearchParams): StatsFilter {
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const g = params.get("granularity") ?? "";
  const filter: StatsFilter = {};
  if (isIsoDate(from)) filter.from = from;
  if (isIsoDate(to)) filter.to = to;
  const granularity = GRANULARITIES.find((x) => x === g);
  if (granularity) filter.granularity = granularity;
  return filter;
}

/** Query string dùng chung cho URL trang và request `/stats` (không có dấu `?`). */
export function filterToQuery(filter: StatsFilter): string {
  const q = new URLSearchParams();
  if (filter.from) q.set("from", filter.from);
  if (filter.to) q.set("to", filter.to);
  if (filter.granularity) q.set("granularity", filter.granularity);
  return q.toString();
}

export function isFilterEmpty(filter: StatsFilter): boolean {
  return !filter.from && !filter.to && !filter.granularity;
}
