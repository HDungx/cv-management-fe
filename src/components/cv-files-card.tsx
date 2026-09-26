"use client";

import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import { type CvFile } from "@/lib/types";

const BUCKET = "cv-files";
const ACCEPT = ".pdf,.docx";
const ALLOWED_EXTENSION = /\.(pdf|docx)$/i;

interface UploadUrl {
  id: string;
  path: string;
  token: string;
  mimeType: string;
  maxBytes: number;
}

interface FileUrl {
  url: string;
  mimeType: string;
  fileName: string;
}

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function CvFilesCard({
  candidateId,
  files,
  onChanged,
}: {
  candidateId: string;
  files: CvFile[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(
    null,
  );

  async function upload(file: File) {
    if (!ALLOWED_EXTENSION.test(file.name)) {
      toast.error("Chỉ nhận file PDF hoặc DOCX.");
      return;
    }

    setUploading(true);
    let created: UploadUrl | null = null;
    try {
      created = await apiFetch<UploadUrl>("/cv-files/upload-url", {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, candidateId }),
      });
      if (file.size > created.maxBytes) {
        throw new Error(
          `File quá lớn (tối đa ${Math.round(created.maxBytes / 1024 / 1024)} MB).`,
        );
      }
      const { error } = await getSupabase()
        .storage.from(BUCKET)
        .uploadToSignedUrl(created.path, created.token, file, {
          contentType: created.mimeType,
        });
      if (error) throw error;
      toast.success("Đã tải CV lên");
    } catch (err) {
      toast.error(errorMessage(err, "Không thể tải file lên."));
      // Bản ghi đã tạo nhưng file chưa lên được: dọn để không để lại bản ghi rỗng.
      if (created) {
        await apiFetch<void>(`/cv-files/${created.id}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
    } finally {
      setUploading(false);
      onChanged();
    }
  }

  async function togglePreview(file: CvFile) {
    if (preview?.id === file.id) {
      setPreview(null);
      return;
    }
    setBusyId(file.id);
    try {
      const { url } = await apiFetch<FileUrl>(`/cv-files/${file.id}/url`);
      setPreview({ id: file.id, url });
    } catch (err) {
      toast.error(errorMessage(err, "Không mở được file."));
    } finally {
      setBusyId(null);
    }
  }

  async function download(file: CvFile) {
    setBusyId(file.id);
    try {
      const { url } = await apiFetch<FileUrl>(
        `/cv-files/${file.id}/url?download=true`,
      );
      window.location.assign(url);
    } catch (err) {
      toast.error(errorMessage(err, "Không tải được file."));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(file: CvFile) {
    if (!window.confirm(`Xóa file "${file.fileName}"?`)) return;
    setBusyId(file.id);
    try {
      await apiFetch<void>(`/cv-files/${file.id}`, { method: "DELETE" });
      if (preview?.id === file.id) setPreview(null);
      toast.success("Đã xóa file");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Không thể xóa file."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CV</CardTitle>
        <CardAction>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            Tải CV lên
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {files.length === 0 ? (
          <p className="text-muted-foreground">
            Chưa có file CV. Chấp nhận PDF hoặc DOCX, tối đa 10 MB.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => {
              const isPdf = f.mimeType === "application/pdf";
              const busy = busyId === f.id;
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate" title={f.fileName}>
                    {f.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(f.uploadedAt)}
                  </span>
                  {isPdf && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      aria-label={preview?.id === f.id ? "Ẩn CV" : "Xem CV"}
                      onClick={() => void togglePreview(f)}
                    >
                      {preview?.id === f.id ? <EyeOff /> : <Eye />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    aria-label="Tải về"
                    onClick={() => void download(f)}
                  >
                    <Download />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    aria-label="Xóa file"
                    onClick={() => void remove(f)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {preview && (
          <iframe
            src={preview.url}
            title="Xem CV"
            className="h-[70vh] w-full rounded-lg border"
          />
        )}
      </CardContent>
    </Card>
  );
}
