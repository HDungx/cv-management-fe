import type { Candidate, CandidateInput, MergeCvData } from "./types";

export const CURRENCIES = [
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
];
export const SOURCE_SUGGESTIONS = [
  "TopCV",
  "LinkedIn",
  "Giới thiệu",
  "Website",
];

/** Giá trị các ô nhập của form ứng viên (toàn bộ là chuỗi). */
export interface CandidateFormValues {
  fullName: string;
  email: string;
  phone: string;
  appliedRole: string;
  /** Cách nhau bằng dấu phẩy. */
  skills: string;
  linkedinUrl: string;
  githubUrl: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  source: string;
}

export function emptyFormValues(): CandidateFormValues {
  return {
    fullName: "",
    email: "",
    phone: "",
    appliedRole: "",
    skills: "",
    linkedinUrl: "",
    githubUrl: "",
    salaryMin: "",
    salaryMax: "",
    currency: "VND",
    source: "",
  };
}

export function toIntOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

export function isValidAmount(n: number | null): boolean {
  return n === null || (Number.isInteger(n) && n >= 0);
}

/** Tách chuỗi kỹ năng (cách nhau bằng dấu phẩy/chấm phẩy/xuống dòng). */
export function parseSkills(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinSkills(skills: string[]): string {
  return skills.join(", ");
}

/** Lỗi theo từng ô (khóa là tên ô). Thứ tự khóa = thứ tự ưu tiên hiển thị. */
export type FieldErrors = Partial<Record<keyof CandidateFormValues, string>>;

export function validateCandidateFields(
  v: CandidateFormValues,
  { requireName = true }: { requireName?: boolean } = {},
): FieldErrors {
  const errors: FieldErrors = {};
  const minValue = toIntOrNull(v.salaryMin);
  const maxValue = toIntOrNull(v.salaryMax);
  if (requireName && !v.fullName.trim()) {
    errors.fullName = "Vui lòng nhập họ tên.";
  }
  if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) {
    errors.email = "Email không đúng định dạng.";
  }
  const amountMessage = "Lương phải là số nguyên không âm.";
  if (!isValidAmount(minValue)) errors.salaryMin = amountMessage;
  if (!isValidAmount(maxValue)) errors.salaryMax = amountMessage;
  if (
    !errors.salaryMin &&
    !errors.salaryMax &&
    minValue !== null &&
    maxValue !== null &&
    minValue > maxValue
  ) {
    errors.salaryMax = "Lương tối thiểu không được lớn hơn lương tối đa.";
  }
  return errors;
}

/** Thông báo lỗi đầu tiên (null nếu hợp lệ). */
export function validateCandidateValues(
  v: CandidateFormValues,
  options: { requireName?: boolean } = {},
): string | null {
  return Object.values(validateCandidateFields(v, options))[0] ?? null;
}

/** Giá trị ô nhập từ một ứng viên đã có (dùng cho form sửa). */
export function candidateToFormValues(
  candidate: Candidate,
): CandidateFormValues {
  return {
    fullName: candidate.fullName,
    email: candidate.email ?? "",
    phone: candidate.phone ?? "",
    appliedRole: candidate.appliedRole ?? "",
    skills: joinSkills(candidate.skills),
    linkedinUrl: candidate.linkedinUrl ?? "",
    githubUrl: candidate.githubUrl ?? "",
    salaryMin: candidate.salaryMin?.toString() ?? "",
    salaryMax: candidate.salaryMax?.toString() ?? "",
    currency: candidate.salaryCurrency || "VND",
    source: candidate.source ?? "",
  };
}

export function toCandidateInput(v: CandidateFormValues): CandidateInput {
  const nullable = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    fullName: v.fullName.trim(),
    email: nullable(v.email),
    phone: nullable(v.phone),
    appliedRole: nullable(v.appliedRole),
    skills: v.skills
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    linkedinUrl: nullable(v.linkedinUrl),
    githubUrl: nullable(v.githubUrl),
    salaryMin: toIntOrNull(v.salaryMin),
    salaryMax: toIntOrNull(v.salaryMax),
    salaryCurrency: v.currency,
    source: nullable(v.source),
  };
}

/** Dữ liệu gửi kèm khi gộp CV vào ứng viên cũ: bỏ các trường đang trống. */
export function toMergeData(v: CandidateFormValues): MergeCvData {
  const input = toCandidateInput(v);
  const hasSalary = input.salaryMin !== null || input.salaryMax !== null;
  const data: MergeCvData = {};
  if (input.fullName) data.fullName = input.fullName;
  if (input.email) data.email = input.email;
  if (input.phone) data.phone = input.phone;
  if (input.appliedRole) data.appliedRole = input.appliedRole;
  if (input.skills.length > 0) data.skills = input.skills;
  if (input.linkedinUrl) data.linkedinUrl = input.linkedinUrl;
  if (input.githubUrl) data.githubUrl = input.githubUrl;
  if (input.salaryMin !== null) data.salaryMin = input.salaryMin;
  if (input.salaryMax !== null) data.salaryMax = input.salaryMax;
  if (hasSalary) data.salaryCurrency = input.salaryCurrency;
  if (input.source) data.source = input.source;
  return data;
}

/** Email hợp lệ (đủ để hỏi BE kiểm tra trùng), đã cắt khoảng trắng. */
export function usableEmail(value: string): string {
  const v = value.trim();
  return /^\S+@\S+\.\S+$/.test(v) ? v : "";
}

/** SĐT có đủ chữ số để kiểm tra trùng (>= 9 số), giữ nguyên định dạng gõ vào. */
export function usablePhone(value: string): string {
  const v = value.trim();
  return v.replace(/\D/g, "").length >= 9 ? v : "";
}
