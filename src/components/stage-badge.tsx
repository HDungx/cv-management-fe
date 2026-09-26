import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, type Stage } from "@/lib/types";

/**
 * Màu theo trạng thái. Luôn đi kèm chấm + chữ nên không chỉ dựa vào màu.
 * - `badge`: nền + chữ (nền nhạt/chữ đậm ở light, nền tối/chữ sáng ở dark).
 * - `dot`: chấm màu đậm hơn, đủ tương phản với nền badge ở cả hai chế độ.
 * - `trigger`: lớp bổ sung cho ô chọn trạng thái (ghi đè nền input mặc định).
 */
const STAGE_TONES: Record<
  Stage,
  { badge: string; dot: string; trigger: string }
> = {
  NEW: {
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
    dot: "bg-blue-600 dark:bg-blue-400",
    trigger:
      "border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900",
  },
  SCREENING: {
    badge: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    dot: "bg-amber-600 dark:bg-amber-400",
    trigger:
      "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900",
  },
  INTERVIEW: {
    badge:
      "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
    dot: "bg-violet-600 dark:bg-violet-400",
    trigger:
      "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100 dark:hover:bg-violet-900",
  },
  OFFER: {
    badge: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
    dot: "bg-teal-600 dark:bg-teal-400",
    trigger:
      "border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100 dark:hover:bg-teal-900",
  },
  HIRED: {
    badge: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
    dot: "bg-green-600 dark:bg-green-400",
    trigger:
      "border-green-300 bg-green-50 text-green-900 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-100 dark:hover:bg-green-900",
  },
  REJECTED: {
    badge: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
    dot: "bg-red-600 dark:bg-red-400",
    trigger:
      "border-red-300 bg-red-50 text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-100 dark:hover:bg-red-900",
  },
  WITHDRAWN: {
    badge: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
    dot: "bg-zinc-500 dark:bg-zinc-400",
    trigger:
      "border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
  },
};

/** Lớp màu cho trigger của ô chọn trạng thái. */
export function stageTriggerClass(stage: Stage): string {
  return STAGE_TONES[stage].trigger;
}

/** Chấm màu của trạng thái (trang trí, ẩn với trình đọc màn hình). */
export function StageDot({
  stage,
  className,
}: {
  stage: Stage;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        STAGE_TONES[stage].dot,
        className,
      )}
    />
  );
}

/** Chấm + tên trạng thái (dùng trong option/trigger của ô chọn). */
export function StageLabel({ stage }: { stage: Stage }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StageDot stage={stage} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5", STAGE_TONES[stage].badge)}
    >
      <StageDot stage={stage} />
      {STAGE_LABELS[stage]}
    </Badge>
  );
}
