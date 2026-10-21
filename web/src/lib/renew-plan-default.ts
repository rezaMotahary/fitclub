/** Default renew plan: current subscription plan if listed, else first plan. */
export function defaultRenewPlanId(
  currentPlanId: string | undefined | null,
  planIds: string[],
): string {
  if (currentPlanId && planIds.includes(currentPlanId)) return currentPlanId;
  return planIds[0] ?? "";
}
