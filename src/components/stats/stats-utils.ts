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

/** Nhãn ngắn cho trục: tuần "15/09", tháng "T9/26". */
export function periodShortLabel(iso: string, g: Granularity): string {
  const p = parts(iso);
  if (!p) return iso;
  return g === "week"
    ? `${pad(p.d)}/${pad(p.m)}`
    : `T${p.m}/${String(p.y).slice(-2)}`;
}

/** Nhãn đầy đủ cho tooltip/bảng. */
export function periodLongLabel(iso: string, g: Granularity): string {
  const p = parts(iso);
  if (!p) return iso;
  return g === "week"
    ? `Tuần từ ${pad(p.d)}/${pad(p.m)}/${p.y}`
    : `Tháng ${p.m}/${p.y}`;
}
