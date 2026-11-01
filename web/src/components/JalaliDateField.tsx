"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parseJalaliDateInput } from "@/lib/admin-overview";
import {
  JALALI_WEEKDAYS,
  jalaliMonthGrid,
  jalaliMonthName,
  parseJalaliFieldParts,
  shiftJalaliMonth,
} from "@/lib/jalali-calendar";

export function JalaliDateField({
  label,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const parsed = parseJalaliFieldParts(value);
  const [view, setView] = useState(() =>
    parsed
      ? { year: parsed.year, month: parsed.month }
      : { year: 1405, month: 8 },
  );

  useEffect(() => {
    if (!open) return;
    const fromValue = parseJalaliFieldParts(value);
    if (fromValue) {
      setView({ year: fromValue.year, month: fromValue.month });
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (!rootRef.current?.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grid = useMemo(
    () => jalaliMonthGrid(view.year, view.month),
    [view.year, view.month],
  );
  const selected = parseJalaliDateInput(value);

  return (
    <div className="jalali-field" ref={rootRef}>
      <label className="pay-field" htmlFor={id}>
        {label}
        <input
          id={id}
          dir="ltr"
          className="ltr-isolate"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
        />
      </label>
      {open ? (
        <div className="jalali-pop" role="dialog" aria-label="تقویم شمسی">
          <div className="jalali-pop-head">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setView((v) => shiftJalaliMonth(v.year, v.month, -1))}
            >
              ماه قبل
            </button>
            <strong>
              {jalaliMonthName(view.month)} {view.year.toLocaleString("fa-IR")}
            </strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setView((v) => shiftJalaliMonth(v.year, v.month, 1))}
            >
              ماه بعد
            </button>
          </div>
          <div className="jalali-weekdays">
            {JALALI_WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="jalali-grid">
            {grid.map((cell, i) =>
              cell.day == null ? (
                <span key={`e-${i}`} className="jalali-cell jalali-cell-empty" />
              ) : (
                <button
                  key={cell.value}
                  type="button"
                  className={
                    parseJalaliDateInput(cell.value) === selected
                      ? "jalali-cell jalali-cell-on"
                      : "jalali-cell"
                  }
                  onClick={() => {
                    onChange(cell.value);
                    setOpen(false);
                  }}
                >
                  {cell.day.toLocaleString("fa-IR")}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
