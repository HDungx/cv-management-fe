"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Loader2,
  Plus,
  UserX,
} from "lucide-react";
import { memo } from "react";
import {
  COLUMNS,
  ACTIONS_WIDTH,
  ADD_NOTE_WIDTH,
  STICKY_LEFT,
  STICKY_RIGHT,
  STICKY_RIGHT_OFFSET,
  type ColumnKey,
  type VisibleColumns,
} from "./shared";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { ApiError } from "@/lib/api";
import type { SortField, SortOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

const HEAD_BG = "bg-muted";

export function SortableHead({
  label,
  field,
  sortBy,
  order,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sortBy: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(HEAD_BG, className)}
      aria-sort={
        active ? (order === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-background/60"
      >
        {label}
        <Icon
          className={active ? "size-3.5" : "size-3.5 text-muted-foreground"}
        />
      </button>
    </TableHead>
  );
}

/** Hàng tiêu đề: cột Họ tên và Thao tác dính hai bên (từ màn hình md trở lên). */
export const CandidatesHeadRow = memo(function CandidatesHeadRow({
  visible,
  noteCols,
  sortBy,
  order,
  onSort,
}: {
  visible: VisibleColumns;
  /** Số cột "Ghi chú i" (động theo dữ liệu trang hiện tại). */
  noteCols: number;
  sortBy: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <SortableHead
        label="Họ tên"
        field="fullName"
        sortBy={sortBy}
        order={order}
        onSort={onSort}
        className={STICKY_LEFT}
      />
      {COLUMNS.filter((c) => visible.has(c.key)).map((c) =>
        c.key === "notes" ? (
          // Nhóm "Ghi chú": Ghi chú 1..N (động); cột nhập ghi chú dính bên phải, xem bên dưới.
          <NoteHeads key={c.key} count={noteCols} />
        ) : c.sort ? (
          <SortableHead
            key={c.key}
            label={c.label}
            field={c.sort}
            sortBy={sortBy}
            order={order}
            onSort={onSort}
          />
        ) : (
          <TableHead key={c.key} className={HEAD_BG}>
            {c.label}
          </TableHead>
        ),
      )}
      {visible.has("notes") && (
        <TableHead className={cn(HEAD_BG, STICKY_RIGHT_OFFSET, ADD_NOTE_WIDTH)}>
          Thêm ghi chú
        </TableHead>
      )}
      <TableHead
        className={cn(HEAD_BG, STICKY_RIGHT, ACTIONS_WIDTH, "text-right")}
      >
        Thao tác
      </TableHead>
    </TableRow>
  );
});

const NOTE_HEAD = "min-w-60 " + HEAD_BG;

function NoteHeads({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <TableHead key={i} className={NOTE_HEAD}>
          Ghi chú {i + 1}
        </TableHead>
      ))}
    </>
  );
}

const SKELETON_WIDTH: Record<ColumnKey, string> = {
  appliedRole: "w-32",
  email: "w-40",
  phone: "w-24",
  skills: "w-40",
  links: "w-24",
  salary: "w-36",
  source: "w-20",
  status: "w-28",
  notes: "w-52",
  createdAt: "w-20",
  updatedAt: "w-20",
};

export function SkeletonRows({ visible }: { visible: VisibleColumns }) {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i}>
      <TableCell className={cn(STICKY_LEFT, "bg-background")}>
        <Skeleton className="h-4 w-40" />
      </TableCell>
      {COLUMNS.filter((c) => visible.has(c.key)).map((c) => (
        <TableCell key={c.key}>
          <Skeleton className={cn("h-4", SKELETON_WIDTH[c.key])} />
        </TableCell>
      ))}
      {visible.has("notes") && (
        <TableCell
          className={cn(STICKY_RIGHT_OFFSET, ADD_NOTE_WIDTH, "bg-background")}
        >
          <Skeleton className="h-7 w-full" />
        </TableCell>
      )}
      <TableCell className={cn(STICKY_RIGHT, ACTIONS_WIDTH, "bg-background")}>
        <Skeleton className="ml-auto h-7 w-32" />
      </TableCell>
    </TableRow>
  ));
}

/** Chọn cột hiển thị (Họ tên và Thao tác luôn hiện). */
export const ColumnChooser = memo(function ColumnChooser({
  visible,
  onToggle,
  onShowAll,
}: {
  visible: VisibleColumns;
  onToggle: (key: ColumnKey) => void;
  onShowAll: () => void;
}) {
  const hidden = COLUMNS.length - visible.size;
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" aria-label="Chọn cột hiển thị" />}
      >
        <Columns3 />
        Cột
        {hidden > 0 && (
          <span className="text-muted-foreground">(ẩn {hidden})</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="text-xs font-medium text-muted-foreground">
          Cột hiển thị
        </div>
        <ul className="space-y-1">
          {COLUMNS.map((c) => (
            <li key={c.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={visible.has(c.key)}
                  onChange={() => onToggle(c.key)}
                />
                {c.label}
              </label>
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            Hiện tất cả
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
});

export function EmptyState({
  filtered,
  onClear,
  onCreate,
}: {
  filtered: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <UserX className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">
          {filtered ? "Không có ứng viên phù hợp" : "Chưa có ứng viên nào"}
        </p>
        <p className="text-sm text-muted-foreground">
          {filtered
            ? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
            : "Bắt đầu bằng cách thêm ứng viên đầu tiên."}
        </p>
      </div>
      {filtered ? (
        <Button variant="outline" onClick={onClear}>
          Xóa bộ lọc
        </Button>
      ) : (
        <Button onClick={onCreate}>
          <Plus />
          Thêm ứng viên
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  const forbidden = error.status === 403;
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-12 text-center"
    >
      <p className="font-medium text-destructive">
        {forbidden
          ? "Tài khoản chưa được cấp quyền"
          : "Không tải được danh sách"}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {forbidden
          ? "Email của bạn chưa nằm trong danh sách được phép (ALLOWED_EMAILS ở backend). Hãy thêm email rồi khởi động lại API."
          : error.message}
      </p>
      {!forbidden && (
        <Button variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function DeleteCandidateDialog({
  open,
  name,
  deleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  name: string;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa ứng viên này?</AlertDialogTitle>
          <AlertDialogDescription>
            Hồ sơ <strong>{name}</strong> sẽ bị xóa vĩnh viễn, gồm cả file CV đã
            tải lên, ghi chú và toàn bộ lịch sử trạng thái. Không thể khôi phục.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting && <Loader2 className="animate-spin" />}
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
