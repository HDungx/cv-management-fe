"use client";

import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CandidateFormDialog } from "@/components/candidate-form-dialog";
import { CategoryStrip } from "@/components/category/category-strip";
import {
  CandidateRow,
  type DeleteTarget,
} from "@/components/candidates/candidate-row";
import {
  ALL_COLUMNS,
  COLUMNS,
  MAX_NOTE_COLUMNS,
  errorText,
  noteColumnCount,
  type ColumnKey,
  type PatchItem,
  type VisibleColumns,
} from "@/components/candidates/shared";
import {
  CandidatesHeadRow,
  ColumnChooser,
  DeleteCandidateDialog,
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/candidates/table-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { refreshCategories, useCategoryExists } from "@/hooks/use-categories";
import { useDebounced } from "@/hooks/use-debounced";
import { ApiError, apiFetch } from "@/lib/api";
import { UNCATEGORIZED } from "@/lib/category";
import { useSkillCatalog } from "@/lib/skills";
import {
  STAGE_LABELS,
  STAGES,
  type CandidateListItem,
  type Paged,
  type SortField,
  type SortOrder,
} from "@/lib/types";

const STATUS_ITEMS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  ...STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
];
const PAGE_SIZE_ITEMS = [10, 20, 50].map((n) => ({
  value: String(n),
  label: `${n} / trang`,
}));

interface Result {
  key: string;
  data?: Paged<CandidateListItem>;
  error?: ApiError;
}

/** Phòng khi BE chưa trả notes/notesCount (hoặc trả quá 10 ghi chú). */
function normalizeItem(c: CandidateListItem): CandidateListItem {
  const notes = (c.notes ?? []).slice(-MAX_NOTE_COLUMNS);
  return { ...c, notes, notesCount: c.notesCount ?? notes.length };
}

