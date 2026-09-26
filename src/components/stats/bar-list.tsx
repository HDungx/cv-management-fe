export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Nhãn giá trị ở đầu thanh; mặc định là value. */
  valueLabel?: string;
  /** Chú thích nhỏ dưới nhãn. */
  sublabel?: string;
  color?: string;
  /** Tooltip gốc (title) — bổ sung, không thay thế nhãn hiển thị. */
  title?: string;
}

/**
 * Thanh ngang HTML: thanh mảnh (10px), đầu thanh bo 4px, gốc vuông,
 * giá trị luôn hiện ở đầu thanh nên không phụ thuộc tooltip.
 */
export function BarList({
  items,
  ariaLabel,
  color = "var(--viz-s1)",
}: {
  items: BarItem[];
  ariaLabel: string;
  color?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <ul aria-label={ariaLabel} className="space-y-0.5">
      {items.map((item) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <li
            key={item.key}
            title={
              item.title ?? `${item.label}: ${item.valueLabel ?? item.value}`
            }
            className="group grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-x-3 rounded-md px-1 py-1 hover:bg-muted/60 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="truncate text-sm">{item.label}</div>
              {item.sublabel && (
                <div className="truncate text-xs text-muted-foreground">
                  {item.sublabel}
                </div>
              )}
            </div>
            <div className="h-2.5">
              {item.value > 0 && (
                <div
                  className="h-full rounded-r-[4px] transition-[filter] group-hover:brightness-110"
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    backgroundColor: item.color ?? color,
                  }}
                />
              )}
            </div>
            <div className="min-w-8 text-right text-sm font-medium tabular-nums">
              {item.valueLabel ?? item.value}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
