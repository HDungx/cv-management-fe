"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  STAGE_LABELS,
  type BoardColumn,
  type Candidate,
  type Stage,
} from "@/lib/types";

const MAX_SKILLS_SHOWN = 3;

export interface DragData {
  candidate: Candidate;
  from: Stage;
}

export function CardBody({ candidate }: { candidate: Candidate }) {
  const extra = candidate.skills.length - MAX_SKILLS_SHOWN;
  return (
    <>
      <Link
        href={`/candidates/${candidate.id}`}
        draggable={false}
        className="block truncate text-sm font-medium hover:underline"
      >
        {candidate.fullName}
      </Link>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">
        {candidate.appliedRole ?? "Chưa có vị trí"}
      </div>
      {candidate.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.skills.slice(0, MAX_SKILLS_SHOWN).map((s) => (
            <Badge key={s} variant="outline">
              {s}
            </Badge>
          ))}
          {extra > 0 && <Badge variant="ghost">+{extra}</Badge>}
        </div>
      )}
      <div className="mt-2 text-xs text-muted-foreground">
        Cập nhật {formatDate(candidate.updatedAt)}
      </div>
    </>
  );
}

const CARD_CLASS =
  "rounded-lg border bg-background p-3 text-left shadow-xs select-none";

export function DraggableCard({
  candidate,
  from,
  saving,
}: {
  candidate: Candidate;
  from: Stage;
  saving: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      id: candidate.id,
      data: { candidate, from } satisfies DragData,
      disabled: saving,
    });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setActivatorNodeRef(node);
      }}
      {...attributes}
      // Thẻ chứa liên kết nên không dùng role="button" mặc định của dnd-kit.
      role="group"
      aria-label={candidate.fullName}
      {...listeners}
      className={cn(
        CARD_CLASS,
        "cursor-grab touch-manipulation focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isDragging && "opacity-40",
        saving && "animate-pulse cursor-progress",
      )}
    >
      <CardBody candidate={candidate} />
    </div>
  );
}

export function OverlayCard({ candidate }: { candidate: Candidate }) {
  return (
    <div
      className={cn(
        CARD_CLASS,
        "cursor-grabbing shadow-lg ring-2 ring-ring/40",
      )}
    >
      <CardBody candidate={candidate} />
    </div>
  );
}

export function KanbanColumn({
  stage,
  column,
  savingIds,
}: {
  stage: Stage;
  column: BoardColumn;
  savingIds: ReadonlySet<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const partial = column.items.length < column.total;

  return (
    <section
      ref={setNodeRef}
      aria-label={STAGE_LABELS[stage]}
      className={cn(
        "flex max-h-[calc(100vh-13rem)] min-h-40 w-72 shrink-0 flex-col rounded-xl border bg-muted/50 transition-colors",
        isOver && "border-ring bg-muted ring-2 ring-ring/30",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
        <Badge
          variant="secondary"
          title={
            partial
              ? `Đang hiển thị ${column.items.length} trong tổng ${column.total} ứng viên`
              : undefined
          }
        >
          {partial ? `${column.items.length}/${column.total}` : column.total}
        </Badge>
      </header>
      <div className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {column.items.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Chưa có ứng viên
          </p>
        ) : (
          column.items.map((c) => (
            <DraggableCard
              key={c.id}
              candidate={c}
              from={stage}
              saving={savingIds.has(c.id)}
            />
          ))
        )}
        {partial && (
          <p className="px-1 pt-1 text-center text-xs text-muted-foreground">
            Chỉ hiển thị {column.items.length} ứng viên mới cập nhật nhất. Dùng
            trang Ứng viên để xem đủ.
          </p>
        )}
      </div>
    </section>
  );
}
