import { useEffect, useState } from "react";
import { apiFetch } from "./api";

/**
 * Id nhóm kỹ năng. Danh sách nhóm và thứ tự do BE trả về (GET /skills/catalog);
 * kiểu chuỗi để nhóm mới ở BE không làm vỡ FE.
 */
export type SkillCategory = string;

/** Nhóm dùng cho kỹ năng không có trong catalog. */
export const OTHER_CATEGORY = "OTHER";

/** Nhóm và nhãn mặc định (dùng khi chưa tải được catalog từ BE). */
export const DEFAULT_SKILL_CATEGORIES: readonly {
  id: SkillCategory;
  label: string;
}[] = [
  { id: "FRONTEND", label: "Frontend" },
  { id: "BACKEND", label: "Backend" },
  { id: "MOBILE", label: "Mobile" },
  { id: "DATABASE", label: "Database" },
  { id: "DEVOPS", label: "CI/CD & DevOps" },
  { id: "CLOUD", label: "Cloud" },
  { id: "TESTING", label: "Testing" },
  { id: "ERP", label: "SAP / ERP" },
  { id: OTHER_CATEGORY, label: "Khác" },
];

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
  categories: DEFAULT_SKILL_CATEGORIES.map((c) => ({ ...c })),
  skills: [],
};

const nonEmpty = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "";

/** Nhãn tạm cho nhóm lạ (chỉ có id): FOO_BAR -> "Foo bar". */
function labelFromId(id: string): string {
  const text = id.replace(/[_-]+/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Chuẩn hóa dữ liệu BE trả về, phòng trường hợp thiếu/sai định dạng.
 * Thứ tự và nhãn nhóm theo BE (nhóm "Khác" luôn ở cuối); nhóm chỉ xuất hiện ở
 * danh sách kỹ năng cũng được thêm vào; thiếu hẳn `categories` thì dùng mặc định.
 */
function sanitize(raw: Partial<SkillCatalog> | null | undefined): SkillCatalog {
  const defaults = new Map(
    DEFAULT_SKILL_CATEGORIES.map((c) => [c.id, c.label]),
  );
  const order: SkillCategory[] = [];
  const labels = new Map<SkillCategory, string>();
  const add = (id: string, label?: string) => {
    if (!labels.has(id)) order.push(id);
    if (!labels.has(id) || label) {
      labels.set(id, label ?? defaults.get(id) ?? labelFromId(id));
    }
  };

  const fromBe = (raw?.categories ?? []).filter((c) => nonEmpty(c?.id));
  if (fromBe.length > 0) {
    for (const c of fromBe) add(c.id, nonEmpty(c.label) ? c.label : undefined);
  } else {
    for (const c of DEFAULT_SKILL_CATEGORIES) add(c.id, c.label);
  }

  const skills = (raw?.skills ?? []).filter(
    (s) => nonEmpty(s?.name) && nonEmpty(s?.category),
  );
  for (const s of skills) add(s.category);
  add(OTHER_CATEGORY);

  const ids = [...order.filter((id) => id !== OTHER_CATEGORY), OTHER_CATEGORY];
  return {
    categories: ids.map((id) => ({ id, label: labels.get(id) ?? id })),
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

/** Bảng tra tên kỹ năng (không phân biệt hoa thường) -> nhóm; cache theo catalog. */
const lookups = new WeakMap<SkillCatalog, Map<string, SkillCategory>>();

function categoryLookup(catalog: SkillCatalog): Map<string, SkillCategory> {
  let map = lookups.get(catalog);
  if (!map) {
    map = new Map();
    for (const s of catalog.skills) {
      map.set(s.name.trim().toLowerCase(), s.category);
    }
    lookups.set(catalog, map);
  }
  return map;
}

export function categoryOf(
  skill: string,
  catalog: SkillCatalog,
): SkillCategory {
  return (
    categoryLookup(catalog).get(skill.trim().toLowerCase()) ?? OTHER_CATEGORY
  );
}

/**
 * Nhóm kỹ năng theo mảng, thứ tự nhóm theo catalog của BE (nhóm "Khác" cuối).
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
    const category = lookup.get(key) ?? OTHER_CATEGORY;
    const list = buckets.get(category) ?? [];
    list.push(name);
    buckets.set(category, list);
  }

  // Nhóm không có trong danh sách nhóm (không xảy ra sau sanitize) xếp trước "Khác".
  const known = catalog.categories.map((c) => c.id);
  const extra = [...buckets.keys()].filter((id) => !known.includes(id));
  const order = [
    ...known.filter((id) => id !== OTHER_CATEGORY),
    ...extra,
    OTHER_CATEGORY,
  ];

  return order.flatMap((id) => {
    const list = buckets.get(id);
    if (!list || list.length === 0) return [];
    return [{ id, label: labels.get(id) ?? labelFromId(id), skills: list }];
  });
}

/** Kỹ năng trong catalog, nhóm theo mảng (dùng cho gợi ý chọn nhanh). */
export function catalogGroups(catalog: SkillCatalog): SkillGroup[] {
  return groupSkills(
    catalog.skills.map((s) => s.name),
    catalog,
  );
}
