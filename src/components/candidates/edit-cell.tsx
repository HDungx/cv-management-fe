"use client";

import { Pencil } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { toast } from "sonner";
import { errorText, isStaleError, type PatchItem } from "./shared";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
import {
  emptyFormValues,
  toCandidateInput,
  validateCandidateFields,
  type CandidateFormValues,
  type FieldErrors,
} from "@/lib/candidate-form";
import type { Candidate, CandidateInput, CandidateListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const EDIT_HINT = "Nhấp đúp để sửa";

/** Phần tử tương tác bên trong ô: nhấp đúp vào đó không được mở chế độ sửa. */
const INTERACTIVE = "a,button,input,select,textarea,[role=button]";

/** Ô sửa được: gợi ý bằng con trỏ, viền nhẹ khi hover và vòng focus. */
const EDITABLE_CLASS =
  "cursor-cell hover:outline-1 hover:-outline-offset-1 hover:outline-ring/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

/** saved/unchanged = đóng ô; invalid/error = giữ ô mở. */
export type SaveResult = "saved" | "unchanged" | "invalid" | "error";

interface CellOptions {
  canEdit?: boolean;
  /** Ô nhiều dòng: Shift+Enter xuống dòng, Enter lưu. */
  multiline?: boolean;
  /** Gọi ngay trước khi vào chế độ sửa (đặt lại bản nháp). */
  onStart?: () => void;
  save: () => Promise<SaveResult>;
}

/**
 * Hành vi "sửa tại ô" kiểu bảng tính cho một <td>: nhấp đúp / Enter / F2 để
 * vào sửa, Enter = lưu, Esc = hủy, rời ô (blur) = lưu. Trạng thái nằm trong ô
 * gọi hook nên gõ chỉ render lại đúng ô đó.
 */
export function useEditableCell({
  canEdit = true,
  multiline = false,
  onStart,
  save,
}: CellOptions) {
  const ref = useRef<HTMLTableCellElement>(null);
  // Ref (không phải state) để chặn lưu chồng/blur sau khi đã đóng ô.
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  function start() {
    if (!canEdit || activeRef.current) return;
    activeRef.current = true;
    onStart?.();
    setEditing(true);
  }

  function cancel(refocus = true) {
    if (busyRef.current) return;
    finish(refocus);
  }

  function finish(refocus: boolean) {
    activeRef.current = false;
    setEditing(false);
    if (refocus) ref.current?.focus();
  }

  async function commit(refocus: boolean) {
    if (!activeRef.current || busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    let result: SaveResult = "error";
    try {
      result = await save();
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
    if (result === "saved" || result === "unchanged") finish(refocus);
  }

  // Sự kiện từ popup render qua portal vẫn nổi bọt trong cây React: bỏ qua.
  const inside = (e: { currentTarget: Element; target: EventTarget }) =>
    e.currentTarget.contains(e.target as Node);

  function onKeyDown(e: KeyboardEvent<HTMLTableCellElement>) {
    if (e.nativeEvent.isComposing || !inside(e)) return;
    if (editing) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Enter" && !(multiline && e.shiftKey)) {
        e.preventDefault();
        void commit(true);
      }
      return;
    }
    if (!canEdit) return;
    if (e.key === "F2") {
      e.preventDefault();
      start();
    } else if (e.key === "Enter" && e.target === e.currentTarget) {
      e.preventDefault();
      start();
    }
  }

  function onDoubleClick(e: MouseEvent<HTMLTableCellElement>) {
    if (!canEdit || editing || !inside(e)) return;
    const hit = (e.target as HTMLElement).closest(INTERACTIVE);
    if (hit && e.currentTarget.contains(hit)) return;
    start();
  }

  function onMouseDown(e: MouseEvent<HTMLTableCellElement>) {
    // Nhấp đúp không bôi đen từ (trừ khi nhấp vào phần tử tương tác).
    if (e.detail < 2 || !canEdit || editing || !inside(e)) return;
    const hit = (e.target as HTMLElement).closest(INTERACTIVE);
    if (!hit || !e.currentTarget.contains(hit)) e.preventDefault();
  }

  function onBlur(e: FocusEvent<HTMLTableCellElement>) {
    if (!activeRef.current) return;
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    void commit(false);
  }

  return {
    editing,
    saving,
    start,
    cancel,
    commit,
    /** Props cho <TableCell> của ô này. */
    tdProps: {
      ref,
      tabIndex: canEdit ? (editing ? -1 : 0) : undefined,
      title: canEdit && !editing ? EDIT_HINT : undefined,
      onKeyDown,
      onDoubleClick,
      onMouseDown,
      onBlur,
      "data-editing": editing ? "true" : undefined,
    },
    cellClass: cn("group/cell", canEdit && !editing && EDITABLE_CLASS),
  };
}

type FieldName = keyof CandidateFormValues;
type Draft = Partial<CandidateFormValues>;

const EMPTY_VALUES = emptyFormValues();

function pickErrors(errors: FieldErrors, fields: readonly FieldName[]) {
  const out: FieldErrors = {};
  for (const f of fields) if (errors[f]) out[f] = errors[f];
  return out;
}

interface FieldEditorOptions {
  id: string;
  /** Họ tên hiện tại của ứng viên (để nêu trong toast lỗi). */
  name: string;
  /** Các ô nhập thuộc ô bảng này. */
  fields: readonly FieldName[];
  /** Các trường gửi lên BE khi lưu ô này. */
  payload: readonly (keyof CandidateInput)[];
  /** Gửi đủ mọi trường trong payload khi có bất kỳ thay đổi nào (vd: lương). */
  sendAll?: boolean;
  /** Giá trị hiện tại của các ô nhập. */
  initial: Draft;
  onPatch: PatchItem;
  onStale: () => void;
}

/**
 * Sửa một/nhiều trường của ứng viên tại ô: kiểm tra bằng validateCandidateFields
 * (chỉ xét ô của mình), PATCH đúng trường đó và cập nhật dòng tại chỗ.
 */
export function useFieldEditor({
  id,
  name,
  fields,
  payload,
  sendAll = false,
  initial,
  onPatch,
  onStale,
}: FieldEditorOptions) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const validateOptions = { requireName: fields.includes("fullName") };

  const errors = showErrors
    ? pickErrors(
        validateCandidateFields({ ...EMPTY_VALUES, ...draft }, validateOptions),
        fields,
      )
    : {};

  async function save(): Promise<SaveResult> {
    const values = { ...EMPTY_VALUES, ...draft };
    const found = pickErrors(
      validateCandidateFields(values, validateOptions),
      fields,
    );
    if (Object.keys(found).length > 0) {
      setShowErrors(true);
      return "invalid";
    }

    const input = toCandidateInput(values);
    const before = toCandidateInput({ ...EMPTY_VALUES, ...initial });
    const changed = payload.filter(
      (k) => JSON.stringify(input[k]) !== JSON.stringify(before[k]),
    );
    if (changed.length === 0) return "unchanged";

    const keys = sendAll ? payload : changed;
    try {
      const saved = await apiFetch<Candidate>(`/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(
          Object.fromEntries(keys.map((k) => [k, input[k]])),
        ),
      });
      // Response PATCH không có notes/notesCount: chỉ ghi đè trường của ô này
      // (+ updatedAt), phần còn lại của dòng giữ nguyên.
      const patch: Partial<CandidateListItem> = Object.fromEntries(
        [...keys, "updatedAt" as const].map((k) => [k, saved[k]]),
      );
      onPatch(id, () => patch);
      return "saved";
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 404
          ? "Không tìm thấy ứng viên (có thể đã bị xóa)."
          : errorText(err, "Không thể lưu thay đổi.");
      toast.error(`${name}: ${message}`);
      if (isStaleError(err)) onStale();
      return "error";
    }
  }

  const cell = useEditableCell({
    onStart: () => {
      setDraft(initial);
      setShowErrors(false);
    },
    save,
  });

  function setField(field: FieldName, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  return { ...cell, draft, errors, setField };
}

/** Ô nhập một dòng trong chế độ sửa (kèm thông báo lỗi ngay dưới). */
export function CellInput({
  label,
  value,
  error,
  saving,
  hideMessage,
  onValueChange,
  autoFocus,
  ...rest
}: Omit<ComponentProps<"input">, "value" | "onChange" | "size"> & {
  label: string;
  value: string;
  error?: string;
  saving: boolean;
  /** Ẩn thông báo lỗi dưới ô (ô nhập vẫn đổi viền đỏ). */
  hideMessage?: boolean;
  onValueChange: (value: string) => void;
}) {
  const errorId = useId();
  return (
    <div className="min-w-0 whitespace-normal">
      <Input
        {...rest}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && !hideMessage ? errorId : undefined}
        value={value}
        readOnly={saving}
        autoFocus={autoFocus}
        className="h-7 text-sm"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onValueChange(e.target.value)}
      />
      {error && !hideMessage && (
        <p
          id={errorId}
          role="alert"
          className="mt-0.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Nút bút chì nhỏ (hiện khi hover/focus ô) để vào sửa khi vùng ô bị link chiếm. */
export function PencilButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      title={`${EDIT_HINT} (hoặc nhấn F2)`}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <Pencil className="size-3.5" />
    </button>
  );
}
