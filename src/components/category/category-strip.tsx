"use client";

import { Ellipsis, FolderPlus, Layers, Pencil, Trash2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryFolderIcon, UNCATEGORIZED_LABEL } from "./category-parts";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import { UNCATEGORIZED } from "@/lib/category";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARD =
  "group/folder relative flex h-14 w-44 shrink-0 items-stretch rounded-xl border bg-background transition-colors sm:w-48";
const CARD_ACTIVE = "border-primary bg-primary/5 ring-2 ring-primary/30";
const CARD_IDLE = "hover:bg-muted/60";
const FACE =
  "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

interface FolderCardProps {
  kind: "all" | "none" | "category";
  category?: Category;
  count: number;
  active: boolean;
  /** Giá trị lọc: id, "none" hoặc null (bỏ lọc). Bấm thẻ đang chọn = bỏ lọc. */
  onSelect: (value: string | null) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

/** Thẻ "thư mục": bấm để lọc ứng viên theo category đó. */
const FolderCard = memo(function FolderCard({
  kind,
  category,
  count,
  active,
  onSelect,
  onEdit,
  onDelete,
}: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name =
    kind === "all"
      ? "Tất cả"
      : kind === "none"
        ? UNCATEGORIZED_LABEL
        : (category?.name ?? "");
  const value =
    kind === "all" ? null : kind === "none" ? UNCATEGORIZED : category!.id;

  return (
    <div className={cn(CARD, active ? CARD_ACTIVE : CARD_IDLE)}>
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${name}: ${count} ứng viên`}
        title={name}
        className={cn(FACE, kind === "category" && "pr-9")}
        onClick={() => onSelect(active ? null : value)}
      >
        {kind === "all" ? (
          <Layers
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
        ) : (
          <CategoryFolderIcon
            color={category?.color}
            className={cn(
              "size-5",
              kind === "none" && "fill-transparent text-muted-foreground",
            )}
          />
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm leading-tight font-medium">
            {name}
          </span>
          <span className="block text-xs leading-tight text-muted-foreground">
            {count} ứng viên
          </span>
        </span>
      </button>

      {kind === "category" && category && (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Tùy chọn category ${category.name}`}
                className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
              />
            }
          >
            <Ellipsis />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 gap-0.5 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => {
                setMenuOpen(false);
                onEdit?.(category);
              }}
            >
              <Pencil />
              Đổi tên / màu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setMenuOpen(false);
                onDelete?.(category);
              }}
            >
              <Trash2 />
              Xóa category
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});

const CreateCard = memo(function CreateCard({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-44 shrink-0 items-center gap-2.5 rounded-xl border border-dashed bg-background px-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-48"
    >
      <FolderPlus aria-hidden="true" className="size-5 shrink-0" />
      Tạo category
    </button>
  );
});

interface StripProps {
  /** Bộ lọc đang chọn: id category, "none" hoặc null (tất cả). */
  selected: string | null;
  onSelect: (value: string | null) => void;
  /** Category đổi tên/màu: bảng cần tải lại để badge hiện đúng. */
  onChanged: () => void;
  /** Category đã xóa (ứng viên có thể đã được chuyển): bỏ lọc nếu đang chọn nó. */
  onDeleted: (id: string) => void;
}

/**
 * Dải "thư mục" phía trên bảng ứng viên: Tất cả, từng category, Chưa phân loại
 * và nút tạo category. Cuộn ngang trên mobile, xuống dòng từ màn hình sm.
 */
export const CategoryStrip = memo(function CategoryStrip({
  selected,
  onSelect,
  onChanged,
  onDeleted,
}: StripProps) {
  const { items, uncategorizedCount, total, loaded, error, refresh } =
    useCategories();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const requestEdit = useCallback((c: Category) => {
    setEditTarget(c);
    setEditOpen(true);
  }, []);
  const requestDelete = useCallback((c: Category) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  }, []);

  return (
    <section aria-label="Category ứng viên" className="space-y-2">
      {error && !loaded ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
        >
          <span className="text-destructive">
            Không tải được category: {error}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">
          {loaded ? (
            <>
              <FolderCard
                kind="all"
                count={total}
                active={selected === null}
                onSelect={onSelect}
              />
              {items.map((c) => (
                <FolderCard
                  key={c.id}
                  kind="category"
                  category={c}
                  count={c.candidateCount}
                  active={selected === c.id}
                  onSelect={onSelect}
                  onEdit={requestEdit}
                  onDelete={requestDelete}
                />
              ))}
              {uncategorizedCount > 0 && (
                <FolderCard
                  kind="none"
                  count={uncategorizedCount}
                  active={selected === UNCATEGORIZED}
                  onSelect={onSelect}
                />
              )}
              <CreateCard onClick={openCreate} />
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-44 shrink-0 rounded-xl" />
            ))
          )}
        </div>
      )}
      {loaded && items.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có category nào. Tạo category (vd: SAP, Frontend, Backend) để gom
          ứng viên như thư mục — mọi ứng viên mới đều phải thuộc một category.
        </p>
      )}

      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CategoryFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={editTarget}
        onDone={onChanged}
      />
      <DeleteCategoryDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        category={deleteTarget}
        onDeleted={onDeleted}
      />
    </section>
  );
});
