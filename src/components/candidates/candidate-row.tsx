"use client";

import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { StageCell } from "./cells";
import {
  LinksFieldCell,
  NameCell,
  SalaryFieldCell,
  SkillsFieldCell,
  TextFieldCell,
} from "./field-cells";
import { AddNoteCell, EmptyNoteCell, NoteCell } from "./note-cells";
import {
  ACTIONS_WIDTH,
  STICKY_BODY_BG,
  STICKY_RIGHT,
  type ColumnKey,
  type RowCallbacks,
  type VisibleColumns,
} from "./shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import type { SkillCatalog } from "@/lib/skills";
import type { CandidateListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface DeleteTarget {
  id: string;
  fullName: string;
}

interface RowProps extends RowCallbacks {
  candidate: CandidateListItem;
  visible: VisibleColumns;
  catalog: SkillCatalog;
  /** Số cột "Ghi chú i" đang hiện trên bảng (tính từ các dòng của trang). */
  noteCols: number;
  onRequestDelete: (target: DeleteTarget) => void;
}

/**
 * Một dòng của bảng. Mỗi ô sửa được là component memo riêng và tự giữ trạng
 * thái sửa, nên sửa nhiều ô/dòng độc lập và gõ vào một ô không render lại dòng.
 */
export const CandidateRow = memo(function CandidateRow({
  candidate: c,
  visible,
  catalog,
  noteCols,
  onPatch,
  onStale,
  onRequestDelete,
}: RowProps) {
  const show = (key: ColumnKey) => visible.has(key);
  const cb = { onPatch, onStale };
  const detailHref = `/candidates/${c.id}`;

  return (
    <TableRow className="group/row">
      <NameCell id={c.id} name={c.fullName} {...cb} />
      {show("appliedRole") && (
        <TextFieldCell
          id={c.id}
          name={c.fullName}
          field="appliedRole"
          value={c.appliedRole}
          {...cb}
        />
      )}
      {show("email") && (
        <TextFieldCell
          id={c.id}
          name={c.fullName}
          field="email"
          value={c.email}
          {...cb}
        />
      )}
      {show("phone") && (
        <TextFieldCell
          id={c.id}
          name={c.fullName}
          field="phone"
          value={c.phone}
          {...cb}
        />
      )}
      {show("skills") && (
        <SkillsFieldCell
          id={c.id}
          name={c.fullName}
          skills={c.skills}
          catalog={catalog}
          {...cb}
        />
      )}
      {show("links") && (
        <LinksFieldCell
          id={c.id}
          name={c.fullName}
          linkedinUrl={c.linkedinUrl}
          githubUrl={c.githubUrl}
          {...cb}
        />
      )}
      {show("salary") && (
        <SalaryFieldCell
          id={c.id}
          name={c.fullName}
          salaryMin={c.salaryMin}
          salaryMax={c.salaryMax}
          salaryCurrency={c.salaryCurrency}
          {...cb}
        />
      )}
      {show("source") && (
        <TextFieldCell
          id={c.id}
          name={c.fullName}
          field="source"
          value={c.source}
          {...cb}
        />
      )}
      {show("status") && (
        <TableCell>
          <StageCell
            id={c.id}
            fullName={c.fullName}
            status={c.status}
            {...cb}
          />
        </TableCell>
      )}
      {show("notes") && (
        <>
          {Array.from({ length: noteCols }, (_, i) => {
            const note = c.notes[i];
            return note ? (
              <NoteCell
                key={note.id}
                candidateId={c.id}
                note={note}
                index={i}
                {...cb}
              />
            ) : (
              <EmptyNoteCell key={`empty-${i}`} />
            );
          })}
        </>
      )}
      {show("createdAt") && (
        <TableCell className="text-muted-foreground">
          {formatDate(c.createdAt)}
        </TableCell>
      )}
      {show("updatedAt") && (
        <TableCell
          className="text-muted-foreground"
          title={formatDateTime(c.updatedAt)}
        >
          {formatDate(c.updatedAt)}
        </TableCell>
      )}
      {show("notes") && (
        <AddNoteCell
          id={c.id}
          hiddenCount={Math.max(0, c.notesCount - c.notes.length)}
          {...cb}
        />
      )}
      <TableCell className={cn(STICKY_RIGHT, ACTIONS_WIDTH, STICKY_BODY_BG)}>
        <div className="flex w-36 items-center justify-end gap-1">
          <Link
            href={detailHref}
            title="Xem chi tiết"
            aria-label={`Xem chi tiết ${c.fullName}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Eye />
            Chi tiết
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Xóa ứng viên"
            aria-label={`Xóa ${c.fullName}`}
            onClick={() => onRequestDelete({ id: c.id, fullName: c.fullName })}
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
