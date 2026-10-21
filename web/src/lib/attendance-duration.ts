/**
 * Visit duration for UI — when both timestamps exist, derive minutes from them
 * so a stale/wrong stored durationMinutes cannot mislead (KI-003).
 */

export function durationMinutesFromTimestamps(
  checkInAt: string | Date | null | undefined,
  checkOutAt: string | Date | null | undefined,
): number | null {
  if (checkInAt == null || checkOutAt == null || checkInAt === "" || checkOutAt === "") {
    return null;
  }
  const inMs = new Date(checkInAt).getTime();
  const outMs = new Date(checkOutAt).getTime();
  if (Number.isNaN(inMs) || Number.isNaN(outMs)) return null;
  return Math.max(0, Math.floor((outMs - inMs) / 60_000));
}

export function resolveDurationMinutes(params: {
  checkInAt: string | Date | null | undefined;
  checkOutAt: string | Date | null | undefined;
  storedMinutes?: number | null;
}): number | null {
  const fromTs = durationMinutesFromTimestamps(
    params.checkInAt,
    params.checkOutAt,
  );
  if (fromTs != null) return fromTs;
  if (params.storedMinutes == null || Number.isNaN(params.storedMinutes)) {
    return null;
  }
  return Math.max(0, Math.floor(params.storedMinutes));
}
