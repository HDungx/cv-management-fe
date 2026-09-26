"use client";

import { ExternalLink } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { isStaleError, type RowCallbacks } from "./shared";
import { StageSelect } from "@/components/stage-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { formatUrl } from "@/lib/format";
import { groupSkills, type SkillCatalog } from "@/lib/skills";
import { changeStage, stageErrorMessage } from "@/lib/stage";
import type { Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SKILLS_SHOWN = 3;

export function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

/** Một dòng văn bản cắt gọn (đầy đủ nằm trong title). */
export function TruncText({
  children,
  className = "w-48",
}: {
  children: string | null;
  className?: string;
}) {
  if (!children) return <Dash />;
  return (
    <div className={cn("truncate", className)} title={children}>
      {children}
    </div>
  );
}

/** Kỹ năng: vài chip đầu theo thứ tự nhóm + "+N" (tooltip liệt kê đủ theo nhóm). */
export const SkillsView = memo(function SkillsView({
  skills,
  catalog,
}: {
  skills: string[];
  catalog: SkillCatalog;
}) {
  const groups = useMemo(() => groupSkills(skills, catalog), [skills, catalog]);
  const flat = useMemo(() => groups.flatMap((g) => g.skills), [groups]);
  if (flat.length === 0) return <Dash />;

  const extra = flat.length - MAX_SKILLS_SHOWN;
  return (
    <div className="flex w-48 flex-wrap items-center gap-1">
      {flat.slice(0, MAX_SKILLS_SHOWN).map((s) => (
        <span
          key={s}
          className="inline-flex h-5 max-w-full items-center truncate rounded-4xl border px-2 text-xs"
        >
          {s}
        </span>
      ))}
      {extra > 0 && (
        <Tooltip>
          <TooltipTrigger
            className="inline-flex h-5 items-center rounded-4xl bg-muted px-2 text-xs font-medium hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label={`Xem đủ ${flat.length} kỹ năng`}
          >
            +{extra}
          </TooltipTrigger>
          <TooltipContent className="max-w-sm space-y-1.5 whitespace-normal">
            {groups.map((g) => (
              <div key={g.id}>
                <span className="font-medium">{g.label}: </span>
                {g.skills.join(", ")}
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

function ExtLink({
  href,
  label,
  name,
}: {
  href: string;
  label: string;
  name: string;
}) {
  return (
    <a
      href={formatUrl(href)}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      aria-label={`${label} của ${name} (mở tab mới)`}
      className="inline-flex items-center gap-1 rounded text-xs hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ExternalLink className="size-3" />
      {label}
    </a>
  );
}

export const LinksView = memo(function LinksView({
  name,
  linkedinUrl,
  githubUrl,
}: {
  name: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
}) {
  if (!linkedinUrl && !githubUrl) return <Dash />;
  return (
    <div className="flex w-36 flex-wrap items-center gap-x-3 gap-y-1">
      {linkedinUrl && (
        <ExtLink href={linkedinUrl} label="LinkedIn" name={name} />
      )}
      {githubUrl && <ExtLink href={githubUrl} label="GitHub" name={name} />}
    </div>
  );
});

/**
 * Trạng thái sửa trực tiếp: đổi là gọi API ngay, cập nhật lạc quan và hoàn tác
 * khi lỗi. Response của POST /stage không có notes/notesCount nên chỉ
 * trộn các trường liên quan vào dòng cũ.
 */
export const StageCell = memo(function StageCell({
  id,
  fullName,
  status,
  onPatch,
  onStale,
}: RowCallbacks & { id: string; fullName: string; status: Stage }) {
  const [busy, setBusy] = useState(false);

  const change = useCallback(
    async (to: Stage) => {
      const previous = status;
      setBusy(true);
      onPatch(id, () => ({ status: to }));
      try {
        const updated = await changeStage(id, to);
        onPatch(id, () => ({
          status: updated.status,
          updatedAt: updated.updatedAt,
        }));
      } catch (err) {
        onPatch(id, () => ({ status: previous }));
        toast.error(`${fullName}: ${stageErrorMessage(err)}`);
        if (
          isStaleError(err) ||
          (err instanceof ApiError && err.status === 400)
        ) {
          onStale();
        }
      } finally {
        setBusy(false);
      }
    },
    [id, fullName, status, onPatch, onStale],
  );

  return (
    <StageSelect
      value={status}
      busy={busy}
      onChange={(s) => void change(s)}
      className="w-32"
    />
  );
});
