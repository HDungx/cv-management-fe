import type { Stage } from "./types";

export type Granularity = "day" | "week" | "month";

/** Khoảng ngày (UTC, gồm cả hai đầu) và độ chi tiết BE thực tế đã áp dụng. */
export interface StatsRange {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
  granularity: Granularity;
}

export interface StatsResponse {
  generatedAt: string;
  /** Giá trị thực tế BE đã áp dụng (kể cả khi FE không gửi tham số). */
  range: StatsRange;
  /** Mọi số liệu tính trên cohort = ứng viên có ngày tạo trong range. */
  totals: { candidates: number; active: number; hired: number };
  /** Đủ 7 stage theo thứ tự, theo trạng thái hiện tại. */
  funnel: { stage: Stage; count: number }[];
  /** Cũ → mới, kỳ trống = 0. periodStart là ngày đầu kỳ (ngày/tuần/tháng theo range.granularity). */
  received: { periodStart: string; count: number }[];
  /** Giảm dần; source null = không rõ. */
  bySource: { source: string | null; count: number }[];
  /** Top 15 vị trí; lương theo từng đơn vị tiền, không cộng lẫn. */
  byRole: {
    role: string | null;
    count: number;
    salary: {
      currency: string;
      avgMin: number | null;
      avgMax: number | null;
      samples: number;
    }[];
  }[];
  /** Đủ 7 stage; avgDays null nếu chưa có mẫu. */
  stageDurations: { stage: Stage; avgDays: number | null; samples: number }[];
  transitions: { fromStage: Stage; toStage: Stage; count: number }[];
  /** Top 20; category là id (FRONTEND, BACKEND, ...). */
  topSkills: { skill: string; category: string; count: number }[];
  /** Đủ 9 nhóm theo thứ tự cố định (gồm ERP); luôn hiển thị theo label BE trả về. */
  skillsByCategory: { category: string; label: string; count: number }[];
}
