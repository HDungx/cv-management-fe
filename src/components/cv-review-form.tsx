"use client";

import { Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CurrencyField,
  SalaryField,
  SourceField,
  type FieldChange,
  type FieldName,
} from "@/components/form-fields";
import { ReviewDuplicates } from "@/components/review-duplicates";
import { SkillsField } from "@/components/skills-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDuplicateSearch } from "@/hooks/use-duplicates";
import { ApiError, apiFetch } from "@/lib/api";
import {
  emptyFormValues,
  joinSkills,
  toCandidateInput,
  toMergeData,
  validateCandidateValues,
  type CandidateFormValues,
} from "@/lib/candidate-form";
import { mergeCvIntoCandidate } from "@/lib/duplicates";
import type {
  Candidate,
  CandidateCreateInput,
  ExtractedCv,
  FieldResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** Các trường có kết quả từ máy trích. */
type ExtractedKey = keyof ExtractedCv;

type Tone = "high" | "medium" | "low" | "none";

const INPUT_TONE: Record<Tone, string> = {
  high: "border-emerald-500 focus-visible:border-emerald-600 focus-visible:ring-emerald-500/30",
  medium:
    "border-amber-500 focus-visible:border-amber-600 focus-visible:ring-amber-500/30",
  low: "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-400/30",
  none: "",
};

const TAG_TONE: Record<Tone, string> = {
  high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  none: "bg-muted text-muted-foreground",
};

function isEmpty(result: FieldResult<unknown>): boolean {
  const v = result.value;
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  return typeof v === "string" && v.trim() === "";
}

/** Đã sửa (HR xác nhận) hoặc không có kết quả máy trích thì không tô màu. */
function toneOf(result: FieldResult<unknown> | undefined, edited: boolean) {
  if (edited || !result || isEmpty(result)) return "none";
  if (result.confidence >= 0.8) return "high";
  if (result.confidence >= 0.5) return "medium";
  return "low";
}

function initialValues(extracted: ExtractedCv | null): CandidateFormValues {
  const v = emptyFormValues();
  if (!extracted) return v;
  return {
    ...v,
    fullName: extracted.fullName.value ?? "",
    email: extracted.email.value ?? "",
    phone: extracted.phone.value ?? "",
    appliedRole: extracted.appliedRole.value ?? "",
    skills: joinSkills(extracted.skills.value ?? []),
    linkedinUrl: extracted.linkedinUrl.value ?? "",
    githubUrl: extracted.githubUrl.value ?? "",
  };
}

export function ConfidenceLegend() {
  const items: { tone: Tone; text: string }[] = [
    { tone: "high", text: "Tin cậy cao (≥ 80%)" },
    { tone: "medium", text: "Nên kiểm tra (50–79%)" },
    { tone: "low", text: "Thấp (< 50%)" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.tone} className="inline-flex items-center gap-1.5">
          <span
            className={cn("size-2.5 rounded-full border-2", {
              "border-emerald-500": it.tone === "high",
              "border-amber-500": it.tone === "medium",
              "border-red-400": it.tone === "low",
            })}
          />
          {it.text}
        </span>
      ))}
      <span>Trường bạn đã sửa sẽ hết tô màu (coi như đã xác nhận).</span>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  required,
  result,
  tone,
  showMissing,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  result?: FieldResult<unknown>;
  tone: Tone;
  showMissing: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {tone !== "none" && result && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] leading-none font-medium",
            TAG_TONE[tone],
          )}
          title={`Máy trích: nguồn ${result.source ?? "?"}, độ tin cậy ${Math.round(result.confidence * 100)}%`}
        >
          {result.source ?? "?"} · {Math.round(result.confidence * 100)}%
        </span>
      )}
      {showMissing && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] leading-none",
            TAG_TONE.none,
          )}
        >
          không tìm thấy
        </span>
      )}
    </div>
  );
}

/**
 * Nhãn + ô nhập cho một trường có kết quả máy trích. Component module-level
 * bọc memo: gõ vào ô khác không làm ô này render lại (và không bị remount).
 */
const ReviewField = memo(function ReviewField({
  id,
  name,
  label,
  value,
  result,
  edited,
  onValueChange,
  required,
  className,
  type,
  placeholder,
  hint,
}: {
  id: string;
  name: ExtractedKey;
  label: string;
  value: string;
  result: FieldResult<unknown> | undefined;
  edited: boolean;
  onValueChange: FieldChange;
  required?: boolean;
  className?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  const tone = toneOf(result, edited);
  const showMissing = !!result && !edited && isEmpty(result);
  const onSkills = useCallback(
    (v: string) => onValueChange("skills", v),
    [onValueChange],
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      <FieldLabel
        htmlFor={id}
        label={label}
        required={required}
        result={result}
        tone={tone}
        showMissing={showMissing}
      />
      {name === "skills" ? (
        <SkillsField
          id={id}
          value={value}
          onValueChange={onSkills}
          placeholder={placeholder}
          inputClassName={INPUT_TONE[tone]}
          hint={hint}
        />
      ) : (
        <>
          <Input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onValueChange(name, e.target.value)}
            placeholder={placeholder}
            className={INPUT_TONE[tone]}
            required={required}
          />
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </div>
  );
});

interface FieldOptions {
  required?: boolean;
  className?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}

function mergeErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return "File này đã được gắn với ứng viên khác.";
    if (err.status === 404) {
      return "Không tìm thấy ứng viên hoặc file (có thể đã bị xóa).";
    }
    return err.message;
  }
  return "Không thể gộp hồ sơ.";
}

