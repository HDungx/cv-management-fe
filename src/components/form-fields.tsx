"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CURRENCIES,
  SOURCE_SUGGESTIONS,
  isValidAmount,
  toIntOrNull,
  type CandidateFormValues,
} from "@/lib/candidate-form";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Các ô nhập dùng chung cho form ứng viên (dialog thêm/sửa và màn review).
 *
 * Mỗi ô là một component MODULE-LEVEL bọc React.memo và nhận `onValueChange`
 * ổn định (name, value). Nhờ vậy khi gõ vào một ô, chỉ ô đó render lại; các ô
 * còn lại (kể cả Select của base-ui) giữ nguyên props nên React bỏ qua.
 */
export type FieldName = keyof CandidateFormValues;
export type FieldChange = (name: FieldName, value: string) => void;

export const TextField = memo(function TextField({
  id,
  name,
  label,
  value,
  onValueChange,
  type,
  placeholder,
  className,
  autoFocus,
  required,
}: {
  id: string;
  name: FieldName;
  label: string;
  value: string;
  onValueChange: FieldChange;
  type?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onValueChange(name, e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required={required}
      />
    </div>
  );
});

export const SalaryField = memo(function SalaryField({
  id,
  name,
  label,
  value,
  currency,
  onValueChange,
}: {
  id: string;
  name: "salaryMin" | "salaryMax";
  label: string;
  value: string;
  currency: string;
  onValueChange: FieldChange;
}) {
  const amount = toIntOrNull(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onValueChange(name, e.target.value)}
      />
      {amount !== null && isValidAmount(amount) && (
        <p className="text-xs text-muted-foreground">
          {formatMoney(amount, currency)}
        </p>
      )}
    </div>
  );
});

export const CurrencyField = memo(function CurrencyField({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: FieldChange;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Đơn vị tiền</Label>
      <Select
        value={value}
        items={CURRENCIES}
        onValueChange={(v) => onValueChange("currency", v ?? "VND")}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

export const SourceField = memo(function SourceField({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: string;
  onValueChange: FieldChange;
}) {
  const listId = `${id}-list`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Nguồn</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onValueChange("source", e.target.value)}
        placeholder="TopCV, LinkedIn, giới thiệu..."
      />
      <datalist id={listId}>
        {SOURCE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
});
