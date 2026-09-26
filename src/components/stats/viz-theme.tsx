import type { Stage } from "@/lib/types";

/**
 * Màu biểu đồ theo skill dataviz: 7 slot categorical đã qua validate
 * (light: bề mặt #fcfcfb, dark: #1a1a19), "Khác" dùng xám trung tính.
 * Dark mode của dự án dùng class `.dark` (xem globals.css).
 * Màu trạng thái (`--viz-stage-*`) khớp chấm màu của StageBadge
 * (tailwind 600 ở light, 400 ở dark) để cùng một trạng thái luôn cùng màu.
 */
const VIZ_CSS = `
.viz-root{
  --viz-s1:#2a78d6;--viz-s2:#eb6834;--viz-s3:#1baf7a;--viz-s4:#eda100;
  --viz-s5:#e87ba4;--viz-s6:#008300;--viz-s7:#4a3aa7;--viz-s8:#e34948;--viz-other:#898781;
  --viz-stage-new:#2563eb;--viz-stage-screening:#d97706;--viz-stage-interview:#7c3aed;
  --viz-stage-offer:#0d9488;--viz-stage-hired:#16a34a;--viz-stage-rejected:#dc2626;
  --viz-stage-withdrawn:#71717a;
}
.dark .viz-root{
  --viz-s1:#3987e5;--viz-s2:#d95926;--viz-s3:#199e70;--viz-s4:#c98500;
  --viz-s5:#d55181;--viz-s6:#008300;--viz-s7:#9085e9;--viz-s8:#e66767;--viz-other:#898781;
  --viz-stage-new:#60a5fa;--viz-stage-screening:#fbbf24;--viz-stage-interview:#a78bfa;
  --viz-stage-offer:#2dd4bf;--viz-stage-hired:#4ade80;--viz-stage-rejected:#f87171;
  --viz-stage-withdrawn:#a1a1aa;
}
`;

/** Nhúng 1 lần ở gốc trang dashboard. */
export function VizStyles() {
  return <style>{VIZ_CSS}</style>;
}

/** Màu chính của 1 chuỗi (biểu đồ 1 series). */
export const SERIES_COLOR = "var(--viz-s1)";

/** Thứ tự cố định của nhóm kỹ năng: màu đi theo nhóm, không theo thứ hạng. */
const CATEGORY_ORDER = [
  "FRONTEND",
  "BACKEND",
  "MOBILE",
  "DATABASE",
  "DEVOPS",
  "CLOUD",
  "TESTING",
  "ERP",
] as const;

/** Nhóm không có trong danh sách (vd. OTHER, nhóm mới của BE) dùng xám trung tính. */
export function categoryColor(category: string): string {
  const idx = (CATEGORY_ORDER as readonly string[]).indexOf(category);
  return idx === -1 ? "var(--viz-other)" : `var(--viz-s${idx + 1})`;
}

export function stageColor(stage: Stage): string {
  return `var(--viz-stage-${stage.toLowerCase()})`;
}

/** Màu lát cho biểu đồ tròn theo nguồn: theo thứ hạng, tối đa 6 lát + "khác". */
export function sliceColor(index: number): string {
  return index < 6 ? `var(--viz-s${index + 1})` : "var(--viz-other)";
}
