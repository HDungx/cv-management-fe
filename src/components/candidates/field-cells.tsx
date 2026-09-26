"use client";

import Link from "next/link";
import { memo, useId } from "react";
import { Dash, LinksView, SkillsView, TruncText } from "./cells";
import { CellInput, PencilButton, useFieldEditor } from "./edit-cell";
import { STICKY_BODY_BG, STICKY_LEFT, type RowCallbacks } from "./shared";
import { TableCell } from "@/components/ui/table";
import {
  CURRENCIES,
  SOURCE_SUGGESTIONS,
  joinSkills,
} from "@/lib/candidate-form";
import { formatSalary } from "@/lib/format";
import type { SkillCatalog } from "@/lib/skills";
import { cn } from "@/lib/utils";

/**
 * Các ô sửa tại chỗ của bảng ứng viên. Mỗi ô là một component memo ở cấp
 * module, tự giữ bản nháp: gõ vào một ô không làm dòng/bảng render lại.
 */

interface CellProps extends RowCallbacks {
  id: string;
  /** Họ tên hiện tại (dùng cho toast lỗi và nhãn trợ năng). */
  name: string;
}

export const NameCell = memo(function NameCell({
  id,
  name,
  onPatch,
  onStale,
}: CellProps) {
  const ed = useFieldEditor({
    id,
    name,
    fields: ["fullName"],
    payload: ["fullName"],
    initial: { fullName: name },
    onPatch,
    onStale,
  });

  return (
    <TableCell
      {...ed.tdProps}
      className={cn("font-medium", STICKY_LEFT, STICKY_BODY_BG, ed.cellClass)}
    >
      {ed.editing ? (
        <div className="w-48">
          <CellInput
            label="Họ tên"
            placeholder="Họ và tên *"
            autoFocus
            value={ed.draft.fullName ?? ""}
            error={ed.errors.fullName}
            saving={ed.saving}
            onValueChange={(v) => ed.setField("fullName", v)}
          />
        </div>
      ) : (
        // Tên là link (một cú nhấp = điều hướng), nên nhấp đúp chỉ tính khi
        // trúng vùng ngoài link; bút chì/F2 là đường vào sửa khi tên dài.
        <div className="flex w-48 items-center gap-1">
          <Link
            href={`/candidates/${id}`}
            title={name}
            className="min-w-0 truncate hover:underline"
          >
            {name}
          </Link>
          <PencilButton
            label={`Sửa họ tên ${name}`}
            onClick={ed.start}
            className="ml-auto"
          />
        </div>
      )}
    </TableCell>
  );
});

const TEXT_FIELDS = {
  appliedRole: {
    label: "Vị trí ứng tuyển",
    placeholder: "Vị trí",
    width: "w-40",
    link: null,
  },
  email: {
    label: "Email",
    placeholder: "email@example.com",
    width: "w-48",
    link: "mailto",
  },
  phone: {
    label: "Số điện thoại",
    placeholder: "SĐT",
    width: "w-36",
    link: "tel",
  },
  source: {
    label: "Nguồn",
    placeholder: "Nguồn",
    width: "w-28",
    link: null,
  },
} as const;

export type TextField = keyof typeof TEXT_FIELDS;

