"use client";

import { Loader2, Maximize2, SendHorizontal, X } from "lucide-react";
import Link from "next/link";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useEditableCell, type SaveResult } from "./edit-cell";
import {
  ADD_NOTE_WIDTH,
  MAX_NOTE_COLUMNS,
  STICKY_BODY_BG,
  STICKY_RIGHT_OFFSET,
  errorText,
  isStaleError,
  type RowCallbacks,
} from "./shared";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ListNote, Note } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_NOTE_LENGTH = 5000;
/** Độ rộng nội dung một cột ghi chú (~220px + padding ô). */
const NOTE_WIDTH = "w-56";

const ICON_BUTTON =
  "inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

function noteError(err: unknown, action: "sửa" | "xóa"): string {
  if (err instanceof ApiError && err.status === 403) {
    return `Chỉ tác giả mới được ${action} ghi chú này.`;
  }
  if (err instanceof ApiError && err.status === 404) {
    return "Ghi chú không còn tồn tại (có thể đã bị xóa).";
  }
  return errorText(err, `Không thể ${action} ghi chú.`);
}

/** Ô trống của cột "Ghi chú i" khi ứng viên có ít ghi chú hơn. */
export function EmptyNoteCell() {
  return <TableCell aria-hidden />;
}

/**
 * Ô "Ghi chú i": nội dung cắt gọn 3 dòng + popover xem đủ. Chỉ tác giả được
 * nhấp đúp để sửa (Enter lưu, Shift+Enter xuống dòng, Esc hủy, blur lưu) và xóa.
 */
