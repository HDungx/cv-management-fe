"use client";

import dynamic from "next/dynamic";
import type { Granularity, StatsResponse } from "@/lib/stats-types";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard, EmptyBlock } from "./chart-card";

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
      description={
        granularity === "week"
          ? "Số CV nhận mỗi tuần (nhãn trục là ngày đầu tuần)."
          : "Số CV nhận mỗi tháng."
      }
    >
      {!data ? (
        <Skeleton className="h-60 w-full" />
      ) : empty ? (
        <EmptyBlock message="Chưa có CV nào trong khoảng thời gian này." />
      ) : (
        <ReceivedChart data={data} granularity={granularity} />
      )}
    </ChartCard>
  );
}
