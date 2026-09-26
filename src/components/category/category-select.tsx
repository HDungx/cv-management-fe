"use client";

import { FolderPlus, Loader2 } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryLabel } from "./category-parts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/hooks/use-categories";
import { categoryTone, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

const NEW_VALUE = "__new_category__";

interface SelectProps {
  /** Id category đang chọn (null = chưa chọn / chưa phân loại). */
  value: string | null;
  /** Nên truyền hàm ổn định (useCallback) để memo có tác dụng. */
  onChange: (categoryId: string, category: Category | undefined) => void;
  busy?: boolean;
  /** Thêm mục "Tạo category mới…" (mở hộp tạo nhanh, tạo xong tự chọn). */
  allowCreate?: boolean;
  /** Tô màu ô chọn theo màu category đang chọn (dùng ở bảng/trang chi tiết). */
  tinted?: boolean;
  invalid?: boolean;
  placeholder?: string;
  size?: "sm" | "default";
  id?: string;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Ô chọn category. Component memo ở cấp module; danh sách lấy từ kho category
 * dùng chung nên đổi/tạo category ở đâu cũng cập nhật ngay.
 */
export const CategorySelect = memo(function CategorySelect({
  value,
  onChange,
  busy = false,
  allowCreate = false,
  tinted = false,
  invalid,
  placeholder = "Chọn category…",
  size = "default",
  id,
  className,
  ariaLabel = "Chọn category",
  ariaDescribedBy,
}: SelectProps) {
  const { items, loaded, error } = useCategories();
  const [createOpen, setCreateOpen] = useState(false);

  const current = value ? items.find((c) => c.id === value) : undefined;
  const selectItems = useMemo(
    () => items.map((c) => ({ value: c.id, label: c.name })),
    [items],
  );

  const handleValueChange = useCallback(
    (v: string | null) => {
      if (v === NEW_VALUE) {
        setCreateOpen(true);
        return;
      }
      if (v && v !== value)
        onChange(
          v,
          items.find((c) => c.id === v),
        );
    },
    [value, onChange, items],
  );

  const handleCreated = useCallback(
    (c: Category) => onChange(c.id, c),
    [onChange],
  );

  const placeholderText = loaded
    ? placeholder
    : error
      ? "Không tải được danh sách"
      : "Đang tải…";

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={current?.id ?? null}
          items={selectItems}
          disabled={busy || (!loaded && !error)}
          onValueChange={handleValueChange}
        >
          <SelectTrigger
            id={id}
            size={size}
            aria-label={ariaLabel}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(
              "w-full min-w-40",
              tinted &&
                current &&
                cn("border-transparent", categoryTone(current.color).badge),
              className,
            )}
          >
            <SelectValue>
              {(v: string | null) => {
                const c = v ? items.find((x) => x.id === v) : undefined;
                return c ? (
                  <CategoryLabel name={c.name} color={c.color} />
                ) : (
                  <span className="text-muted-foreground">
                    {placeholderText}
                  </span>
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-56">
            {items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <CategoryLabel name={c.name} color={c.color} />
              </SelectItem>
            ))}
            {items.length === 0 && !allowCreate && (
              <SelectItem value="__empty__" disabled>
                Chưa có category nào
              </SelectItem>
            )}
            {allowCreate && (
              <>
                {items.length > 0 && <SelectSeparator />}
                <SelectItem value={NEW_VALUE}>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <FolderPlus className="size-4" aria-hidden="true" />
                    Tạo category mới…
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {busy && (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      {allowCreate && (
        <CategoryFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onDone={handleCreated}
        />
      )}
    </>
  );
});

/**
 * Ô chọn category BẮT BUỘC trong form: nhãn, ô chọn (có tạo nhanh), lỗi tại ô
 * (phần gợi ý bổ sung đặt ngoài, để ô chọn không render lại theo mỗi lần gõ).
 */
export const CategoryPicker = memo(function CategoryPicker({
  id,
  value,
  onChange,
  error,
  required = true,
  label = "Category",
  className,
}: {
  id: string;
  value: string | null;
  onChange: SelectProps["onChange"];
  error?: string | null;
  required?: boolean;
  label?: string;
  className?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <CategorySelect
        id={id}
        value={value}
        onChange={onChange}
        allowCreate
        invalid={!!error}
        ariaLabel={label}
        ariaDescribedBy={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});
