"use client";

import { ArrowLeft, ArrowRight, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CandidateFormDialog } from "@/components/candidate-form-dialog";
import { CategoryBadge } from "@/components/category/category-parts";
import { CategorySelect } from "@/components/category/category-select";
import { CvFilesCard } from "@/components/cv-files-card";
import { DuplicatesBanner } from "@/components/duplicates-banner";
import { GroupedSkills } from "@/components/grouped-skills";
import { NotesCard } from "@/components/notes-card";
import { StageBadge } from "@/components/stage-badge";
import { StageSelect } from "@/components/stage-select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { refreshCategories, toCategoryRef } from "@/hooks/use-categories";
import { ApiError, apiFetch } from "@/lib/api";
import { categoryErrorMessage } from "@/lib/category";
import {
  formatDate,
  formatDateTime,
  formatSalary,
  formatUrl,
} from "@/lib/format";
import { changeStage, stageErrorMessage } from "@/lib/stage";
import {
  STAGE_LABELS,
  type Candidate,
  type CandidateDetail,
  type Category,
  type Stage,
} from "@/lib/types";

interface Result {
  key: string;
  data?: CandidateDetail;
  error?: ApiError;
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [changingStage, setChangingStage] = useState(false);
  const [changingCategory, setChangingCategory] = useState(false);

