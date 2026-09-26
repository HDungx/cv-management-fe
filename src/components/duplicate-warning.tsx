"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { useDuplicateSearch } from "@/hooks/use-duplicates";
import { matchReason } from "@/lib/duplicates";

/**
 * Cảnh báo KHÔNG chặn khi email/SĐT đang nhập có thể trùng ứng viên đã có.
 * Tự debounce + hủy request cũ; lỗi thì không hiện gì.
 */
export const DuplicateWarning = memo(function DuplicateWarning({
  email,
  phone,
  excludeId,
}: {
  email: string;
  phone: string;
  excludeId?: string;
}) {
  const { matches } = useDuplicateSearch(email, phone, excludeId);
  if (matches.length === 0) return null;

  return (
    <div
      role="status"
      className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 shrink-0" />
        Có thể trùng với ứng viên đã có
      </div>
      <ul className="space-y-1">
        {matches.map(({ candidate, matchedOn }) => (
          <li key={candidate.id}>
            <Link
              href={`/candidates/${candidate.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              {candidate.fullName}
              <ExternalLink className="size-3" />
            </Link>{" "}
            <span className="text-xs">
              (trùng {matchReason(matchedOn)}
              {candidate.appliedRole ? ` · ${candidate.appliedRole}` : ""})
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs">
        Bạn vẫn có thể lưu như bình thường; mở hồ sơ để kiểm tra trước nếu cần.
      </p>
    </div>
  );
});
