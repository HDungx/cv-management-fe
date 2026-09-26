"use client";

import dynamic from "next/dynamic";
import type { Granularity, StatsResponse } from "@/lib/stats-types";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard, EmptyBlock } from "./chart-card";
import { GRANULARITY_UNIT } from "./stats-utils";

// recharts đo kích thước qua DOM nên chỉ render ở client; tách bundle riêng.
const ReceivedChart = dynamic(() => import("./received-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-60 w-full" />,
});

export function ReceivedCard({
  data,
  granularity,
}: {
  data?: StatsResponse["received"];
  granularity: Granularity;
}) {
  const empty = data !== undefined && data.every((d) => d.count === 0);
  return (
    <ChartCard
      title="CV nhận theo kỳ"
      description={`Số ứng viên tạo mới mỗi ${GRANULARITY_UNIT[granularity]} trong khoảng đã chọn${
        granularity === "week" ? " (nhãn trục là ngày đầu tuần)" : ""
      }.`}
    >
      {!data ? (
        <Skeleton className="h-60 w-full" />
      ) : empty ? (
        <EmptyBlock message="Chưa có CV nào trong khoảng đã chọn." />
      ) : (
        <ReceivedChart data={data} granularity={granularity} />
      )}
    </ChartCard>
  );
}
