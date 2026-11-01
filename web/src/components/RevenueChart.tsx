import { formatChartAmount, formatToman } from "@/lib/dashboard-format";
import { scaleChartBars } from "@/lib/admin-overview";

type Point = {
  label: string;
  amountToman: number;
};

export function RevenueChart({
  title,
  points,
  emptyText,
  dense = false,
}: {
  title: string;
  points: Point[];
  emptyText: string;
  dense?: boolean;
}) {
  const max = Math.max(...points.map((p) => p.amountToman), 0);
  const bars = scaleChartBars(points, 100);

  return (
    <section className={`admin-chart${dense ? " admin-chart-dense" : ""}`}>
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
          {bars.map((bar, index) => (
            <div className="admin-bar-col" key={`${bar.label}-${index}`}>
              <span className="admin-bar-amount">
                {formatChartAmount(bar.amountToman)}
              </span>
              <div className="admin-bar-track">
                <div
                  className="admin-bar"
                  style={{ height: `${bar.height}%` }}
                  title={`${bar.label}: ${formatToman(bar.amountToman)}`}
                />
              </div>
              <span className="admin-bar-label">{bar.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
