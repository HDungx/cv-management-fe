import { ApiError } from "@/lib/api";
import type { CandidateListItem, SortField } from "@/lib/types";

export type ColumnKey =
  | "appliedRole"
  | "email"
  | "phone"
  | "status"
  | "category"
  | "skills"
  | "links"
  | "salary"
  | "source"
  | "notes"
  | "createdAt"
  | "updatedAt";

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** Có giá trị = cột sắp xếp được (sắp xếp phía server). */
  sort?: SortField;
}

/** Các cột giữa (Họ tên và Thao tác luôn hiện và dính hai bên). */
export const COLUMNS: readonly ColumnDef[] = [
  { key: "appliedRole", label: "Vị trí ứng tuyển" },
  { key: "email", label: "Email" },
  { key: "phone", label: "SĐT" },
  { key: "status", label: "Trạng thái", sort: "status" },
  { key: "category", label: "Category" },
  { key: "skills", label: "Kỹ năng" },
  { key: "links", label: "LinkedIn / GitHub" },
  { key: "salary", label: "Lương kỳ vọng" },
  { key: "source", label: "Nguồn" },
  { key: "notes", label: "Ghi chú" },
  { key: "createdAt", label: "Ngày tạo", sort: "createdAt" },
  { key: "updatedAt", label: "Cập nhật", sort: "updatedAt" },
];

export type VisibleColumns = ReadonlySet<ColumnKey>;

export const ALL_COLUMNS: VisibleColumns = new Set(COLUMNS.map((c) => c.key));

/** Cập nhật một dòng tại chỗ (không tải lại bảng). */
export type PatchItem = (
  id: string,
  patch: (current: CandidateListItem) => Partial<CandidateListItem>,
) => void;

export interface RowCallbacks {
  onPatch: PatchItem;
  /** Dữ liệu bảng có thể đã cũ (bị xóa/đổi song song): tải lại danh sách. */
  onStale: () => void;
}

/** BE chỉ trả tối đa ngần này ghi chú mới nhất cho mỗi ứng viên. */
export const MAX_NOTE_COLUMNS = 10;

/**
 * Số cột "Ghi chú i" cần hiện = số ghi chú lớn nhất của các dòng đang hiển thị
 * (tối đa MAX_NOTE_COLUMNS). Không dòng nào có ghi chú thì không có cột nào.
 */
export function noteColumnCount(items: readonly CandidateListItem[]): number {
  let max = 0;
  for (const c of items) if (c.notes.length > max) max = c.notes.length;
  return Math.min(max, MAX_NOTE_COLUMNS);
}

/** Nền/viền cho cột dính (phải đục để không lộ nội dung cuộn phía sau). */
export const STICKY_LEFT =
  "md:sticky md:left-0 md:z-10 md:shadow-[1px_0_0_var(--border)]";
export const STICKY_RIGHT =
  "md:sticky md:right-0 md:z-10 md:shadow-[-1px_0_0_var(--border)]";
/**
 * Cột "Thêm ghi chú" dính ngay bên trái cột Thao tác: offset (right-40) phải bằng bề rộng
 * cột Thao tác (ACTIONS_WIDTH = w-40), nên hai cột đều có bề rộng cố định.
 */
export const STICKY_RIGHT_OFFSET =
  "md:sticky md:right-40 md:z-10 md:shadow-[-1px_0_0_var(--border)]";
export const ACTIONS_WIDTH = "w-40 min-w-40 max-w-40";
export const ADD_NOTE_WIDTH = "w-60 min-w-60 max-w-60";
export const STICKY_BODY_BG =
  "bg-background group-hover/row:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]";

/** Thông điệp lỗi gọn (một dòng) để hiện trong toast. */
export function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message.replace(/\n+/g, "; ") : fallback;
}

export function isStaleError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 409);
}
