"use client";

import { Loader2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryLabel, UNCATEGORIZED_LABEL } from "./category-parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { refreshCategories, useCategories } from "@/hooks/use-categories";
import { ApiError } from "@/lib/api";
import { UNCATEGORIZED, categoryErrorMessage } from "@/lib/category";
import type { Category } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  /** Đã xóa xong (hoặc category đã không còn). */
  onDeleted: (id: string) => void;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onDeleted,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {category && (
          <DeleteBody
            key={category.id}
            category={category}
            onClose={() => onOpenChange(false)}
            onDeleted={onDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteBody({
  category,
  onClose,
  onDeleted,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: Props["onDeleted"];
}) {
  const labelId = useId();
  const { items, remove } = useCategories();
  const [dest, setDest] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const count = category.candidateCount;
  const destItems = useMemo(
    () => [
      ...items
        .filter((c) => c.id !== category.id)
        .map((c) => ({ value: c.id, label: c.name, color: c.color })),
      { value: UNCATEGORIZED, label: UNCATEGORIZED_LABEL, color: null },
    ],
    [items, category.id],
  );
  const destLabelItems = useMemo(
    () => destItems.map((d) => ({ value: d.value, label: d.label })),
    [destItems],
  );

  async function confirm() {
    if (count > 0 && !dest) return;
    setDeleting(true);
    try {
      await remove(category.id, count > 0 ? (dest ?? undefined) : undefined);
      toast.success(
        count > 0
          ? `Đã xóa category «${category.name}» và chuyển ${count} ứng viên`
          : `Đã xóa category «${category.name}»`,
      );
      onDeleted(category.id);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error(`Category «${category.name}» không còn tồn tại.`);
        void refreshCategories();
        onDeleted(category.id);
        onClose();
        return;
      }
      toast.error(categoryErrorMessage(err));
      if (err instanceof ApiError && err.status === 409) {
        // Category vừa có thêm ứng viên: tải lại số đếm để hộp thoại hiện đúng.
        void refreshCategories();
        if (count === 0) onClose();
      }
      setDeleting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Xóa category «{category.name}»?</DialogTitle>
        <DialogDescription>
          {count > 0 ? (
            <>
              Category này đang có <strong>{count} ứng viên</strong>. Hãy chọn
              nơi chuyển họ sang trước khi xóa (ứng viên không bị xóa).
            </>
          ) : (
            "Category đang trống. Thao tác này không thể hoàn tác."
          )}
        </DialogDescription>
      </DialogHeader>

      {count > 0 && (
        <div className="space-y-1.5">
          <span id={labelId} className="text-sm font-medium">
            Chuyển {count} ứng viên sang
          </span>
          <Select
            value={dest}
            items={destLabelItems}
            disabled={deleting}
            onValueChange={(v) => setDest(v)}
          >
            <SelectTrigger className="w-full" aria-labelledby={labelId}>
              <SelectValue>
                {(v: string | null) => {
                  const d = destItems.find((x) => x.value === v);
                  return d ? (
                    <CategoryLabel name={d.label} color={d.color} />
                  ) : (
                    <span className="text-muted-foreground">
                      Chọn nơi chuyển…
                    </span>
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {destItems.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  <CategoryLabel name={d.label} color={d.color} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" disabled={deleting} onClick={onClose}>
          Hủy
        </Button>
        <Button
          variant="destructive"
          disabled={deleting || (count > 0 && !dest)}
          onClick={() => void confirm()}
        >
          {deleting && <Loader2 className="animate-spin" />}
          {count > 0 ? "Chuyển và xóa" : "Xóa category"}
        </Button>
      </DialogFooter>
    </>
  );
}
