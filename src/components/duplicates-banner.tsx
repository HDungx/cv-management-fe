"use client";

import { AlertTriangle, ExternalLink, GitMerge, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StageBadge } from "@/components/stage-badge";
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
import { useCandidateDuplicates } from "@/hooks/use-duplicates";
import { ApiError } from "@/lib/api";
import { matchReason, mergeCandidates } from "@/lib/duplicates";
import type { Candidate } from "@/lib/types";

/**
 * Trang chi tiết ứng viên: báo các hồ sơ khác có thể trùng và cho phép gộp
 * chúng vào hồ sơ hiện tại. Lỗi khi kiểm tra chỉ làm banner ẩn đi.
 */
export function DuplicatesBanner({
  candidate,
  refreshKey,
  onMerged,
}: {
  candidate: Pick<Candidate, "id" | "fullName">;
  /** Đổi giá trị này để hỏi lại (vd. sau khi trang tải lại dữ liệu). */
  refreshKey: number;
  onMerged: () => void;
}) {
  const matches = useCandidateDuplicates(candidate.id, refreshKey);
  const [source, setSource] = useState<Candidate | null>(null);
  const [merging, setMerging] = useState(false);

  async function confirm() {
    if (!source) return;
    setMerging(true);
    try {
      await mergeCandidates(candidate.id, source.id);
      toast.success(`Đã gộp hồ sơ ${source.fullName} vào hồ sơ này`);
      onMerged();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.status === 404
            ? "Không tìm thấy hồ sơ cần gộp (có thể đã bị xóa)."
            : err.message
          : "Không thể gộp hồ sơ.",
      );
      onMerged();
    } finally {
      setMerging(false);
      setSource(null);
    }
  }

  if (matches.length === 0 && !source) return null;

  return (
    <>
      {matches.length > 0 && (
        <div
          role="status"
          className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4 shrink-0" />
            Có {matches.length} hồ sơ có thể trùng
          </div>
          <ul className="space-y-2">
            {matches.map(({ candidate: other, matchedOn }) => (
              <li
                key={other.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-amber-200 bg-background/70 p-2 text-foreground dark:border-amber-900"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{other.fullName}</span>
                    <StageBadge stage={other.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {other.appliedRole ?? "Chưa có vị trí"} · trùng{" "}
                    {matchReason(matchedOn)}
                  </div>
                </div>
                <Link
                  href={`/candidates/${other.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs hover:underline"
                >
                  Xem hồ sơ
                  <ExternalLink className="size-3" />
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSource(other)}
                >
                  <GitMerge />
                  Gộp hồ sơ đó vào hồ sơ này
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AlertDialog
        open={source !== null}
        onOpenChange={(open) => {
          if (!open && !merging) setSource(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gộp hồ sơ vào hồ sơ này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ <strong>{source?.fullName}</strong> sẽ bị{" "}
              <strong>xóa</strong> sau khi gộp. Ghi chú, file CV và lịch sử
              trạng thái của hồ sơ đó được chuyển sang{" "}
              <strong>{candidate.fullName}</strong>; các trường đang trống ở hồ
              sơ này được bổ sung. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={merging}
              onClick={() => void confirm()}
            >
              {merging && <Loader2 className="animate-spin" />}
              Gộp và xóa hồ sơ kia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
