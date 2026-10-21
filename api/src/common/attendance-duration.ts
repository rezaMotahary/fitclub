/**
 * Visit duration for display/API mapping.
 * When both timestamps exist, always derive from them (ignore stale/wrong stored minutes).
 */

export function durationMinutesFromTimestamps(
  checkInAt: Date | string | null | undefined,
  checkOutAt: Date | string | null | undefined,
): number | null {
  if (checkInAt == null || checkOutAt == null) return null;
  const inMs = new Date(checkInAt).getTime();
  const outMs = new Date(checkOutAt).getTime();
  if (Number.isNaN(inMs) || Number.isNaN(outMs)) return null;
  return Math.max(0, Math.floor((outMs - inMs) / 60_000));
}

/**
 * Prefer timestamp-derived minutes; fall back to stored only when still open / no checkout.
 */
export function resolveDurationMinutes(params: {
  checkInAt: Date | string | null | undefined;
  checkOutAt: Date | string | null | undefined;
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
