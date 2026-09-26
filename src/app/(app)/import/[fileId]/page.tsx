"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileWarning,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CvReviewForm } from "@/components/cv-review-form";
import { ParseStatusBadge } from "@/components/parse-status-badge";
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
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api";
import { errorMessage, parseCvFile, type FileUrl } from "@/lib/cv-upload";
import type { CvFileDetail } from "@/lib/types";

const POLL_MS = 3000;

export default function ImportReviewPage() {
  const { fileId } = useParams<{ fileId: string }>();
  return <ReviewScreen key={fileId} id={fileId} />;
}

function ReviewScreen({ id }: { id: string }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [file, setFile] = useState<CvFileDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [parsing, setParsing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<CvFileDetail>(`/cv-files/${id}`, { signal: controller.signal })
      .then((data) => {
        setFile(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "Đã xảy ra lỗi không xác định."),
        );
      });
    return () => controller.abort();
  }, [id, reloadKey]);

  // File đang được đọc ở nơi khác (vd. trang import): hỏi lại định kỳ.
  const status = file?.parseStatus;
  useEffect(() => {
    if (status !== "PROCESSING" || parsing) return;
    const timer = setTimeout(() => setReloadKey((k) => k + 1), POLL_MS);
    return () => clearTimeout(timer);
  }, [status, parsing, reloadKey]);

  async function reparse() {
    setParsing(true);
    try {
      setFile(await parseCvFile(id));
    } catch (err) {
      toast.error(errorMessage(err, "Không đọc được CV."));
      setReloadKey((k) => k + 1);
    } finally {
      setParsing(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await apiFetch<void>(`/cv-files/${id}`, { method: "DELETE" });
      toast.success("Đã bỏ file");
      router.replace("/import");
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      toast.error(errorMessage(err, "Không thể xóa file."));
    }
  }

  const back = (
    <Link
      href="/import"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Import CV
    </Link>
  );

  if (error && !file) {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <div className="space-y-4">
        {back}
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border bg-background px-4 py-14 text-center"
        >
          <p className="font-medium">
            {notFound ? "Không tìm thấy file CV" : "Không tải được dữ liệu"}
          </p>
          {!notFound && (
            <>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setReloadKey((k) => k + 1);
                }}
              >
                Thử lại
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const assigned = file.candidateId !== null;

  return (
    <div className="space-y-4">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-semibold" title={file.fileName}>
            {file.fileName}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ParseStatusBadge status={file.parseStatus} />
            <span>Review thông tin trước khi lưu ứng viên</span>
          </div>
        </div>
        {!assigned && (
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Bỏ file này
          </Button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Không cập nhật được trạng thái file: {error.message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <CvPreview file={file} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin ứng viên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assigned ? (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                <p>File này đã được gắn với một ứng viên.</p>
                <Link
                  href={`/candidates/${file.candidateId}`}
                  className="font-medium text-primary hover:underline"
                >
                  Xem hồ sơ ứng viên
                </Link>
              </div>
            ) : (
              <>
                <StatusBanner
                  file={file}
                  parsing={parsing}
                  onParse={() => void reparse()}
                />
                {file.parseStatus !== "PENDING" &&
                  file.parseStatus !== "PROCESSING" && (
                    <CvReviewForm
                      key={file.parseStatus}
                      cvFileId={file.id}
                      extracted={file.extracted}
                      onSaved={(candidate) =>
                        router.replace(`/candidates/${candidate.id}`)
                      }
                    />
                  )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ file này?</AlertDialogTitle>
            <AlertDialogDescription>
              File <strong>{file.fileName}</strong> sẽ bị xóa vĩnh viễn, không
              thể khôi phục.
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
              Xóa file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBanner({
  file,
  parsing,
  onParse,
}: {
  file: CvFileDetail;
  parsing: boolean;
  onParse: () => void;
}) {
  switch (file.parseStatus) {
    case "NEEDS_MANUAL":
      return (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <FileWarning className="mt-0.5 size-4 shrink-0" />
          <span>
            CV scan/ảnh, không đọc được text — hãy nhập tay theo file gốc bên
            cạnh.
          </span>
        </div>
      );
    case "FAILED":
      return (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Không đọc được CV
            {file.error ? `: ${file.error}` : "."} Bạn vẫn có thể nhập tay.
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={parsing}
            onClick={onParse}
          >
            {parsing ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Đọc lại
          </Button>
        </div>
      );
    case "PENDING":
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <span className="min-w-0 flex-1">
            CV chưa được đọc. Bấm để hệ thống trích xuất thông tin.
          </span>
          <Button size="sm" disabled={parsing} onClick={onParse}>
            {parsing && <Loader2 className="animate-spin" />}
            Đọc CV
          </Button>
        </div>
      );
    case "PROCESSING":
      return (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span className="min-w-0 flex-1">
            Đang đọc CV, kết quả sẽ tự hiện khi xong...
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={parsing}
            onClick={onParse}
          >
            {parsing ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Đọc lại
          </Button>
        </div>
      );
    case "DONE":
      return null;
  }
}

function CvPreview({ file }: { file: CvFileDetail }) {
  const isPdf = file.mimeType === "application/pdf";
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pdf, setPdf] = useState<{
    key: string;
    url?: string;
    error?: string;
  } | null>(null);

  const requestKey = `${file.id}#${reloadKey}`;

  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    apiFetch<FileUrl>(`/cv-files/${file.id}/url`)
      .then(({ url }) => {
        if (!cancelled) setPdf({ key: requestKey, url });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPdf({
            key: requestKey,
            error: errorMessage(err, "Không mở được file."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, isPdf, requestKey]);

  async function download() {
    setBusy(true);
    try {
      const { url } = await apiFetch<FileUrl>(
        `/cv-files/${file.id}/url?download=true`,
      );
      window.location.assign(url);
    } catch (err) {
      toast.error(errorMessage(err, "Không tải được file."));
    } finally {
      setBusy(false);
    }
  }

  const current = pdf?.key === requestKey ? pdf : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>CV gốc</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void download()}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            Tải về
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPdf ? (
          current?.url ? (
            <iframe
              src={current.url}
              title="CV gốc"
              className="h-[70vh] w-full rounded-lg border"
            />
          ) : current?.error ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 py-10 text-center"
            >
              <p className="text-sm text-muted-foreground">{current.error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Thử lại
              </Button>
            </div>
          ) : (
            <Skeleton className="h-[70vh] w-full" />
          )
        ) : file.rawText && file.rawText.trim() ? (
          <pre className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30 p-3 font-sans text-sm break-words whitespace-pre-wrap">
            {file.rawText}
          </pre>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có văn bản để hiển thị. Hãy tải file về để xem.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
