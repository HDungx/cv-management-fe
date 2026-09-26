"use client";

import { useRef, useState } from "react";
import { errorMessage, parseCvFile, uploadCvFile } from "@/lib/cv-upload";

export const MAX_CONCURRENT = 3;

export type QueueStatus =
  "queued" | "uploading" | "parsing" | "done" | "needs_manual" | "failed";

export interface QueueItem {
  key: string;
  fileName: string;
  status: QueueStatus;
  /** Có sau khi upload xong. */
  cvFileId?: string;
  error?: string;
}

export const ACTIVE_STATUSES: QueueStatus[] = [
  "queued",
  "uploading",
  "parsing",
];

/**
 * Hàng đợi import: mỗi file chạy upload -> parse, tối đa MAX_CONCURRENT file
 * cùng lúc. Trạng thái nằm trong `items`; File và hàng chờ nằm trong ref.
 */
export function useImportQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const files = useRef(new Map<string, File>());
  const ids = useRef(new Map<string, string>());
  const waiting = useRef<string[]>([]);
  const running = useRef(0);
  const counter = useRef(0);

  function patch(key: string, changes: Partial<QueueItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...changes } : it)),
    );
  }

  async function process(key: string) {
    const file = files.current.get(key);
    if (!file) return;
    try {
      // Thử lại sau lỗi parse thì không cần upload lại.
      let cvFileId = ids.current.get(key);
      if (!cvFileId) {
        patch(key, { status: "uploading", error: undefined });
        cvFileId = await uploadCvFile(file);
        ids.current.set(key, cvFileId);
        patch(key, { cvFileId });
      }
      patch(key, { status: "parsing", error: undefined });
      const detail = await parseCvFile(cvFileId);
      if (detail.parseStatus === "FAILED") {
        patch(key, {
          status: "failed",
          error: detail.error ?? "Không đọc được file.",
        });
      } else if (detail.parseStatus === "NEEDS_MANUAL") {
        patch(key, { status: "needs_manual" });
      } else {
        patch(key, { status: "done" });
      }
    } catch (err) {
      patch(key, {
        status: "failed",
        error: errorMessage(err, "Không xử lý được file."),
      });
    }
  }

  function pump() {
    while (running.current < MAX_CONCURRENT && waiting.current.length > 0) {
      const key = waiting.current.shift() as string;
      running.current += 1;
      void process(key).finally(() => {
        running.current -= 1;
        pump();
      });
    }
  }

  function enqueue(list: File[]) {
    const added: QueueItem[] = list.map((file) => {
      counter.current += 1;
      const key = `q${counter.current}`;
      files.current.set(key, file);
      waiting.current.push(key);
      return { key, fileName: file.name, status: "queued" };
    });
    setItems((prev) => [...prev, ...added]);
    pump();
  }

  function retry(key: string) {
    patch(key, { status: "queued", error: undefined });
    waiting.current.push(key);
    pump();
  }

  /** Bỏ các mục đã kết thúc (xong / cần nhập tay) khỏi danh sách tiến độ. */
  function clearFinished() {
    setItems((prev) => {
      const keep = prev.filter(
        (it) => it.status !== "done" && it.status !== "needs_manual",
      );
      const keepKeys = new Set(keep.map((it) => it.key));
      for (const key of [...files.current.keys()]) {
        if (!keepKeys.has(key)) {
          files.current.delete(key);
          ids.current.delete(key);
        }
      }
      return keep;
    });
  }

  return { items, enqueue, retry, clearFinished };
}
