"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DuplicateWarning } from "@/components/duplicate-warning";
import {
  CurrencyField,
  SalaryField,
  SourceField,
  TextField,
  type FieldChange,
} from "@/components/form-fields";
import { SkillsField } from "@/components/skills-field";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";
import {
  candidateToFormValues,
  emptyFormValues,
  toCandidateInput,
  validateCandidateValues,
} from "@/lib/candidate-form";
import type { Candidate } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có giá trị = chế độ sửa, không có = thêm mới. */
  candidate?: Candidate;
  onSaved: (candidate: Candidate) => void;
}

export function CandidateFormDialog({
  open,
  onOpenChange,
  candidate,
  onSaved,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {candidate ? "Sửa thông tin ứng viên" : "Thêm ứng viên"}
          </DialogTitle>
          <DialogDescription>
            {candidate
              ? "Chỉnh sửa rồi bấm Lưu."
              : "Chỉ cần họ tên, các trường còn lại có thể bổ sung sau."}
          </DialogDescription>
        </DialogHeader>
        <CandidateForm
          candidate={candidate}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onSaved(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CandidateForm({
  candidate,
  onCancel,
  onSaved,
}: {
  candidate?: Candidate;
  onCancel: () => void;
  onSaved: (candidate: Candidate) => void;
}) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  // Toàn bộ giá trị ô nhập nằm trong MỘT state cục bộ của form này (không kéo
  // trang cha render lại). `setField` ổn định + các ô đã memo => gõ vào một ô
  // chỉ render lại đúng ô đó.
  const [values, setValues] = useState(() =>
    candidate ? candidateToFormValues(candidate) : emptyFormValues(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback<FieldChange>((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);
  const setSkills = useCallback(
    (value: string) => setField("skills", value),
    [setField],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateCandidateValues(values);
    if (problem) {
      setError(problem);
      return;
    }
    const body = toCandidateInput(values);

    setError(null);
    setSubmitting(true);
    try {
      const saved = candidate
        ? await apiFetch<Candidate>(`/candidates/${candidate.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await apiFetch<Candidate>("/candidates", {
            method: "POST",
            body: JSON.stringify(body),
          });
      toast.success(candidate ? "Đã lưu thay đổi" : "Đã thêm ứng viên");
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={id("fullName")}
          name="fullName"
          label="Họ và tên"
          value={values.fullName}
          onValueChange={setField}
          className="sm:col-span-2"
          autoFocus
          required
        />
        <TextField
          id={id("email")}
          name="email"
          label="Email"
          type="email"
          value={values.email}
          onValueChange={setField}
        />
        <TextField
          id={id("phone")}
          name="phone"
          label="Số điện thoại"
          type="tel"
          value={values.phone}
          onValueChange={setField}
        />
        <div className="sm:col-span-2 empty:hidden">
          <DuplicateWarning
            email={values.email}
            phone={values.phone}
            excludeId={candidate?.id}
          />
        </div>
        <TextField
          id={id("role")}
          name="appliedRole"
          label="Vị trí ứng tuyển"
          value={values.appliedRole}
          onValueChange={setField}
          placeholder="Frontend Developer"
          className="sm:col-span-2"
        />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={id("skills")}>Kỹ năng</Label>
          <SkillsField
            id={id("skills")}
            value={values.skills}
            onValueChange={setSkills}
            placeholder="React, Node.js, SQL"
          />
        </div>
        <TextField
          id={id("linkedin")}
          name="linkedinUrl"
          label="LinkedIn"
          value={values.linkedinUrl}
          onValueChange={setField}
          placeholder="linkedin.com/in/..."
        />
        <TextField
          id={id("github")}
          name="githubUrl"
          label="GitHub"
          value={values.githubUrl}
          onValueChange={setField}
          placeholder="github.com/..."
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
        <SourceField
          id={id("source")}
          value={values.source}
          onValueChange={setField}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="whitespace-pre-line rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {candidate ? "Lưu thay đổi" : "Thêm ứng viên"}
        </Button>
      </DialogFooter>
    </form>
  );
}
