"use client";

import { Loader2 } from "lucide-react";
import { StageLabel, stageTriggerClass } from "@/components/stage-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGE_ITEMS = STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }));

export function StageSelect({
  value,
  busy,
  onChange,
  className,
}: {
  value: Stage;
  busy: boolean;
  onChange: (stage: Stage) => void;
  /** Lớp cho ô chọn (vd: đổi độ rộng). */
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        items={STAGE_ITEMS}
        disabled={busy}
        onValueChange={(v) => {
          if (v && v !== value) onChange(v as Stage);
        }}
      >
        <SelectTrigger
          size="sm"
          className={cn("w-36", stageTriggerClass(value), className)}
          aria-label="Đổi trạng thái"
        >
          <SelectValue>
            {(v: Stage | null) => (v ? <StageLabel stage={v} /> : null)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STAGE_ITEMS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <StageLabel stage={s.value} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {busy && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
