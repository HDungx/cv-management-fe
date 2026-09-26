"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { type Note } from "@/lib/types";

const MAX_LENGTH = 5000;

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function NotesCard({
  candidateId,
  notes,
  onChanged,
}: {
  candidateId: string;
  notes: Note[];
  onChanged: () => void;
}) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const trimmed = content.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch<Note>(`/candidates/${candidateId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed }),
      });
      setContent("");
      toast.success("Đã thêm ghi chú");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Không thể thêm ghi chú."));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/candidates/${candidateId}/notes/${toDelete.id}`, {
        method: "DELETE",
      });
      toast.success("Đã xóa ghi chú");
      onChanged();
    } catch (err) {
      const forbidden = err instanceof ApiError && err.status === 403;
      toast.error(
        forbidden
          ? "Chỉ tác giả mới được xóa ghi chú này."
          : errorMessage(err, "Không thể xóa ghi chú."),
      );
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <Card id="ghi-chu" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Ghi chú ({notes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-2">
          <Textarea
            aria-label="Nội dung ghi chú"
            placeholder="Thêm ghi chú về ứng viên..."
            maxLength={MAX_LENGTH}
            value={content}
            disabled={submitting}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {content.length}/{MAX_LENGTH}
            </span>
            <Button type="submit" disabled={!trimmed || submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Thêm ghi chú
            </Button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ghi chú.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-foreground">
                      {n.authorEmail ?? "Không rõ"}
                    </span>
                    {" · "}
                    {formatDateTime(n.createdAt)}
                  </span>
                  {userId && n.authorId === userId && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Xóa ghi chú"
                      onClick={() => setToDelete(n)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <p className="text-sm break-words whitespace-pre-wrap">
                  {n.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ghi chú này?</AlertDialogTitle>
            <AlertDialogDescription>
              Ghi chú sẽ bị xóa vĩnh viễn, không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              {deleting && <Loader2 className="animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