export default function CandidatesPage() {
  // useSearchParams (bộ lọc category nằm trong URL) cần Suspense boundary.
  return (
    <Suspense fallback={<PageFallback />}>
      <CandidatesView />
    </Suspense>
  );
}

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-14 w-48 rounded-xl" />
        <Skeleton className="h-14 w-48 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function CandidatesView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  // Category đã bị xóa (URL cũ/chia sẻ) thì coi như không lọc.
  const categoryExists = useCategoryExists(
    categoryParam && categoryParam !== UNCATEGORIZED ? categoryParam : null,
  );
  const categoryFilter = categoryExists ? categoryParam : null;

  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [visible, setVisible] = useState<VisibleColumns>(ALL_COLUMNS);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const catalog = useSkillCatalog();
  const debouncedSearch = useDebounced(search.trim());
  const debouncedSkill = useDebounced(skill.trim());

  const queryString = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    order,
    ...(status !== "ALL" && { status }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(debouncedSkill && { skill: debouncedSkill }),
    ...(categoryFilter && { categoryId: categoryFilter }),
  }).toString();
  const requestKey = `${queryString}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Paged<CandidateListItem>>(`/candidates?${queryString}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (data.items.length === 0 && data.page > 1) {
          setPage(Math.max(1, data.totalPages));
          return;
        }
        setResult({
          key: requestKey,
          data: { ...data, items: data.items.map(normalizeItem) },
        });
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
  }, [queryString, requestKey]);

  const loading = result?.key !== requestKey;
  const data = result?.data;
  const error = result?.key === requestKey ? result.error : undefined;
  // Số cột "Ghi chú i" = số ghi chú lớn nhất của các dòng đang hiện (tối đa 10):
  // thêm ghi chú làm xuất hiện cột mới, xóa hết ghi chú thứ i thì cột i biến mất.
  const noteCols = useMemo(
    () => (visible.has("notes") && data ? noteColumnCount(data.items) : 0),
    [visible, data],
  );
  const hasFilter = Boolean(
    status !== "ALL" || debouncedSearch || debouncedSkill,
  );

  // Các callback dưới đây đều ổn định (không phụ thuộc state) để dòng đã memo
  // không bị render lại khi trang cha đổi state (mở hộp xóa, đổi cột, ...).
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /** Cập nhật một dòng tại chỗ; các dòng khác giữ nguyên tham chiếu. */
  const patchItem = useCallback<PatchItem>((id, patch) => {
    setResult((r) => {
      if (!r?.data) return r;
      return {
        ...r,
        data: {
          ...r.data,
          items: r.data.items.map((c) =>
            c.id === id ? { ...c, ...patch(c) } : c,
          ),
        },
      };
    });
  }, []);

  /** Chọn/bỏ category lọc: lưu vào URL (không thêm lịch sử) và về trang 1. */
  const selectCategory = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set("category", value);
      else params.delete("category");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
      setPage(1);
    },
    [pathname],
  );

  /** Category bị xóa: bỏ lọc nếu đang xem nó; ứng viên có thể đã được chuyển nên tải lại. */
  const categoryDeleted = useCallback(
    (id: string) => {
      if (new URLSearchParams(window.location.search).get("category") === id) {
        selectCategory(null);
      }
      reload();
    },
    [selectCategory, reload],
  );

  /** Đổi category của một dòng: làm mới số đếm; đang lọc thì dòng phải rời khỏi bảng. */
  const categoryChanged = useCallback(() => {
    void refreshCategories();
    if (categoryFilter) reload();
  }, [categoryFilter, reload]);

  const requestDelete = useCallback((target: DeleteTarget) => {
    setDeleteTarget(target);
    setDeleteOpen(true);
  }, []);

  const toggleColumn = useCallback((key: ColumnKey) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const showAllColumns = useCallback(() => setVisible(ALL_COLUMNS), []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { id, fullName } = deleteTarget;
    setDeleting(true);
    try {
      await apiFetch<void>(`/candidates/${id}`, { method: "DELETE" });
      toast.success(`Đã xóa ${fullName}`);
      void refreshCategories();
      if (data && data.items.length <= 1 && page > 1) {
        // Trang cuối vừa hết dòng: lùi một trang (việc đổi trang sẽ tải lại).
        setPage(page - 1);
      } else {
        setResult((r) =>
          r?.data
            ? {
                ...r,
                data: {
                  ...r.data,
                  total: Math.max(0, r.data.total - 1),
                  items: r.data.items.filter((c) => c.id !== id),
                },
              }
            : r,
        );
        reload();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error(`${fullName} không còn tồn tại (có thể đã bị xóa).`);
        void refreshCategories();
        reload();
      } else {
        toast.error(errorText(err, "Không thể xóa ứng viên."));
      }
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setOrder(order === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setOrder(field === "fullName" ? "asc" : "desc");
      }
      setPage(1);
    },
    [sortBy, order],
  );

  function clearFilters() {
    setSearch("");
    setSkill("");
    setStatus("ALL");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ứng viên</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} ứng viên` : "Đang tải..."}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus />
          Thêm ứng viên
        </Button>
      </div>

      <CategoryStrip
        selected={categoryFilter}
        onSelect={selectCategory}
        onChanged={reload}
        onDeleted={categoryDeleted}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm kiếm ứng viên"
            placeholder="Tìm theo tên, email, SĐT, vị trí, kỹ năng (vd: react spring boot)"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Input
          aria-label="Lọc theo kỹ năng"
          placeholder="Lọc kỹ năng (vd: sql, react)"
          className="w-44"
          value={skill}
          onChange={(e) => {
            setSkill(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          items={STATUS_ITEMS}
          onValueChange={(v) => {
            setStatus(v ?? "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Lọc theo trạng thái">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button variant="ghost" onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
        )}
        <div className="ml-auto">
          <ColumnChooser
            visible={visible}
            onToggle={toggleColumn}
            onShowAll={showAllColumns}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Nhấp đúp vào ô để sửa (hoặc chọn ô rồi nhấn Enter / F2). Enter = lưu ·
        Esc = hủy. Trạng thái và Category đổi trực tiếp ở danh sách chọn.
      </p>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <CandidatesHeadRow
                  visible={visible}
                  noteCols={noteCols}
                  sortBy={sortBy}
                  order={order}
                  onSort={toggleSort}
                />
              </TableHeader>
              <TableBody
                aria-busy={loading}
                className={loading && data ? "opacity-50" : undefined}
              >
                {!data && loading && <SkeletonRows visible={visible} />}
                {data?.items.map((c) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    visible={visible}
                    catalog={catalog}
                    noteCols={noteCols}
                    onPatch={patchItem}
                    onStale={reload}
                    onRequestDelete={requestDelete}
                    onCategoryChanged={categoryChanged}
                  />
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>

          {data && data.items.length === 0 && (
            <EmptyState
              filtered={hasFilter}
              inCategory={categoryFilter !== null}
              onClear={clearFilters}
              onCreate={() => setFormOpen(true)}
            />
          )}
        </div>
      )}

      {data && data.total > 0 && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Trang {data.page} / {data.totalPages}
            {visible.size < COLUMNS.length &&
              ` · đang ẩn ${COLUMNS.length - visible.size} cột`}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              items={PAGE_SIZE_ITEMS}
              onValueChange={(v) => {
                setPageSize(Number(v ?? 20));
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" aria-label="Số dòng mỗi trang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_ITEMS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sau
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <CandidateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultCategoryId={
          categoryFilter && categoryFilter !== UNCATEGORIZED
            ? categoryFilter
            : null
        }
        onSaved={reload}
      />

      <DeleteCandidateDialog
        open={deleteOpen}
        name={deleteTarget?.fullName ?? ""}
        deleting={deleting}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
