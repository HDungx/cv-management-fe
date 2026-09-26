import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";
import type {
  Category,
  CategoryColor,
  CategoryList,
  CategoryRef,
} from "@/lib/types";

/**
 * Kho category dùng chung (cache ở cấp module, mọi component cùng thấy một dữ
 * liệu). Số đếm ứng viên nằm trong chính danh sách category, nên bất kỳ thao
 * tác nào làm đổi số ứng viên phải gọi `refreshCategories()`.
 */
interface CategoriesState {
  items: Category[];
  uncategorizedCount: number;
  total: number;
  /** Đã tải thành công ít nhất một lần. */
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetchedAt: number;
}

const INITIAL: CategoriesState = {
  items: [],
  uncategorizedCount: 0,
  total: 0,
  loaded: false,
  loading: false,
  error: null,
  fetchedAt: 0,
};

/** Dữ liệu cũ hơn ngưỡng này thì tự làm mới khi có component mount. */
const STALE_MS = 5_000;

let state: CategoriesState = INITIAL;
const listeners = new Set<() => void>();

function setState(patch: Partial<CategoriesState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

function sortItems(items: Category[]): Category[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

/** Giữ nguyên tham chiếu của category không đổi để thẻ đã memo khỏi render lại. */
function reuseItems(next: Category[], prev: Category[]): Category[] {
  const byId = new Map(prev.map((c) => [c.id, c]));
  return next.map((c) => {
    const old = byId.get(c.id);
    return old &&
      old.name === c.name &&
      old.color === c.color &&
      old.candidateCount === c.candidateCount &&
      old.updatedAt === c.updatedAt
      ? old
      : c;
  });
}

let inflight: Promise<void> | null = null;
let dirty = false;

async function run(): Promise<void> {
  try {
    for (;;) {
      dirty = false;
      try {
        const data = await apiFetch<CategoryList>("/categories");
        setState({
          items: reuseItems(data.items, state.items),
          uncategorizedCount: data.uncategorizedCount,
          total: data.total,
          loaded: true,
          error: null,
          fetchedAt: Date.now(),
        });
      } catch (err) {
        setState({
          error:
            err instanceof Error
              ? err.message
              : "Không tải được danh sách category.",
        });
      }
      // Có yêu cầu làm mới đến trong lúc đang tải: dữ liệu vừa nhận có thể đã cũ.
      if (!dirty) break;
    }
  } finally {
    inflight = null;
    setState({ loading: false });
  }
}

/** Tải lại danh sách category + số đếm. Gộp các lời gọi đồng thời. */
export function refreshCategories(): Promise<void> {
  if (inflight) {
    dirty = true;
    return inflight;
  }
  setState({ loading: true });
  inflight = run();
  return inflight;
}

/** Tải nếu chưa có dữ liệu hoặc dữ liệu đã cũ. */
function ensureCategories() {
  if (inflight) return;
  if (!state.loaded || Date.now() - state.fetchedAt > STALE_MS) {
    void refreshCategories();
  }
}

export interface CategoryInput {
  name: string;
  color?: CategoryColor | null;
}

/** Tạo category rồi thêm vào cache (đã sắp A→Z). Ném ApiError nếu lỗi (vd 409). */
export async function createCategory(input: CategoryInput): Promise<Category> {
  const created = await apiFetch<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setState({
    items: sortItems([
      ...state.items.filter((c) => c.id !== created.id),
      created,
    ]),
  });
  return created;
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<Category> {
  const updated = await apiFetch<Category>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  setState({
    items: sortItems(state.items.map((c) => (c.id === id ? updated : c))),
  });
  return updated;
}

/**
 * Xóa category. `moveTo` = id category khác hoặc "none" (Chưa phân loại) để
 * chuyển ứng viên trước khi xóa; bỏ trống khi category rỗng.
 */
export async function removeCategory(
  id: string,
  moveTo?: string,
): Promise<void> {
  await apiFetch<void>(
    `/categories/${id}${moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : ""}`,
    { method: "DELETE" },
  );
  setState({ items: state.items.filter((c) => c.id !== id) });
  void refreshCategories();
}

export function toCategoryRef(c: Category): CategoryRef {
  return { id: c.id, name: c.name, color: c.color };
}

/** Hook chính: danh sách category + số đếm (tự tải khi mount, cache dùng chung). */
export function useCategories() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureCategories();
  }, []);
  return {
    items: snap.items,
    uncategorizedCount: snap.uncategorizedCount,
    total: snap.total,
    loaded: snap.loaded,
    loading: snap.loading,
    error: snap.error,
    refresh: refreshCategories,
    create: createCategory,
    update: updateCategory,
    remove: removeCategory,
  };
}

/**
 * Category `id` còn tồn tại không? (true khi chưa tải xong hoặc id rỗng.)
 * Chỉ render lại khi kết quả boolean đổi, không theo mọi thay đổi số đếm.
 */
export function useCategoryExists(id: string | null): boolean {
  const exists = useSyncExternalStore(
    subscribe,
    () => id === null || !state.loaded || state.items.some((c) => c.id === id),
    () => true,
  );
  useEffect(() => {
    ensureCategories();
  }, []);
  return exists;
}