/** Ô chữ đơn giản: Vị trí, Email, SĐT, Nguồn. */
export const TextFieldCell = memo(function TextFieldCell({
  id,
  name,
  field,
  value,
  onPatch,
  onStale,
}: CellProps & { field: TextField; value: string | null }) {
  const cfg = TEXT_FIELDS[field];
  const listId = useId();
  const ed = useFieldEditor({
    id,
    name,
    fields: [field],
    payload: [field],
    initial: { [field]: value ?? "" },
    onPatch,
    onStale,
  });

  let view: React.ReactNode;
  if (!value) {
    view = <Dash />;
  } else if (cfg.link) {
    // Link mailto:/tel: — nhấp đúp vào link không sửa; dùng bút chì hoặc F2.
    view = (
      <div className={cn("flex items-center gap-1", cfg.width)}>
        <a
          href={`${cfg.link}:${value}`}
          title={value}
          className="min-w-0 truncate hover:underline"
        >
          {value}
        </a>
        <PencilButton
          label={`Sửa ${cfg.label.toLowerCase()} của ${name}`}
          onClick={ed.start}
          className="ml-auto"
        />
      </div>
    );
  } else {
    view = <TruncText className={cfg.width}>{value}</TruncText>;
  }

  return (
    <TableCell {...ed.tdProps} className={ed.cellClass}>
      {ed.editing ? (
        <div className={cfg.width}>
          <CellInput
            label={cfg.label}
            placeholder={cfg.placeholder}
            inputMode={field === "email" ? "email" : undefined}
            list={field === "source" ? listId : undefined}
            autoFocus
            value={ed.draft[field] ?? ""}
            error={ed.errors[field]}
            saving={ed.saving}
            onValueChange={(v) => ed.setField(field, v)}
          />
          {field === "source" && (
            <datalist id={listId}>
              {SOURCE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </div>
      ) : (
        view
      )}
    </TableCell>
  );
});

export const SkillsFieldCell = memo(function SkillsFieldCell({
  id,
  name,
  skills,
  catalog,
  onPatch,
  onStale,
}: CellProps & { skills: string[]; catalog: SkillCatalog }) {
  const ed = useFieldEditor({
    id,
    name,
    fields: ["skills"],
    payload: ["skills"],
    initial: { skills: joinSkills(skills) },
    onPatch,
    onStale,
  });

  return (
    <TableCell {...ed.tdProps} className={ed.cellClass}>
      {ed.editing ? (
        <div className="w-48">
          <CellInput
            label="Kỹ năng (cách nhau bằng dấu phẩy)"
            placeholder="React, Node.js, SQL"
            autoFocus
            value={ed.draft.skills ?? ""}
            error={ed.errors.skills}
            saving={ed.saving}
            onValueChange={(v) => ed.setField("skills", v)}
          />
        </div>
      ) : (
        <SkillsView skills={skills} catalog={catalog} />
      )}
    </TableCell>
  );
});

export const LinksFieldCell = memo(function LinksFieldCell({
  id,
  name,
  linkedinUrl,
  githubUrl,
  onPatch,
  onStale,
}: CellProps & { linkedinUrl: string | null; githubUrl: string | null }) {
  const ed = useFieldEditor({
    id,
    name,
    fields: ["linkedinUrl", "githubUrl"],
    payload: ["linkedinUrl", "githubUrl"],
    initial: { linkedinUrl: linkedinUrl ?? "", githubUrl: githubUrl ?? "" },
    onPatch,
    onStale,
  });

  return (
    <TableCell {...ed.tdProps} className={ed.cellClass}>
      {ed.editing ? (
        <div className="w-44 space-y-1">
          <CellInput
            label="LinkedIn"
            placeholder="LinkedIn"
            autoFocus
            value={ed.draft.linkedinUrl ?? ""}
            error={ed.errors.linkedinUrl}
            saving={ed.saving}
            onValueChange={(v) => ed.setField("linkedinUrl", v)}
          />
          <CellInput
            label="GitHub"
            placeholder="GitHub"
            value={ed.draft.githubUrl ?? ""}
            error={ed.errors.githubUrl}
            saving={ed.saving}
            onValueChange={(v) => ed.setField("githubUrl", v)}
          />
        </div>
      ) : (
        <div className="flex w-44 items-center gap-1">
          <LinksView
            name={name}
            linkedinUrl={linkedinUrl}
            githubUrl={githubUrl}
          />
          <PencilButton
            label={`Sửa liên kết của ${name}`}
            onClick={ed.start}
            className="ml-auto"
          />
        </div>
      )}
    </TableCell>
  );
});

const SELECT_CLASS =
  "h-7 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground";

/** Lương: một ô sửa gồm min, max và đơn vị tiền (gửi cả ba khi lưu). */
export const SalaryFieldCell = memo(function SalaryFieldCell({
  id,
  name,
  salaryMin,
  salaryMax,
  salaryCurrency,
  onPatch,
  onStale,
}: CellProps & {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
}) {
  const currency = salaryCurrency || "VND";
  const ed = useFieldEditor({
    id,
    name,
    fields: ["salaryMin", "salaryMax", "currency"],
    payload: ["salaryMin", "salaryMax", "salaryCurrency"],
    sendAll: true,
    initial: {
      salaryMin: salaryMin?.toString() ?? "",
      salaryMax: salaryMax?.toString() ?? "",
      currency,
    },
    onPatch,
    onStale,
  });

  const draftCurrency = ed.draft.currency ?? currency;
  const currencies = CURRENCIES.some((x) => x.value === draftCurrency)
    ? CURRENCIES
    : [...CURRENCIES, { value: draftCurrency, label: draftCurrency }];
  const message = ed.errors.salaryMin ?? ed.errors.salaryMax;

  return (
    <TableCell {...ed.tdProps} className={ed.cellClass}>
      {ed.editing ? (
        <div className="w-44 space-y-1 whitespace-normal">
          <div className="grid grid-cols-2 gap-1">
            <CellInput
              label="Lương tối thiểu"
              placeholder="Từ"
              inputMode="numeric"
              autoFocus
              hideMessage
              value={ed.draft.salaryMin ?? ""}
              error={ed.errors.salaryMin}
              saving={ed.saving}
              onValueChange={(v) => ed.setField("salaryMin", v)}
            />
            <CellInput
              label="Lương tối đa"
              placeholder="Đến"
              inputMode="numeric"
              hideMessage
              value={ed.draft.salaryMax ?? ""}
              error={ed.errors.salaryMax}
              saving={ed.saving}
              onValueChange={(v) => ed.setField("salaryMax", v)}
            />
          </div>
          <select
            aria-label="Đơn vị tiền"
            className={SELECT_CLASS}
            value={draftCurrency}
            disabled={ed.saving}
            onChange={(e) => ed.setField("currency", e.target.value)}
          >
            {currencies.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          {message && (
            <p role="alert" className="text-xs text-destructive">
              {message}
            </p>
          )}
        </div>
      ) : (
        <div className="w-44 whitespace-normal">
          {formatSalary(salaryMin, salaryMax, currency)}
        </div>
      )}
    </TableCell>
  );
});
