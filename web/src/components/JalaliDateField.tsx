"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseJalaliDateInput } from "@/lib/admin-overview";
import {
  JALALI_WEEKDAYS,
  jalaliMonthGrid,
  jalaliMonthName,
  parseJalaliFieldParts,
  shiftJalaliMonth,
} from "@/lib/jalali-calendar";

const POP_WIDTH = 300;
const POP_HEIGHT = 360;

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
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
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

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let left = rect.right - POP_WIDTH;
      left = Math.max(8, Math.min(left, window.innerWidth - POP_WIDTH - 8));
      let top = rect.bottom + 8;
      if (top + POP_HEIGHT > window.innerHeight - 8 && rect.top > POP_HEIGHT + 8) {
        top = rect.top - POP_HEIGHT - 8;
      }
      setBox({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      const target = ev.target as Node;
      if (inputRef.current?.contains(target) || popRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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

  const popup =
    open && box && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popRef}
            className="jalali-pop"
            role="dialog"
            aria-label="تقویم شمسی"
            style={{ top: box.top, left: box.left }}
            onMouseDown={(ev) => ev.preventDefault()}
          >
            <div className="jalali-pop-head">
              <button
                type="button"
                className="jalali-nav"
                onClick={() =>
                  setView((v) => shiftJalaliMonth(v.year, v.month, -1))
                }
              >
                ماه قبل
              </button>
              <strong className="jalali-month">
                {jalaliMonthName(view.month)}{" "}
                <bdi dir="ltr">
                  {view.year.toLocaleString("fa-IR", { useGrouping: false })}
                </bdi>
              </strong>
              <button
                type="button"
                className="jalali-nav"
                onClick={() =>
                  setView((v) => shiftJalaliMonth(v.year, v.month, 1))
                }
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
                  <span
                    key={`e-${i}`}
                    className="jalali-cell jalali-cell-empty"
                    aria-hidden="true"
                  />
                ) : (
                  <button
                    key={cell.value}
                    type="button"
                    className={
                      parseJalaliDateInput(cell.value) === selected
                        ? "jalali-cell jalali-cell-on"
                        : "jalali-cell"
                    }
                    aria-pressed={parseJalaliDateInput(cell.value) === selected}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="jalali-field">
      <label className="pay-field" htmlFor={id}>
        {label}
        <input
          ref={inputRef}
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
      {popup}
    </div>
  );
}
