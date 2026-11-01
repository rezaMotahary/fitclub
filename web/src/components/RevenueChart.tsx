import { formatToman } from "@/lib/dashboard-format";
import { scaleChartBars } from "@/lib/admin-overview";

type Point = {
  label: string;
  amountToman: number;
};

export function RevenueChart({
  title,
  points,
  emptyText,
}: {
  title: string;
  points: Point[];
  emptyText: string;
}) {
  const max = Math.max(...points.map((p) => p.amountToman), 0);
  const bars = scaleChartBars(points, 100);
  const n = points.length;
  const labelEvery = n <= 10 ? 1 : Math.ceil(n / 8);

  return (
    <section className="admin-chart">
      <h3>{title}</h3>
      {max <= 0 ? (
        <p className="auth-muted">{emptyText}</p>
      ) : (
        <div
          className="admin-chart-plot"
          dir="ltr"
          role="img"
          aria-label={title}
        >
          {bars.map((bar, index) => {
            const showLabel =
              index === 0 ||
              index === n - 1 ||
              index % labelEvery === 0;
            return (
              <div className="admin-bar-col" key={`${bar.label}-${index}`}>
                <div className="admin-bar-track">
                  <div
                    className="admin-bar"
                    style={{ height: `${bar.height}%` }}
                    title={`${bar.label}: ${formatToman(bar.amountToman)}`}
                  />
                </div>
                {showLabel ? (
                  <span className="admin-bar-label">{bar.label}</span>
                ) : (
                  <span className="admin-bar-label admin-bar-label-spacer">
                    {"\u00a0"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