export const NoteCell = memo(function NoteCell({
  candidateId,
  note,
  index,
  onPatch,
  onStale,
}: RowCallbacks & { candidateId: string; note: ListNote; index: number }) {
  const { session } = useAuth();
  const canEdit = session?.user.id === note.authorId;
  const label = `Ghi chú ${index + 1}`;

  const [draft, setDraft] = useState(note.content);
  const [showError, setShowError] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save(): Promise<SaveResult> {
    const content = draft.trim();
    if (!content) {
      setShowError(true);
      return "invalid";
    }
    if (content === note.content) return "unchanged";
    try {
      const saved = await apiFetch<Note>(
        `/candidates/${candidateId}/notes/${note.id}`,
        { method: "PATCH", body: JSON.stringify({ content }) },
      );
      onPatch(candidateId, (c) => ({
        notes: c.notes.map((n) =>
          n.id === note.id ? { ...n, content: saved.content } : n,
        ),
      }));
      return "saved";
    } catch (err) {
      toast.error(noteError(err, "sửa"));
      if (isStaleError(err)) onStale();
      return "error";
    }
  }

  const cell = useEditableCell({
    canEdit,
    multiline: true,
    onStart: () => {
      setDraft(note.content);
      setShowError(false);
      setPopoverOpen(false);
      setConfirming(false);
    },
    save,
  });

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/candidates/${candidateId}/notes/${note.id}`, {
        method: "DELETE",
      });
      // Xóa xong, dòng tự dồn ghi chú sang trái; cột thừa sẽ biến mất ở bảng.
      onPatch(candidateId, (c) => ({
        notes: c.notes.filter((n) => n.id !== note.id),
        notesCount: Math.max(0, c.notesCount - 1),
      }));
      toast.success("Đã xóa ghi chú");
    } catch (err) {
      toast.error(noteError(err, "xóa"));
      if (isStaleError(err)) onStale();
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <TableCell
      {...cell.tdProps}
      title={canEdit ? cell.tdProps.title : "Chỉ tác giả được sửa"}
      className={cn("align-top whitespace-normal", cell.cellClass)}
    >
      {cell.editing ? (
        <div className={NOTE_WIDTH}>
          <Textarea
            aria-label={label}
            aria-invalid={showError ? true : undefined}
            autoFocus
            maxLength={MAX_NOTE_LENGTH}
            value={draft}
            readOnly={cell.saving}
            className="max-h-40 min-h-14 px-2 py-1 text-sm"
            onFocus={(e) => {
              const end = e.currentTarget.value.length;
              e.currentTarget.setSelectionRange(end, end);
            }}
            onChange={(e) => setDraft(e.target.value)}
          />
          {showError ? (
            <p role="alert" className="mt-0.5 text-xs text-destructive">
              Ghi chú không được để trống.
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Enter lưu · Shift+Enter xuống dòng · Esc hủy
            </p>
          )}
        </div>
      ) : (
        <div className={cn("relative pr-6", NOTE_WIDTH)}>
          <div className="line-clamp-3 text-sm break-words whitespace-pre-wrap">
            {note.content}
          </div>
          <div
            className={cn(
              "absolute top-0 right-0 flex flex-col gap-0.5 opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100",
              (popoverOpen || confirming) && "opacity-100",
            )}
          >
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger
                className={ICON_BUTTON}
                aria-label={`Xem đầy đủ ${label.toLowerCase()}`}
                title="Xem đầy đủ"
              >
                <Maximize2 className="size-3" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                <div className="max-h-56 overflow-y-auto text-sm break-words whitespace-pre-wrap">
                  {note.content}
                </div>
                <div className="text-xs text-muted-foreground">
                  {note.authorEmail ?? "Không rõ"} ·{" "}
                  {formatDateTime(note.createdAt)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {canEdit ? "Nhấp đúp vào ô để sửa." : "Chỉ tác giả được sửa."}
                </div>
              </PopoverContent>
            </Popover>
            {canEdit && (
              <button
                type="button"
                className={cn(
                  ICON_BUTTON,
                  "hover:bg-destructive/10 hover:text-destructive",
                )}
                aria-label={`Xóa ${label.toLowerCase()}`}
                title="Xóa ghi chú"
                onClick={() => setConfirming(true)}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {confirming && (
            <div
              className="mt-1 flex items-center gap-1 text-xs"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setConfirming(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setConfirming(false);
                }
              }}
            >
              <span>Xóa?</span>
              <button
                type="button"
                disabled={deleting}
                className="inline-flex h-5 items-center gap-1 rounded bg-destructive px-1.5 text-white hover:bg-destructive/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                onClick={() => void remove()}
              >
                {deleting && <Loader2 className="size-3 animate-spin" />}
                Xóa
              </button>
              <button
                type="button"
                autoFocus
                disabled={deleting}
                className="inline-flex h-5 items-center rounded border px-1.5 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => setConfirming(false)}
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      )}
    </TableCell>
  );
});

/** Ô "Thêm ghi chú" ở cuối cụm cột ghi chú của mỗi dòng. */
export const AddNoteCell = memo(function AddNoteCell({
  id,
  hiddenCount,
  onPatch,
  onStale,
}: RowCallbacks & { id: string; hiddenCount: number }) {
  // Nội dung đang gõ nằm trong ô này: gõ ghi chú không làm cả dòng/bảng render lại.
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const canSend = draft.trim().length > 0 && !sending;

  async function submit() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const note = await apiFetch<Note>(`/candidates/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      const added: ListNote = {
        id: note.id,
        authorId: note.authorId,
        authorEmail: note.authorEmail,
        content: note.content,
        createdAt: note.createdAt,
      };
      // BE chỉ trả tối đa 10 ghi chú mới nhất: giữ đúng quy ước đó ở phía client.
      onPatch(id, (c) => ({
        notes: [...c.notes, added].slice(-MAX_NOTE_COLUMNS),
        notesCount: c.notesCount + 1,
      }));
      setDraft("");
      toast.success("Đã thêm ghi chú");
    } catch (err) {
      toast.error(errorText(err, "Không thể thêm ghi chú."));
      if (isStaleError(err)) onStale();
    } finally {
      setSending(false);
    }
  }

  return (
    <TableCell
      className={cn(
        "align-top whitespace-normal",
        STICKY_RIGHT_OFFSET,
        STICKY_BODY_BG,
        ADD_NOTE_WIDTH,
      )}
    >
      <div className={cn("space-y-1", NOTE_WIDTH)}>
        <div className="flex items-center gap-1">
          <Input
            aria-label="Thêm ghi chú"
            placeholder="Thêm ghi chú…"
            className="h-7 text-sm"
            maxLength={MAX_NOTE_LENGTH}
            value={draft}
            readOnly={sending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            aria-label="Gửi ghi chú"
            title="Gửi ghi chú (Enter)"
            disabled={!canSend}
            onClick={() => void submit()}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <SendHorizontal className="size-3.5" />
            )}
          </button>
        </div>
        {hiddenCount > 0 && (
          <Link
            href={`/candidates/${id}#ghi-chu`}
            className="block text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            +{hiddenCount} ghi chú cũ hơn
          </Link>
        )}
      </div>
    </TableCell>
  );
});