export function CvReviewForm({
  cvFileId,
  extracted,
  onSaved,
}: {
  cvFileId: string;
  extracted: ExtractedCv | null;
  onSaved: (candidate: Candidate) => void;
}) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  // Toàn bộ giá trị ô nhập là state cục bộ của form; `setField` ổn định và mọi
  // ô đã memo => gõ vào một ô chỉ render lại đúng ô đó.
  const [values, setValues] = useState(() => initialValues(extracted));
  const [edited, setEdited] = useState<Partial<Record<ExtractedKey, true>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Các trường có kết quả máy trích, chốt một lần lúc mở form.
  const [extractedKeys] = useState(
    () => new Set<string>(Object.keys(extracted ?? {})),
  );

  const setField = useCallback<FieldChange>(
    (name: FieldName, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (extractedKeys.has(name)) {
        setEdited((prev) =>
          prev[name as ExtractedKey] ? prev : { ...prev, [name]: true },
        );
      }
    },
    [extractedKeys],
  );

  // Kiểm tra trùng theo email/SĐT hiện trong form (debounce, không chặn lưu).
  const { matches } = useDuplicateSearch(values.email, values.phone);

  // Hộp gộp cần giá trị mới nhất mà không phải đổi identity của callback.
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const mergeInto = useCallback(
    async (target: Candidate): Promise<boolean> => {
      const current = valuesRef.current;
      const problem = validateCandidateValues(current, { requireName: false });
      if (problem) {
        toast.error(problem);
        return false;
      }
      try {
        const saved = await mergeCvIntoCandidate(
          target.id,
          cvFileId,
          toMergeData(current),
        );
        toast.success(`Đã gộp CV vào hồ sơ ${saved.fullName}`);
        onSavedRef.current(saved);
        return true;
      } catch (err) {
        toast.error(mergeErrorMessage(err));
        return false;
      }
    },
    [cvFileId],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateCandidateValues(values);
    if (problem) {
      setError(problem);
      return;
    }
    const body: CandidateCreateInput = {
      ...toCandidateInput(values),
      cvFileId,
    };

    setError(null);
    setSubmitting(true);
    try {
      const saved = await apiFetch<Candidate>("/candidates", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Đã thêm ứng viên");
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu.");
      setSubmitting(false);
    }
  }

  const field = (key: ExtractedKey, label: string, opts: FieldOptions = {}) => (
    <ReviewField
      id={id(key)}
      name={key}
      label={label}
      value={values[key]}
      result={extracted?.[key] as FieldResult<unknown> | undefined}
      edited={edited[key] === true}
      onValueChange={setField}
      {...opts}
    />
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {extracted && <ConfidenceLegend />}

      <ReviewDuplicates matches={matches} onMerge={mergeInto} />

      <div className="grid gap-4 sm:grid-cols-2">
        {field("fullName", "Họ và tên", {
          required: true,
          className: "sm:col-span-2",
        })}
        {field("email", "Email", { type: "email" })}
        {field("phone", "Số điện thoại", { type: "tel" })}
        {field("appliedRole", "Vị trí ứng tuyển", {
          placeholder: "Frontend Developer",
          className: "sm:col-span-2",
        })}
        {field("skills", "Kỹ năng", {
          placeholder: "React, Node.js, SQL",
          hint: "Cách nhau bằng dấu phẩy.",
          className: "sm:col-span-2",
        })}
        {field("linkedinUrl", "LinkedIn", {
          placeholder: "linkedin.com/in/...",
        })}
        {field("githubUrl", "GitHub", { placeholder: "github.com/..." })}

        <SourceField
          id={id("source")}
          value={values.source}
          onValueChange={setField}
        />
        <SalaryField
          id={id("salaryMin")}
          name="salaryMin"
          label="Lương kỳ vọng — từ"
          value={values.salaryMin}
          currency={values.currency}
          onValueChange={setField}
        />
        <SalaryField
          id={id("salaryMax")}
          name="salaryMax"
          label="Lương kỳ vọng — đến"
          value={values.salaryMax}
          currency={values.currency}
          onValueChange={setField}
        />
        <CurrencyField value={values.currency} onValueChange={setField} />
      </div>

      {error && (
        <p
          role="alert"
          className="whitespace-pre-line rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {matches.length > 0 ? "Lưu thành ứng viên mới" : "Lưu ứng viên"}
        </Button>
      </div>
    </form>
  );
}
