"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  KanbanColumn,
  OverlayCard,
  type DragData,
} from "@/components/kanban-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api";
import { changeStage, stageErrorMessage } from "@/lib/stage";
import {
  STAGE_LABELS,
  STAGES,
  type BoardData,
  type Candidate,
  type Stage,
} from "@/lib/types";

/** Ưu tiên cột nằm dưới con trỏ; bàn phím (không có con trỏ) dùng giao nhau hình chữ nhật. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/** Phím mũi tên trái/phải nhảy thẳng sang cột kế bên. */
const columnCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { active, collisionRect, droppableRects, over } },
) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") {
    return undefined;
  }
  event.preventDefault();
  if (!active || !collisionRect) return undefined;

  const from = (active.data.current as DragData | undefined)?.from;
  const currentId = (over?.id as Stage | undefined) ?? from;
  const index = currentId ? STAGES.indexOf(currentId) : -1;
  if (index < 0) return undefined;

  const next = STAGES[index + (event.code === "ArrowRight" ? 1 : -1)];
  const rect = next ? droppableRects.get(next) : undefined;
  if (!rect) return undefined;

  return {
    x: rect.left + (rect.width - collisionRect.width) / 2,
    y: Math.max(rect.top + 48, Math.min(collisionRect.top, rect.bottom - 48)),
  };
};

function emptyBoard(): BoardData {
  return Object.fromEntries(
    STAGES.map((s) => [s, { total: 0, items: [] }]),
  ) as unknown as BoardData;
}

function normalize(data: BoardData): BoardData {
  const board = emptyBoard();
  for (const s of STAGES) {
    if (data[s]) board[s] = { total: data[s].total, items: data[s].items };
  }
  return board;
}

/** Chuyển thẻ giữa các cột (thuần, không đổi board cũ). Trả về board cũ nếu không thấy thẻ. */
function moveCard(
  board: BoardData,
  id: string,
  from: Stage,
  to: Stage,
  insertAt = 0,
): BoardData {
  const card = board[from].items.find((c) => c.id === id);
  if (!card || from === to) return board;
  const target = [...board[to].items];
  target.splice(Math.min(insertAt, target.length), 0, { ...card, status: to });
  return {
    ...board,
    [from]: {
      total: Math.max(0, board[from].total - 1),
      items: board[from].items.filter((c) => c.id !== id),
    },
    [to]: { total: board[to].total + 1, items: target },
  };
}

function replaceCard(board: BoardData, updated: Candidate): BoardData {
  const stage = updated.status;
  if (!board[stage].items.some((c) => c.id === updated.id)) return board;
  return {
    ...board,
    [stage]: {
      ...board[stage],
      items: board[stage].items.map((c) => (c.id === updated.id ? updated : c)),
    },
  };
}

function findCard(board: BoardData | null, id: string): Candidate | undefined {
  if (!board) return undefined;
  for (const s of STAGES) {
    const c = board[s].items.find((x) => x.id === id);
    if (c) return c;
  }
  return undefined;
}

export default function BoardPage() {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeCard, setActiveCard] = useState<Candidate | null>(null);
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(new Set());

  const sensors = useSensors(
    // Phải kéo >= 8px mới bắt đầu, để click vào liên kết vẫn điều hướng bình thường.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Chạm giữ 250ms mới kéo, để vuốt cuộn trang không bị nhầm với kéo thẻ.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<BoardData>("/candidates/board", { signal: controller.signal })
      .then((data) => {
        setBoard(normalize(data));
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "Đã xảy ra lỗi không xác định."),
        );
      });
    return () => controller.abort();
  }, [reloadKey]);

  function retry() {
    setError(null);
    setReloadKey((k) => k + 1);
  }

  function setSaving(id: string, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveCard(
      (event.active.data.current as DragData | undefined)?.candidate ?? null,
    );
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const data = event.active.data.current as DragData | undefined;
    const to = event.over?.id as Stage | undefined;
    if (!board || !data || !to || !STAGES.includes(to) || to === data.from) {
      return;
    }
    const { candidate, from } = data;
    const originalIndex = board[from].items.findIndex(
      (c) => c.id === candidate.id,
    );
    if (originalIndex < 0) return;

    // Cập nhật lạc quan, lỗi thì hoàn tác.
    setBoard((b) => b && moveCard(b, candidate.id, from, to));
    setSaving(candidate.id, true);
    changeStage(candidate.id, to)
      .then((updated) => {
        setBoard((b) => b && replaceCard(b, updated));
        toast.success(
          `Đã chuyển ${candidate.fullName} sang "${STAGE_LABELS[to]}"`,
        );
      })
      .catch((err: unknown) => {
        setBoard(
          (b) => b && moveCard(b, candidate.id, to, from, originalIndex),
        );
        toast.error(stageErrorMessage(err));
        // Dữ liệu bảng đã cũ (đổi song song / đã xóa): tải lại cho đúng.
        if (err instanceof ApiError && [400, 404, 409].includes(err.status)) {
          setReloadKey((k) => k + 1);
        }
      })
      .finally(() => setSaving(candidate.id, false));
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Đã nhấc thẻ ${findCard(board, String(active.id))?.fullName ?? ""}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Thẻ ${findCard(board, String(active.id))?.fullName ?? ""} đang ở trên cột ${STAGE_LABELS[over.id as Stage]}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Đã thả thẻ ${findCard(board, String(active.id))?.fullName ?? ""} vào cột ${STAGE_LABELS[over.id as Stage]}.`
        : "Đã thả thẻ, không đổi cột.",
    onDragCancel: () => "Đã hủy kéo thẻ.",
  };

  const total = board
    ? STAGES.reduce((sum, s) => sum + board[s].total, 0)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kanban</h1>
        <p className="text-sm text-muted-foreground">
          {total != null ? `${total} ứng viên · ` : ""}
          Kéo thả thẻ sang cột khác để đổi trạng thái (giữ 250ms khi dùng cảm
          ứng; bàn phím: Space để nhấc, mũi tên trái/phải để chuyển cột, Space
          để thả).
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-12 text-center"
        >
          <p className="font-medium text-destructive">Không tải được bảng</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {error.message}
          </p>
          <Button variant="outline" onClick={retry}>
            Thử lại
          </Button>
        </div>
      ) : !board ? (
        <div className="flex gap-3 overflow-x-auto pb-2" aria-busy="true">
          {STAGES.map((s) => (
            <div
              key={s}
              className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/50 p-3"
            >
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "Nhấn Space để nhấc thẻ. Khi đang kéo, dùng mũi tên trái hoặc phải để chọn cột, Space để thả, Esc để hủy.",
            },
          }}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveCard(null)}
        >
          <div className="flex items-start gap-3 overflow-x-auto pb-2">
            {STAGES.map((s) => (
              <KanbanColumn
                key={s}
                stage={s}
                column={board[s]}
                savingIds={savingIds}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? <OverlayCard candidate={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
