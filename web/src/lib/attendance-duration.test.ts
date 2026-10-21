import { describe, expect, it } from "vitest";
import {
  durationMinutesFromTimestamps,
  resolveDurationMinutes,
} from "./attendance-duration";
import { formatDurationMinutes } from "./dashboard-format";

describe("attendance-duration (KI-003)", () => {
  it("computes 08:15 → 10:01 as 106 minutes", () => {
    expect(
      durationMinutesFromTimestamps(
        "2026-10-21T08:15:00+03:30",
        "2026-10-21T10:01:00+03:30",
      ),
    ).toBe(106);
  });

  it("ignores stored 1 when timestamps say ~106", () => {
    const minutes = resolveDurationMinutes({
      checkInAt: "2026-10-21T08:15:00+03:30",
      checkOutAt: "2026-10-21T10:01:00+03:30",
      storedMinutes: 1,
    });
    expect(minutes).toBe(106);
    expect(formatDurationMinutes(minutes)).toBe("۱ ساعت و ۴۶ دقیقه");
  });

  it("returns null for open visits without stored fallback preference", () => {
    expect(
      durationMinutesFromTimestamps("2026-10-21T08:15:00+03:30", null),
    ).toBeNull();
  });
});
