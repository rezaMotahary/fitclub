"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  chartValueAxis,
  dailyChartLabelFlags,
  formatAxisTick,
  formatChartMillions,
  formatChartTip,
} from "@/lib/dashboard-format";

type Point = {
  label: string;
  amountToman: number;
};

type Tip = {
  text: string;
  x: number;
  y: number;
  above: boolean;
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
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    if (!tip) return;
    function hide() {
      setTip(null);
    }
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tip]);
  const max = Math.max(...points.map((p) => p.amountToman), 0);
  const axis = chartValueAxis(max);
  const labelFlags = dense ? dailyChartLabelFlags(points.map((p) => p.label)) : null;
  const showValues = !dense && points.length > 0 && points.length <= 8;

  function showTip(text: string, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const above = rect.top > 72;
    setTip({
      text,
      x: rect.left + rect.width / 2,
      y: above ? rect.top - 8 : rect.bottom + 8,
      above,
    });
  }

  return (
    <section className={`admin-chart${dense ? " admin-chart-dense" : ""}`}>
      <div className="admin-chart-head">
        <h3>{title}</h3>
        {max > 0 ? <p className="admin-chart-unit">میلیون تومان</p> : null}
      </div>
      {max <= 0 ? (
        <p className="auth-muted">{emptyText}</p>
      ) : (
        <div className={`admin-chart-frame${showValues ? " has-values" : ""}`}>
          <div className="admin-chart-axis-wrap">
            <div className="admin-chart-axis" aria-hidden="true">
              {[...axis.ticks].reverse().map((tick) => (
                <span key={tick}>
                  <bdi dir="ltr">{formatAxisTick(tick)}</bdi>
                </span>
              ))}
            </div>
            <div className="admin-chart-axis-foot" aria-hidden="true" />
          </div>
          <div className="admin-chart-scroll">
            <div className="admin-chart-plot-wrap">
              <div className="admin-chart-plot">
                <div className="admin-chart-lines" aria-hidden="true">
                  {axis.ticks.map((tick) => (
                    <span
                      key={tick}
                      className={
                        tick === 0 ? "admin-gridline is-base" : "admin-gridline"
                      }
                      style={{ bottom: `${(tick / axis.maxToman) * 100}%` }}
                    />
                  ))}
                </div>
                {points.map((point, index) => {
                  const pct = Math.max(
                    0,
                    Math.min(100, (point.amountToman / axis.maxToman) * 100),
                  );
                  const text = formatChartTip(point.label, point.amountToman);
                  const showLabel = labelFlags ? labelFlags[index] : true;
                  return (
                    <button
                      key={`${point.label}-${index}`}
                      type="button"
                      className="admin-bar-col"
                      aria-label={text}
                      onMouseEnter={(e) => showTip(text, e.currentTarget)}
                      onMouseLeave={() => setTip(null)}
                      onFocus={(e) => showTip(text, e.currentTarget)}
                      onBlur={() => setTip(null)}
                    >
                      <span className="admin-bar-track">
                        {showValues && point.amountToman > 0 ? (
                          <span
                            className="admin-bar-amount"
                            style={{ bottom: `calc(${pct}% + 4px)` }}
                          >
                            <bdi dir="ltr">
                              {formatChartMillions(point.amountToman)}
                            </bdi>
                          </span>
                        ) : null}
                        <span
                          className={pct > 0 ? "admin-bar" : "admin-bar is-empty"}
                          style={{ height: `${pct}%` }}
                        />
                      </span>
                      <span className="admin-bar-label">
                        {showLabel ? point.label : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {tip && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`admin-chart-tip${tip.above ? "" : " is-below"}`}
              style={{ left: tip.x, top: tip.y }}
              role="tooltip"
            >
              {tip.text}
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
