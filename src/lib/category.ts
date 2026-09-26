import { ApiError } from "./api";
import type { Category, CategoryColor } from "./types";
import { CATEGORY_COLORS } from "./types";

export const CATEGORY_NAME_MAX = 60;

export const CATEGORY_DUPLICATE_MESSAGE =
  "Tên category đã tồn tại (không phân biệt hoa thường và dấu).";

/** Giá trị bộ lọc "Chưa phân loại" (cả trong URL lẫn query BE). */
export const UNCATEGORIZED = "none";

/** Chuẩn hóa tên để so khớp: bỏ dấu, hoa/thường, khoảng trắng thừa. */
export function normalizeCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function findCategoryByName(
  items: readonly Category[],
  name: string,
): Category | undefined {
  const key = normalizeCategoryName(name);
  if (!key) return undefined;
  return items.find((c) => normalizeCategoryName(c.name) === key);
}

/** Màu gợi ý cho category mới: xoay vòng theo số category hiện có. */
export function suggestColor(existingCount: number): CategoryColor {
  return CATEGORY_COLORS[(existingCount + 6) % CATEGORY_COLORS.length];
}

/** Thông báo lỗi tiếng Việt cho các thao tác trên category. */
export function categoryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return CATEGORY_DUPLICATE_MESSAGE;
    }
    if (err.status === 404) {
      return "Không tìm thấy category (có thể đã bị xóa).";
    }
    return err.message.replace(/\n+/g, "; ");
  }
  return "Không thể thực hiện thao tác với category.";
}

const LAST_KEY = "hr.lastCategoryId";

/** Category dùng gần nhất (nhớ trong trình duyệt), null nếu chưa có. */
export function readLastCategoryId(): string | null {
  try {
    return window.localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function rememberCategoryId(id: string): void {
  try {
    window.localStorage.setItem(LAST_KEY, id);
  } catch {
    // Trình duyệt chặn localStorage: bỏ qua.
  }
}
