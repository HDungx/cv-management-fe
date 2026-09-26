import type { Stage } from "./types";

export type Granularity = "week" | "month";

export interface StatsResponse {
  generatedAt: string;
  totals: { candidates: number; active: number; hired: number };
  /** Đủ 7 stage theo thứ tự, theo trạng thái hiện tại. */
  funnel: { stage: Stage; count: number }[];
  /** Cũ → mới, kỳ trống = 0. periodStart là ISO date đầu kỳ. */
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
  /** Đủ 8 nhóm theo thứ tự cố định; label để hiển thị. */
  skillsByCategory: { category: string; label: string; count: number }[];
}
