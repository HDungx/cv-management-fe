import { Folder } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { categoryTone, type CategoryRef } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Biểu tượng thư mục tô màu category (trang trí, ẩn với trình đọc màn hình). */
export function CategoryFolderIcon({
  color,
  className,
}: {
  color: string | null | undefined;
  className?: string;
}) {
  return (
    <Folder
      aria-hidden="true"
      className={cn("size-4 shrink-0", categoryTone(color).icon, className)}
    />
  );
}

/** Thư mục + tên category (dùng trong option/trigger của ô chọn). */
export function CategoryLabel({
  name,
  color,
}: {
  name: string;
  color: string | null | undefined;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <CategoryFolderIcon color={color} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export const UNCATEGORIZED_LABEL = "Chưa phân loại";

/** Badge category; null hiện "Chưa phân loại" dạng chữ mờ. */
export const CategoryBadge = memo(function CategoryBadge({
  category,
  className,
}: {
  category: CategoryRef | null;
  className?: string;
}) {
  if (!category) {
    return (
      <span className="text-sm text-muted-foreground">
        {UNCATEGORIZED_LABEL}
      </span>
    );
  }
  return (
    <Badge
      variant="secondary"
      title={category.name}
      className={cn(
        "max-w-full gap-1.5",
        categoryTone(category.color).badge,
        className,
      )}
    >
      <CategoryFolderIcon color={category.color} className="size-3" />
      <span className="truncate">{category.name}</span>
    </Badge>
  );
});
