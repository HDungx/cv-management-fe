import { ApiError, apiFetch } from "./api";
import { type Candidate, type Stage } from "./types";

export function changeStage(candidateId: string, toStage: Stage) {
  return apiFetch<Candidate>(`/candidates/${candidateId}/stage`, {
    method: "POST",
    body: JSON.stringify({ toStage }),
  });
}

/** Thông báo lỗi tiếng Việt cho POST /candidates/:id/stage. */
export function stageErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return "Ứng viên đã ở trạng thái này rồi.";
    if (err.status === 409) {
      return "Trạng thái vừa bị thay đổi ở nơi khác. Đã tải lại dữ liệu mới nhất.";
    }
    if (err.status === 404)
      return "Không tìm thấy ứng viên (có thể đã bị xóa).";
    return err.message;
  }
  return "Không thể đổi trạng thái.";
}
