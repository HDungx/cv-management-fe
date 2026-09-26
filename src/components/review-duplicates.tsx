"use client";

import { AlertTriangle, ExternalLink, GitMerge, Loader2 } from "lucide-react";
import Link from "next/link";
import { memo, useState } from "react";
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
import { matchReason } from "@/lib/duplicates";
import type { Candidate, DuplicateMatch } from "@/lib/types";

/**
 * Màn review: liệt kê ứng viên có thể trùng, cho phép gộp CV này vào một
 * trong số đó (thay vì tạo ứng viên mới). Việc tạo mới vẫn luôn được phép.
 */
export const ReviewDuplicates = memo(function ReviewDuplicates({
  matches,
  onMerge,
}: {
  matches: DuplicateMatch[];
  /** Trả true nếu gộp thành công (trang cha sẽ chuyển trang). */
  onMerge: (target: Candidate) => Promise<boolean>;
}) {
  const [target, setTarget] = useState<Candidate | null>(null);
  const [merging, setMerging] = useState(false);

  if (matches.length === 0) return null;

  async function confirm() {
    if (!target) return;
    setMerging(true);
    const ok = await onMerge(target);
    // Thành công: trang sẽ chuyển sang hồ sơ đích, giữ nguyên hộp thoại.
    if (!ok) {
      setMerging(false);
      setTarget(null);
    }
  }

  return (
    <div
      role="status"
      className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 shrink-0" />
        Ứng viên có thể trùng
      </div>
      <p className="text-xs">
        Email/SĐT của CV này khớp với hồ sơ đã có. Bạn có thể gộp CV vào hồ sơ
        đó, hoặc vẫn lưu thành ứng viên mới.
      </p>
      <ul className="space-y-2">
        {matches.map(({ candidate, matchedOn }) => (
          <li
            key={candidate.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-amber-200 bg-background/70 p-2 text-foreground dark:border-amber-900"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/candidates/${candidate.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                >
                  {candidate.fullName}
                  <ExternalLink className="size-3" />
                </Link>
                <StageBadge stage={candidate.status} />
              </div>
              <div className="text-xs text-muted-foreground">
                {candidate.appliedRole ?? "Chưa có vị trí"} · trùng{" "}
                {matchReason(matchedOn)}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTarget(candidate)}
            >
              <GitMerge />
              Gộp vào ứng viên này
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !merging) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gộp CV vào ứng viên này?</AlertDialogTitle>
            <AlertDialogDescription>
              File CV sẽ được gắn vào hồ sơ <strong>{target?.fullName}</strong>{" "}
              và các trường đang trống của hồ sơ đó được bổ sung từ form bên
              cạnh (không ghi đè dữ liệu đã có). Sẽ không tạo ứng viên mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={merging}
              onClick={() => void confirm()}
            >
              {merging && <Loader2 className="animate-spin" />}
              Gộp CV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
