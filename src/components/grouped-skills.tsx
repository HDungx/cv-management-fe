"use client";

import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { groupSkills, useSkillCatalog } from "@/lib/skills";

/** Kỹ năng hiển thị theo nhóm: tiêu đề nhóm + badge. */
export const GroupedSkills = memo(function GroupedSkills({
  skills,
  empty = "—",
}: {
  skills: string[];
  empty?: string;
}) {
  const catalog = useSkillCatalog();
  const groups = useMemo(() => groupSkills(skills, catalog), [skills, catalog]);

  if (groups.length === 0) {
    return <span className="text-muted-foreground">{empty}</span>;
  }
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.skills.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