  const requestKey = `${id}#${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<CandidateDetail>(`/candidates/${id}`, {
      signal: controller.signal,
    })
      .then((data) => setResult({ key: requestKey, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error:
            err instanceof ApiError
              ? err
              : new ApiError(0, "Đã xảy ra lỗi không xác định."),
        });
      });
    return () => controller.abort();
  }, [id, requestKey]);

  const current = result?.key === requestKey ? result : null;
  // Giữ dữ liệu cũ trong lúc làm mới để trang không nhấp nháy về skeleton.
  const candidate =
    current?.data ?? (result?.data?.id === id ? result.data : undefined);

  // Liên kết từ bảng (#ghi-chu): cuộn tới phần ghi chú khi dữ liệu đã tải xong.
  const loadedId = candidate?.id;
  useEffect(() => {
    if (loadedId && window.location.hash === "#ghi-chu") {
      document.getElementById("ghi-chu")?.scrollIntoView();
    }
  }, [loadedId]);

  async function onChangeStage(toStage: Stage) {
    setChangingStage(true);
    try {
      const updated = await changeStage(id, toStage);
      setResult((r) =>
        r?.data ? { ...r, data: { ...r.data, ...updated } } : r,
      );
      toast.success(`Đã chuyển sang "${STAGE_LABELS[toStage]}"`);
    } catch (err) {
      toast.error(stageErrorMessage(err));
    } finally {
      setChangingStage(false);
      setReloadKey((k) => k + 1);
    }
  }

  const onChangeCategory = useCallback(
    async (categoryId: string, picked: Category | undefined) => {
      setChangingCategory(true);
      try {
        const updated = await apiFetch<Candidate>(`/candidates/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ categoryId }),
        });
        setResult((r) =>
          r?.data
            ? {
                ...r,
                data: {
                  ...r.data,
                  categoryId: updated.categoryId,
                  category:
                    updated.category ?? (picked ? toCategoryRef(picked) : null),
                  updatedAt: updated.updatedAt,
                },
              }
            : r,
        );
        toast.success(`Đã chuyển vào category «${picked?.name ?? "mới"}»`);
        void refreshCategories();
      } catch (err) {
        toast.error(categoryErrorMessage(err));
        if (err instanceof ApiError && err.status === 404) {
          void refreshCategories();
        }
        setReloadKey((k) => k + 1);
      } finally {
        setChangingCategory(false);
      }
    },
    [id],
  );

  async function onDelete() {
    setDeleting(true);
    try {
      await apiFetch<void>(`/candidates/${id}`, { method: "DELETE" });
      toast.success("Đã xóa ứng viên");
      void refreshCategories();
      router.replace("/candidates");
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      toast.error(err instanceof ApiError ? err.message : "Không thể xóa.");
    }
  }

  const back = (
    <Link
      href="/candidates"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Danh sách ứng viên
    </Link>
  );

  if (current?.error) {
    const notFound =
      current.error.status === 404 || current.error.status === 400;
    return (
      <div className="space-y-4">
        {back}
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border bg-background px-4 py-14 text-center"
        >
          <p className="font-medium">
            {notFound ? "Không tìm thấy ứng viên" : "Không tải được dữ liệu"}
          </p>
          {!notFound && (
            <>
              <p className="text-sm text-muted-foreground">
                {current.error.message}
              </p>
              <Button
                variant="outline"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Thử lại
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{candidate.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StageBadge stage={candidate.status} />
            <StageSelect
              value={candidate.status}
              busy={changingStage}
              onChange={(s) => void onChangeStage(s)}
            />
            <span>{candidate.appliedRole ?? "Chưa có vị trí ứng tuyển"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CategoryBadge category={candidate.category} />
            <CategorySelect
              value={candidate.categoryId}
              busy={changingCategory}
              allowCreate
              size="sm"
              placeholder="Chưa phân loại"
              ariaLabel="Đổi category"
              className="w-44"
              onChange={(cid, picked) => void onChangeCategory(cid, picked)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil />
            Sửa
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Xóa
          </Button>
        </div>
      </div>

      <DuplicatesBanner
        candidate={candidate}
        refreshKey={reloadKey}
        onMerged={() => setReloadKey((k) => k + 1)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <InfoRow label="Email">
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="hover:underline"
                >
                  {candidate.email}
                </a>
              )}
            </InfoRow>
            <InfoRow label="Điện thoại">
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`} className="hover:underline">
                  {candidate.phone}
                </a>
              )}
            </InfoRow>
            <InfoRow label="LinkedIn">
              {candidate.linkedinUrl && (
                <ExternalLink href={candidate.linkedinUrl} />
              )}
            </InfoRow>
            <InfoRow label="GitHub">
              {candidate.githubUrl && (
                <ExternalLink href={candidate.githubUrl} />
              )}
            </InfoRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-muted-foreground">Kỹ năng</div>
              <GroupedSkills skills={candidate.skills} />
            </div>
            <div>
              <div className="text-muted-foreground">Lương kỳ vọng</div>
              <div>
                {formatSalary(
                  candidate.salaryMin,
                  candidate.salaryMax,
                  candidate.salaryCurrency,
                )}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Nguồn</div>
              <div>{candidate.source ?? "—"}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Tạo ngày {formatDate(candidate.createdAt)} · Cập nhật{" "}
              {formatDateTime(candidate.updatedAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      <CvFilesCard
        candidateId={candidate.id}
        files={candidate.files}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <NotesCard
        candidateId={candidate.id}
        notes={candidate.notes ?? []}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử trạng thái</CardTitle>
        </CardHeader>
        <CardContent>
          {candidate.stageHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lịch sử.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {[...candidate.stageHistory].reverse().map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-32 text-muted-foreground">
                    {formatDateTime(h.changedAt)}
                  </span>
                  {h.fromStage ? (
                    <>
                      <StageBadge stage={h.fromStage} />
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Tạo hồ sơ</span>
                  )}
                  <StageBadge stage={h.toStage} />
                  <span className="text-xs text-muted-foreground">
                    bởi {h.changedByEmail ?? "Không rõ"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <CandidateFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        candidate={candidate}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa ứng viên này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ <strong>{candidate.fullName}</strong> và toàn bộ lịch sử sẽ
              bị xóa vĩnh viễn, không thể khôi phục.
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
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">
        {children || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={formatUrl(href)}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {href.replace(/^https?:\/\/(www\.)?/i, "")}
    </a>
  );
}
