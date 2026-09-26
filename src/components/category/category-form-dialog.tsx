"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/use-categories";
import {
  CATEGORY_DUPLICATE_MESSAGE,
  CATEGORY_NAME_MAX,
  categoryErrorMessage,
  findCategoryByName,
  suggestColor,
} from "@/lib/category";
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_LABELS,
  categoryTone,
  type Category,
  type CategoryColor,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị = sửa (đổi tên/màu), không có = tạo mới. */
  category?: Category;
  /** Gọi sau khi lưu thành công (trước khi đóng hộp). */
  onDone?: (category: Category) => void;
}

/**
 * Hộp tạo nhanh / sửa category (tên + màu). Nội dung là component riêng nằm
 * trong DialogContent nên mỗi lần mở đều bắt đầu với state mới.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onDone,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? "Sửa category" : "Tạo category mới"}
          </DialogTitle>
          <DialogDescription>
            Category giống một thư mục để gom ứng viên cùng nhóm.
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          category={category}
          onCancel={() => onOpenChange(false)}
          onDone={(saved) => {
            onDone?.(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  onCancel,
  onDone,
}: {
  category?: Category;
  onCancel: () => void;
  onDone: (category: Category) => void;
}) {
  const uid = useId();
  const nameId = `${uid}-name`;
  const errorId = `${uid}-error`;
  const { items, create, update } = useCategories();

  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState<CategoryColor | null>(() =>
    category ? category.color : suggestColor(items.length),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Hộp này có thể nằm trong <form> khác (cây React): không để submit nổi bọt.
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên category.");
      return;
    }
    const dup = findCategoryByName(items, trimmed);
    if (dup && dup.id !== category?.id) {
      setError(CATEGORY_DUPLICATE_MESSAGE);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      let saved: Category;
      if (category) {
        const patch: { name?: string; color?: CategoryColor } = {};
        if (trimmed !== category.name) patch.name = trimmed;
        if (color && color !== category.color) patch.color = color;
        saved =
          Object.keys(patch).length > 0
            ? await update(category.id, patch)
            : category;
        toast.success("Đã cập nhật category");
      } else {
        saved = await create({ name: trimmed, color });
        toast.success(`Đã tạo category «${saved.name}»`);
      }
      onDone(saved);
    } catch (err) {
      setError(categoryErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={nameId}>Tên category</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={CATEGORY_NAME_MAX}
          placeholder="Ví dụ: SAP, Frontend, Backend..."
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label id={`${uid}-color`}>Màu</Label>
        <div
          role="radiogroup"
          aria-labelledby={`${uid}-color`}
          className="flex flex-wrap gap-2"
        >
          {CATEGORY_COLORS.map((c) => {
            const on = color === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={CATEGORY_COLOR_LABELS[c]}
                title={CATEGORY_COLOR_LABELS[c]}
                onClick={() => setColor(c)}
                className={cn(
                  "size-7 rounded-full ring-offset-2 ring-offset-popover transition focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
                  categoryTone(c).dot,
                  on ? "ring-2 ring-foreground" : "hover:scale-110",
                )}
              />
            );
          })}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {category ? "Lưu" : "Tạo category"}
        </Button>
      </DialogFooter>
    </form>
  );
}
