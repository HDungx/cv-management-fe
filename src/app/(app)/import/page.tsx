"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  FileWarning,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ParseStatusBadge } from "@/components/parse-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIVE_STATUSES,
  MAX_CONCURRENT,
  useImportQueue,
  type QueueItem,
  type QueueStatus,
} from "@/hooks/use-import-queue";
import { ApiError, apiFetch } from "@/lib/api";
import { CV_ACCEPT, CV_ALLOWED_EXTENSION, errorMessage } from "@/lib/cv-upload";
import { formatDateTime } from "@/lib/format";
import type { CvFileSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<QueueStatus, string> = {
  queued: "Chờ",
  uploading: "Đang tải lên",
  parsing: "Đang đọc",
  done: "Xong",
  needs_manual: "Cần nhập tay",
  failed: "Lỗi",
};

export default function ImportPage() {
  const queue = useImportQueue();
  const { items } = queue;

  // Mỗi khi có thêm file xử lý xong/lỗi thì tải lại danh sách chờ review.
  const settledCount = items.filter(
    (it) => !ACTIVE_STATUSES.includes(it.status),
  ).length;
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<CvFileSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<CvFileSummary[]>("/cv-files?unassigned=true", {
      signal: controller.signal,
    })
      .then((data) => {
        setList(data);
        setListError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setListError(errorMessage(err, "Không tải được danh sách."));
      });
    return () => controller.abort();
  }, [reloadKey, settledCount]);

  async function removeFile(file: CvFileSummary) {
    if (!window.confirm(`Xóa file "${file.fileName}"?`)) return;
    setBusyId(file.id);
    try {
      await apiFetch<void>(`/cv-files/${file.id}`, { method: "DELETE" });
      toast.success("Đã xóa file");
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setReloadKey((k) => k + 1);
      } else {
        toast.error(errorMessage(err, "Không thể xóa file."));
      }
    } finally {
      setBusyId(null);
    }
  }

  // File đang nằm trong hàng đợi chưa xong: chưa hiện ở danh sách review.
  const inFlight = new Set(
    items
      .filter((it) => ACTIVE_STATUSES.includes(it.status) && it.cvFileId)
      .map((it) => it.cvFileId),
  );
  const pending = list?.filter((f) => !inFlight.has(f.id));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Import CV</h1>
        <p className="text-sm text-muted-foreground">
          Chọn nhiều file PDF hoặc DOCX, hệ thống sẽ tự đọc và điền sẵn thông
          tin để bạn review. Kết quả trích xuất chỉ là bản nháp.
        </p>
      </div>

      <Dropzone onFiles={queue.enqueue} />

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tiến độ</CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={queue.clearFinished}
                disabled={
                  !items.some(
                    (it) =>
                      it.status === "done" || it.status === "needs_manual",
                  )
                }
              >
                Ẩn các mục đã xong
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {items.map((it) => (
                <QueueRow key={it.key} item={it} onRetry={queue.retry} />
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Xử lý tối đa {MAX_CONCURRENT} file cùng lúc. Đừng đóng trang khi
              đang tải lên.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chờ review</CardTitle>
        </CardHeader>
        <CardContent>
          {listError && !list ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <p className="text-sm text-muted-foreground">{listError}</p>
              <Button
                variant="outline"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Thử lại
              </Button>
            </div>
          ) : !pending ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Không có CV nào đang chờ review.
            </p>
          ) : (
            <ul className="divide-y">
              {pending.map((f) => (
                <PendingRow
                  key={f.id}
                  file={f}
                  busy={busyId === f.id}
                  onRemove={() => void removeFile(f)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Dropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(list: FileList | null) {
    if (!list) return;
    const all = Array.from(list);
    const valid = all.filter((f) => CV_ALLOWED_EXTENSION.test(f.name));
    const skipped = all.length - valid.length;
    if (skipped > 0) {
      toast.error(`Bỏ qua ${skipped} file không phải PDF/DOCX.`);
    }
    if (valid.length > 0) onFiles(valid);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-background px-4 py-10 text-center transition-colors",
        dragging && "border-primary bg-primary/5",
      )}
    >
      <UploadCloud className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Kéo thả file CV vào đây</p>
        <p className="text-xs text-muted-foreground">
          PDF hoặc DOCX, nhiều file cùng lúc
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        Chọn file
      </Button>
    </div>
  );
}

function StatusIcon({ status }: { status: QueueStatus }) {
  switch (status) {
    case "queued":
      return <Clock className="size-4 text-muted-foreground" />;
    case "uploading":
    case "parsing":
      return <Loader2 className="size-4 animate-spin text-blue-600" />;
    case "done":
      return <CheckCircle2 className="size-4 text-green-600" />;
    case "needs_manual":
      return <FileWarning className="size-4 text-amber-600" />;
    case "failed":
      return <AlertCircle className="size-4 text-destructive" />;
  }
}

function QueueRow({
  item,
  onRetry,
}: {
  item: QueueItem;
  onRetry: (key: string) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <div className="truncate" title={item.fileName}>
          {item.fileName}
        </div>
        {item.error && (
          <div className="text-xs text-destructive">{item.error}</div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {STATUS_TEXT[item.status]}
      </span>
      {item.status === "failed" && (
        <Button variant="outline" size="xs" onClick={() => onRetry(item.key)}>
          <RotateCcw />
          Thử lại
        </Button>
      )}
      {(item.status === "done" || item.status === "needs_manual") &&
        item.cvFileId && (
          <Link
            href={`/import/${item.cvFileId}`}
            className="text-xs text-primary hover:underline"
          >
            Review
          </Link>
        )}
    </li>
  );
}

function PendingRow({
  file,
  busy,
  onRemove,
}: {
  file: CvFileSummary;
  busy: boolean;
  onRemove: () => void;
}) {
  const name = file.extracted?.fullName.value;
  const email = file.extracted?.email.value;
  const summary =
    name || email
      ? [name, email].filter(Boolean).join(" · ")
      : "Chưa có thông tin trích xuất";
  return (
    <li className="flex items-center gap-2 py-1">
      <Link
        href={`/import/${file.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-0.5 text-sm">
          <div className="truncate font-medium" title={file.fileName}>
            {file.fileName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {summary} · {formatDateTime(file.uploadedAt)}
          </div>
        </div>
        <ParseStatusBadge status={file.parseStatus} />
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        aria-label="Xóa file"
        onClick={onRemove}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </li>
  );
}
