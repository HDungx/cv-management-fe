import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounced } from "@/hooks/use-debounced";
import { usableEmail, usablePhone } from "@/lib/candidate-form";
import { candidateDuplicates, searchDuplicates } from "@/lib/duplicates";
import type { DuplicateMatch } from "@/lib/types";

const DEBOUNCE_MS = 500;

let warned = false;

/** Lỗi kiểm tra trùng không chặn thao tác chính: chỉ báo nhẹ một lần. */
function warnOnce() {
  if (warned) return;
  warned = true;
  toast("Không kiểm tra được trùng lặp lúc này.", {
    description: "Bạn vẫn có thể tiếp tục lưu bình thường.",
  });
}

function isAbort(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError";
}

interface Result {
  key: string;
  matches: DuplicateMatch[];
}

/**
 * Kiểm tra trùng theo email/SĐT đang nhập: chờ ~500ms sau lần gõ cuối, hủy
 * request cũ, bỏ qua giá trị rỗng/không hợp lệ. Lỗi => không có cảnh báo.
 */
export function useDuplicateSearch(
  email: string,
  phone: string,
  excludeId?: string,
): { matches: DuplicateMatch[]; checking: boolean } {
  const debouncedEmail = useDebounced(usableEmail(email), DEBOUNCE_MS);
  const debouncedPhone = useDebounced(usablePhone(phone), DEBOUNCE_MS);
  const [result, setResult] = useState<Result | null>(null);

  const active = Boolean(debouncedEmail || debouncedPhone);
  const key = `${debouncedEmail}|${debouncedPhone}|${excludeId ?? ""}`;

  useEffect(() => {
    if (!debouncedEmail && !debouncedPhone) return;
    const controller = new AbortController();
    searchDuplicates(
      { email: debouncedEmail, phone: debouncedPhone, excludeId },
      controller.signal,
    )
      .then((matches) => setResult({ key, matches }))
      .catch((err: unknown) => {
        if (isAbort(err) || controller.signal.aborted) return;
        setResult({ key, matches: [] });
        warnOnce();
      });
    return () => controller.abort();
  }, [key, debouncedEmail, debouncedPhone, excludeId]);

  const fresh = result?.key === key;
  return {
    matches: active && fresh ? result.matches : [],
    checking: active && !fresh,
  };
}

interface DetailResult {
  id: string;
  key: string;
  matches: DuplicateMatch[];
}

/** Các hồ sơ khác có thể trùng với ứng viên `id`; `refreshKey` đổi thì hỏi lại. */
export function useCandidateDuplicates(
  id: string,
  refreshKey: number,
): DuplicateMatch[] {
  const [result, setResult] = useState<DetailResult | null>(null);
  const key = `${id}#${refreshKey}`;

  useEffect(() => {
    const controller = new AbortController();
    candidateDuplicates(id, controller.signal)
      .then((matches) => setResult({ id, key, matches }))
      .catch((err: unknown) => {
        if (isAbort(err) || controller.signal.aborted) return;
        setResult({ id, key, matches: [] });
        warnOnce();
      });
    return () => controller.abort();
  }, [id, key]);

  // Giữ kết quả cũ (cùng ứng viên) trong lúc hỏi lại để banner không nhấp nháy.
  return result?.id === id ? result.matches : [];
}
