import { apiFetch } from "./api";
import type {
  Candidate,
  DuplicateField,
  DuplicateMatch,
  MergeCvData,
} from "./types";

export function searchDuplicates(
  params: { email?: string; phone?: string; excludeId?: string },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  if (params.email) qs.set("email", params.email);
  if (params.phone) qs.set("phone", params.phone);
  if (params.excludeId) qs.set("excludeId", params.excludeId);
  return apiFetch<DuplicateMatch[]>(`/candidates/duplicates?${qs}`, { signal });
}

export function candidateDuplicates(id: string, signal?: AbortSignal) {
  return apiFetch<DuplicateMatch[]>(`/candidates/${id}/duplicates`, {
    signal,
  });
}

/** Gắn file CV vào ứng viên đã có và bổ sung các trường đang trống. */
export function mergeCvIntoCandidate(
  candidateId: string,
  cvFileId: string,
  data: MergeCvData,
) {
  return apiFetch<Candidate>(`/candidates/${candidateId}/merge-cv`, {
    method: "POST",
    body: JSON.stringify({ cvFileId, data }),
  });
}

/** Gộp hồ sơ nguồn vào hồ sơ đích; hồ sơ nguồn bị xóa. */
export function mergeCandidates(targetId: string, sourceId: string) {
  return apiFetch<Candidate>(`/candidates/${targetId}/merge`, {
    method: "POST",
    body: JSON.stringify({ sourceId }),
  });
}

const FIELD_LABELS: Record<DuplicateField, string> = {
  email: "email",
  phone: "SĐT",
};

/** "email", "SĐT" hoặc "email và SĐT". */
export function matchReason(matchedOn: DuplicateField[]): string {
  return matchedOn.map((f) => FIELD_LABELS[f]).join(" và ");
}
