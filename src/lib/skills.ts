import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export const SKILL_CATEGORIES = [
  "FRONTEND",
  "BACKEND",
  "MOBILE",
  "DATABASE",
  "DEVOPS",
  "CLOUD",
  "TESTING",
  "OTHER",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Nhãn mặc định (dùng khi chưa tải được catalog từ BE). */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  MOBILE: "Mobile",
  DATABASE: "Database",
  DEVOPS: "CI/CD & DevOps",
  CLOUD: "Cloud",
  TESTING: "Testing",
  OTHER: "Khác",
};

export interface SkillCatalog {
  categories: { id: SkillCategory; label: string }[];
  skills: { name: string; category: SkillCategory }[];
}

export interface SkillGroup {
  id: SkillCategory;
  label: string;
  skills: string[];
}

/** Catalog rỗng: mọi kỹ năng rơi về nhóm "Khác". */
export const FALLBACK_CATALOG: SkillCatalog = {
  categories: SKILL_CATEGORIES.map((id) => ({
    id,
    label: SKILL_CATEGORY_LABELS[id],
  })),
  skills: [],
};

function isCategory(value: unknown): value is SkillCategory {
  return SKILL_CATEGORIES.includes(value as SkillCategory);
}

/** Chuẩn hóa dữ liệu BE trả về, phòng trường hợp thiếu/sai định dạng. */
function sanitize(raw: Partial<SkillCatalog> | null | undefined): SkillCatalog {
  const labels = new Map<SkillCategory, string>(
    Object.entries(SKILL_CATEGORY_LABELS) as [SkillCategory, string][],
  );
  for (const c of raw?.categories ?? []) {
    if (isCategory(c?.id) && typeof c.label === "string" && c.label.trim()) {
      labels.set(c.id, c.label);
    }
  }
  const skills = (raw?.skills ?? []).filter(
    (s) =>
      typeof s?.name === "string" && s.name.trim() && isCategory(s.category),
  );
  return {
    categories: SKILL_CATEGORIES.map((id) => ({
      id,
      label: labels.get(id) ?? SKILL_CATEGORY_LABELS[id],
    })),
    skills,
  };
}

let cached: SkillCatalog | null = null;
let inflight: Promise<SkillCatalog> | null = null;

/**
 * Tải catalog kỹ năng, cache trong module (một lần mỗi phiên).
 * Lỗi mạng/BE không ném ra: trả catalog rỗng (mọi kỹ năng vào nhóm "Khác")
 * và không cache kết quả lỗi để lần sau còn thử lại.
 */
export function fetchSkillCatalog(): Promise<SkillCatalog> {
  if (cached) return Promise.resolve(cached);
  inflight ??= apiFetch<SkillCatalog>("/skills/catalog")
    .then((raw) => {
      cached = sanitize(raw);
      return cached;
    })
    .catch(() => FALLBACK_CATALOG)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Catalog kỹ năng cho component; trả catalog rỗng cho tới khi tải xong. */
export function useSkillCatalog(): SkillCatalog {
  const [catalog, setCatalog] = useState<SkillCatalog>(
    () => cached ?? FALLBACK_CATALOG,
  );
  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void fetchSkillCatalog().then((c) => {
      if (!cancelled) setCatalog(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return catalog;
}

/** Bảng tra tên kỹ năng (không phân biệt hoa thường) -> nhóm. */
function categoryLookup(catalog: SkillCatalog): Map<string, SkillCategory> {
  const map = new Map<string, SkillCategory>();
  for (const s of catalog.skills) {
    map.set(s.name.trim().toLowerCase(), s.category);
  }
  return map;
}

export function categoryOf(
  skill: string,
  catalog: SkillCatalog,
): SkillCategory {
  return categoryLookup(catalog).get(skill.trim().toLowerCase()) ?? "OTHER";
}

/**
 * Nhóm kỹ năng theo mảng, thứ tự cố định (Frontend, Backend, ... Khác).
 * Bỏ nhóm rỗng; kỹ năng trùng (không phân biệt hoa thường) chỉ giữ một.
 */
export function groupSkills(
  skills: string[],
  catalog: SkillCatalog,
): SkillGroup[] {
  const lookup = categoryLookup(catalog);
  const labels = new Map(catalog.categories.map((c) => [c.id, c.label]));
  const buckets = new Map<SkillCategory, string[]>();
  const seen = new Set<string>();

  for (const raw of skills) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const category = lookup.get(key) ?? "OTHER";
    const list = buckets.get(category) ?? [];
    list.push(name);
    buckets.set(category, list);
  }

  return SKILL_CATEGORIES.flatMap((id) => {
    const list = buckets.get(id);
    if (!list || list.length === 0) return [];
    return [
      { id, label: labels.get(id) ?? SKILL_CATEGORY_LABELS[id], skills: list },
    ];
  });
}

/** Kỹ năng trong catalog, nhóm theo mảng (dùng cho gợi ý chọn nhanh). */
export function catalogGroups(catalog: SkillCatalog): SkillGroup[] {
  return groupSkills(
    catalog.skills.map((s) => s.name),
    catalog,
  );
}
