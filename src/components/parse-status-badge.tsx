import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ParseStatus } from "@/lib/types";

const LABELS: Record<ParseStatus, string> = {
  PENDING: "Chờ đọc",
  PROCESSING: "Đang đọc",
  DONE: "Đã đọc",
  NEEDS_MANUAL: "Cần nhập tay",
  FAILED: "Lỗi",
};

const STYLES: Record<ParseStatus, string> = {
  PENDING: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  DONE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  NEEDS_MANUAL:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function ParseStatusBadge({ status }: { status: ParseStatus }) {
  return (
    <Badge variant="secondary" className={cn(STYLES[status])}>
      {LABELS[status]}
    </Badge>
  );
}
