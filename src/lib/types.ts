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
