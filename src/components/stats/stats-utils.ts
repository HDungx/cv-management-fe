import type { Granularity } from "@/lib/stats-types";

const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("vi-VN");

export function formatInt(n: number): string {
  return integer.format(n);
}

export function formatDecimal(n: number): string {
  return decimal.format(n);
}

/** Tỷ lệ phần trăm; "—" khi mẫu số = 0. */
export function formatPercent(part: number, total: number): string {
  if (total <= 0) return "—";
  return `${decimal.format((part / total) * 100)}%`;
}

const DATE_PART = /^(\d{4})-(\d{2})-(\d{2})/;

function parts(iso: string): { y: number; m: number; d: number } | null {
  const match = DATE_PART.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Nhãn ngắn cho trục: ngày/tuần "15/09", tháng "09/2026". */
export function periodShortLabel(iso: string, g: Granularity): string {
  const p = parts(iso);
  if (!p) return iso;
  return g === "month" ? `${pad(p.m)}/${p.y}` : `${pad(p.d)}/${pad(p.m)}`;
}

/** Nhãn đầy đủ cho tooltip/bảng. */
export function periodLongLabel(iso: string, g: Granularity): string {
  const p = parts(iso);
  if (!p) return iso;
  const full = `${pad(p.d)}/${pad(p.m)}/${p.y}`;
  if (g === "day") return `Ngày ${full}`;
  return g === "week" ? `Tuần từ ${full}` : `Tháng ${p.m}/${p.y}`;
}

export const GRANULARITY_UNIT: Record<Granularity, string> = {
  day: "ngày",
  week: "tuần",
  month: "tháng",
};

/* ---------------------------------- Ngày ----------------------------------- */

/** YYYY-MM-DD -> dd/MM/yyyy. */
export function formatIsoDate(iso: string): string {
  const p = parts(iso);
  return p ? `${pad(p.d)}/${pad(p.m)}/${p.y}` : iso;
}

/** Ngày lịch theo giờ máy, dạng YYYY-MM-DD. */
export function todayLocalIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** YYYY-MM-DD hợp lệ thật sự (không chấp nhận 2026-02-31). */
export function isIsoDate(value: string): boolean {
  const p = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parts(value) : null;
  if (!p) return false;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return (
    d.getUTCFullYear() === p.y &&
    d.getUTCMonth() === p.m - 1 &&
    d.getUTCDate() === p.d
  );
}

function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
  const p = parts(iso);
  if (!p) return iso;
  return toIso(new Date(Date.UTC(p.y, p.m - 1, p.d + days)));
}

/** Cộng tháng, kẹp ngày về cuối tháng đích (31/03 - 1 tháng = 28/02). */
export function addMonthsIso(iso: string, months: number): string {
  const p = parts(iso);
  if (!p) return iso;
  const lastDay = new Date(Date.UTC(p.y, p.m - 1 + months + 1, 0)).getUTCDate();
  return toIso(
    new Date(Date.UTC(p.y, p.m - 1 + months, Math.min(p.d, lastDay))),
  );
}

/** Số ngày giữa hai ngày, gồm cả hai đầu. */
export function daysInclusive(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  if (!a || !b) return 0;
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86_400_000) + 1;
}

/** Ước lượng số bucket BE sẽ trả (để cảnh báo sớm ở FE; BE vẫn là nguồn quyết định). */
export function estimateBuckets(
  from: string,
  to: string,
  g: Granularity,
): number {
  const days = daysInclusive(from, to);
  if (g === "day") return days;
  if (g === "week") return Math.ceil(days / 7) + 1;
  const a = parts(from);
  const b = parts(to);
  if (!a || !b) return 0;
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
}

/* ------------------------------- Phần trăm --------------------------------- */

/**
 * Chia phần trăm sao cho tổng đúng 100 (phương pháp phần dư lớn nhất) ở
 * `decimals` chữ số thập phân. Tổng = 0 thì trả toàn 0 (không chia cho 0).
 */
export function allocatePercents(values: number[], decimals = 1): number[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return values.map(() => 0);
  const unit = 10 ** decimals;
  const scale = 100 * unit;
  const raw = values.map((v) => (Math.max(0, v) / total) * scale);
  const floors = raw.map(Math.floor);
  let left = scale - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors.map((f) => f / unit);
}

/** Số phần trăm (đã là 0-100) -> "33,3%". */
export function formatPct(pct: number): string {
  return `${decimal.format(pct)}%`;
}
