export const STAGES = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  NEW: "Mới",
  SCREENING: "Sàng lọc",
  INTERVIEW: "Phỏng vấn",
  OFFER: "Đề nghị",
  HIRED: "Đã nhận",
  REJECTED: "Từ chối",
  WITHDRAWN: "Rút hồ sơ",
};

export const CATEGORY_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_COLOR_LABELS: Record<CategoryColor, string> = {
  slate: "Xám",
  red: "Đỏ",
  orange: "Cam",
  amber: "Vàng",
  green: "Xanh lá",
  teal: "Xanh ngọc",
  blue: "Xanh dương",
  violet: "Tím",
  pink: "Hồng",
};

/**
 * Lớp Tailwind theo màu category (viết đủ chuỗi để Tailwind quét được).
 * - `icon`: biểu tượng thư mục (viền + nền), đủ tương phản ở light/dark.
 * - `badge`: nền + chữ của badge.
 * - `dot`: chấm/mẫu màu.
 */
export const CATEGORY_TONES: Record<
  CategoryColor,
  { icon: string; badge: string; dot: string }
> = {
  slate: {
    icon: "text-slate-600 fill-slate-200 dark:text-slate-300 dark:fill-slate-800",
    badge: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    dot: "bg-slate-500 dark:bg-slate-400",
  },
  red: {
    icon: "text-red-600 fill-red-200 dark:text-red-400 dark:fill-red-950",
    badge: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
    dot: "bg-red-500 dark:bg-red-400",
  },
  orange: {
    icon: "text-orange-600 fill-orange-200 dark:text-orange-400 dark:fill-orange-950",
    badge:
      "bg-orange-100 text-orange-950 dark:bg-orange-950 dark:text-orange-100",
    dot: "bg-orange-500 dark:bg-orange-400",
  },
  amber: {
    icon: "text-amber-600 fill-amber-200 dark:text-amber-400 dark:fill-amber-950",
    badge: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  green: {
    icon: "text-green-600 fill-green-200 dark:text-green-400 dark:fill-green-950",
    badge: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-100",
    dot: "bg-green-500 dark:bg-green-400",
  },
  teal: {
    icon: "text-teal-600 fill-teal-200 dark:text-teal-400 dark:fill-teal-950",
    badge: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
    dot: "bg-teal-500 dark:bg-teal-400",
  },
  blue: {
    icon: "text-blue-600 fill-blue-200 dark:text-blue-400 dark:fill-blue-950",
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
  violet: {
    icon: "text-violet-600 fill-violet-200 dark:text-violet-400 dark:fill-violet-950",
    badge:
      "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
    dot: "bg-violet-500 dark:bg-violet-400",
  },
  pink: {
    icon: "text-pink-600 fill-pink-200 dark:text-pink-400 dark:fill-pink-950",
    badge: "bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-100",
    dot: "bg-pink-500 dark:bg-pink-400",
  },
};

/** Lớp màu của category; color null hoặc màu lạ thì dùng màu trung tính. */
export function categoryTone(color: string | null | undefined) {
  return (
    (color ? CATEGORY_TONES[color as CategoryColor] : undefined) ??
    CATEGORY_TONES.slate
  );
}

/** Category (như một thư mục) kèm số ứng viên. */
export interface Category {
  id: string;
  name: string;
  color: CategoryColor | null;
  candidateCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Tham chiếu category nhúng trong ứng viên. */
export interface CategoryRef {
  id: string;
  name: string;
  color: CategoryColor | null;
}

/** Kết quả GET /categories. */
export interface CategoryList {
  items: Category[];
  /** Số ứng viên chưa có category ("Chưa phân loại"). */
  uncategorizedCount: number;
  /** Tổng số ứng viên. */
  total: number;
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  appliedRole: string | null;
  skills: string[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  status: Stage;
  source: string | null;
  /** null = "Chưa phân loại" (ứng viên cũ). */
  categoryId: string | null;
  category: CategoryRef | null;
  createdAt: string;
  updatedAt: string;
}

/** Ghi chú trong danh sách ứng viên (BE gộp sẵn tối đa 10 ghi chú mới nhất). */
export interface ListNote {
  id: string;
  authorId: string;
  authorEmail: string | null;
  content: string;
  createdAt: string;
}

/**
 * Ứng viên trong danh sách: kèm tổng số ghi chú thật và tối đa 10 ghi chú mới
 * nhất, sắp theo thời gian tăng dần (cũ -> mới).
 */
export type CandidateListItem = Candidate & {
  notesCount: number;
  notes: ListNote[];
};

export interface StageChange {
  id: string;
  fromStage: Stage | null;
  toStage: Stage;
  changedBy: string;
  changedByEmail: string | null;
  changedAt: string;
}

export interface Note {
  id: string;
  candidateId: string;
  authorId: string;
  authorEmail: string | null;
  content: string;
  createdAt: string;
}

export type ParseStatus =
  "PENDING" | "PROCESSING" | "DONE" | "NEEDS_MANUAL" | "FAILED";

export interface CvFile {
  id: string;
  fileName: string;
  mimeType: string;
  parseStatus: ParseStatus;
  uploadedAt: string;
}

export interface CandidateDetail extends Candidate {
  stageHistory: StageChange[];
  files: CvFile[];
  notes: Note[];
}

export interface BoardColumn {
  total: number;
  items: Candidate[];
}

export type BoardData = Record<Stage, BoardColumn>;

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortField = "createdAt" | "updatedAt" | "fullName" | "status";
export type SortOrder = "asc" | "desc";

export interface CandidateInput {
  fullName: string;
  email: string | null;
  phone: string | null;
  appliedRole: string | null;
  skills: string[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  source: string | null;
  /** Bắt buộc khi tạo ứng viên mới; khi sửa chỉ gửi nếu đổi (không null). */
  categoryId?: string;
}

export type ExtractSource =
  "label" | "heuristic" | "filename" | "dictionary" | "regex";

/** Kết quả máy trích cho một trường. confidence trong khoảng 0..1. */
export interface FieldResult<T> {
  value: T | null;
  confidence: number;
  source: ExtractSource | null;
}

export interface ExtractedCv {
  fullName: FieldResult<string>;
  email: FieldResult<string>;
  phone: FieldResult<string>;
  appliedRole: FieldResult<string>;
  skills: FieldResult<string[]>;
  linkedinUrl: FieldResult<string>;
  githubUrl: FieldResult<string>;
  /** Tên category gợi ý (vd "SAP", "Frontend"); file parse cũ có thể thiếu. */
  categoryHint?: FieldResult<string>;
}

export interface CvFileDetail {
  id: string;
  candidateId: string | null;
  fileName: string;
  mimeType: string;
  parseStatus: ParseStatus;
  extracted: ExtractedCv | null;
  rawText: string | null;
  error: string | null;
  uploadedAt: string;
}

export type CvFileSummary = Omit<CvFileDetail, "rawText">;

/** Tạo ứng viên từ màn review: gắn kèm file CV đã import. */
export interface CandidateCreateInput extends CandidateInput {
  categoryId: string;
  cvFileId?: string;
}

/** Ứng viên có thể trùng (khớp theo email và/hoặc SĐT). */
export type DuplicateField = "email" | "phone";

export interface DuplicateMatch {
  candidate: Candidate;
  matchedOn: DuplicateField[];
}

/** Dữ liệu bổ sung khi gộp CV vào ứng viên đã có (chỉ điền trường đang trống). */
export interface MergeCvData {
  fullName?: string;
  email?: string;
  phone?: string;
  appliedRole?: string;
  skills?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source?: string;
}
