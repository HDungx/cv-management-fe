import { apiFetch, ApiError } from "./api";
import { getSupabase } from "./supabase";
import type { CvFileDetail } from "./types";

export const CV_BUCKET = "cv-files";
export const CV_ACCEPT = ".pdf,.docx";
export const CV_ALLOWED_EXTENSION = /\.(pdf|docx)$/i;

export interface UploadUrl {
  id: string;
  path: string;
  token: string;
  mimeType: string;
  maxBytes: number;
}

export interface FileUrl {
  url: string;
  mimeType: string;
  fileName: string;
}

export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Upload một file CV lên Storage (chưa gắn ứng viên) và trả về id bản ghi.
 * Nếu upload lỗi, bản ghi vừa tạo được dọn đi để không để lại bản ghi rỗng.
 */
export async function uploadCvFile(file: File): Promise<string> {
  const created = await apiFetch<UploadUrl>("/cv-files/upload-url", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name }),
  });
  try {
    if (file.size > created.maxBytes) {
      throw new Error(
        `File quá lớn (tối đa ${Math.round(created.maxBytes / 1024 / 1024)} MB).`,
      );
    }
    const { error } = await getSupabase()
      .storage.from(CV_BUCKET)
      .uploadToSignedUrl(created.path, created.token, file, {
        contentType: created.mimeType,
      });
    if (error) throw error;
  } catch (err) {
    await apiFetch<void>(`/cv-files/${created.id}`, {
      method: "DELETE",
    }).catch(() => undefined);
    throw err;
  }
  return created.id;
}

/** Yêu cầu BE đọc CV (đồng bộ, có thể mất vài giây). */
export function parseCvFile(id: string) {
  return apiFetch<CvFileDetail>(`/cv-files/${id}/parse`, { method: "POST" });
}
