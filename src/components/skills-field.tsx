"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinSkills, parseSkills } from "@/lib/candidate-form";
import { catalogGroups, groupSkills, useSkillCatalog } from "@/lib/skills";
import { cn } from "@/lib/utils";

/**
 * Ô nhập kỹ năng (chuỗi cách nhau bằng dấu phẩy) kèm:
 * - xem trước theo nhóm (Frontend, Backend, ...), bấm x để bỏ một kỹ năng;
 * - chọn nhanh từ danh mục kỹ năng theo nhóm.
 * Component được memo: chỉ render lại khi value/props của chính nó đổi.
 */
export const SkillsField = memo(function SkillsField({
  id,
  value,
  onValueChange,
  placeholder,
  inputClassName,
  hint = "Cách nhau bằng dấu phẩy.",
}: {
  id: string;
  value: string;
  /** Nên truyền hàm ổn định (useCallback) để memo có tác dụng. */
  onValueChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
  hint?: string;
}) {
  const catalog = useSkillCatalog();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const skills = useMemo(() => parseSkills(value), [value]);
  const groups = useMemo(() => groupSkills(skills, catalog), [skills, catalog]);
  const suggestions = useMemo(() => catalogGroups(catalog), [catalog]);
  const selected = useMemo(
    () => new Set(skills.map((s) => s.toLowerCase())),
    [skills],
  );

  const currentCategory =
    suggestions.find((g) => g.id === activeCategory) ?? suggestions[0];

  function toggle(name: string) {
    const key = name.toLowerCase();
    if (selected.has(key)) {
      onValueChange(joinSkills(skills.filter((s) => s.toLowerCase() !== key)));
    } else {
      onValueChange(joinSkills([...skills, name]));
    }
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>

      {groups.length > 0 && (
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2.5">
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex flex-wrap items-center gap-1.5 text-xs"
            >
              <span className="w-28 shrink-0 font-medium text-muted-foreground">
                {g.label}
              </span>
              {g.skills.map((s) => (
                <Badge key={s} variant="outline" className="gap-0.5 pr-1">
                  {s}
                  <button
                    type="button"
                    aria-label={`Bỏ kỹ năng ${s}`}
                    className="rounded-full p-0.5 hover:bg-muted"
                    onClick={() => toggle(s)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((o) => !o)}
          >
            {pickerOpen ? <ChevronUp /> : <ChevronDown />}
            Chọn nhanh từ danh mục kỹ năng
          </Button>
          {pickerOpen && currentCategory && (
            <div className="space-y-2 rounded-lg border p-2.5">
              <div className="flex flex-wrap gap-1">
                {suggestions.map((g) => (
                  <Button
                    key={g.id}
                    type="button"
                    size="xs"
                    variant={
                      g.id === currentCategory.id ? "secondary" : "ghost"
                    }
                    aria-pressed={g.id === currentCategory.id}
                    onClick={() => setActiveCategory(g.id)}
                  >
                    {g.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentCategory.skills.map((name) => {
                  const on = selected.has(name.toLowerCase());
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(name)}
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
