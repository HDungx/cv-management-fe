/**
 * Màu biểu đồ theo skill dataviz: 7 slot categorical đã qua validate
 * (light: bề mặt #fcfcfb, dark: #1a1a19), "Khác" dùng xám trung tính.
 * Dark mode của dự án dùng class `.dark` (xem globals.css).
 */
const VIZ_CSS = `
.viz-root{
  --viz-s1:#2a78d6;--viz-s2:#eb6834;--viz-s3:#1baf7a;--viz-s4:#eda100;
  --viz-s5:#e87ba4;--viz-s6:#008300;--viz-s7:#4a3aa7;--viz-other:#898781;
}
.dark .viz-root{
  --viz-s1:#3987e5;--viz-s2:#d95926;--viz-s3:#199e70;--viz-s4:#c98500;
  --viz-s5:#d55181;--viz-s6:#008300;--viz-s7:#9085e9;--viz-other:#898781;
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
] as const;

export function categoryColor(category: string): string {
  const idx = (CATEGORY_ORDER as readonly string[]).indexOf(category);
  return idx === -1 ? "var(--viz-other)" : `var(--viz-s${idx + 1})`;
}
