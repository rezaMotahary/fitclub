import { describe, expect, it } from "vitest";
import { defaultRenewPlanId } from "./renew-plan-default";

describe("defaultRenewPlanId (KI-007)", () => {
  it("prefers current subscription plan when available", () => {
    expect(defaultRenewPlanId("plan-daily", ["plan-2", "plan-daily", "plan-3"])).toBe(
      "plan-daily",
    );
  });

  it("falls back to first plan when current missing", () => {
    expect(defaultRenewPlanId(undefined, ["plan-2", "plan-daily"])).toBe("plan-2");
    expect(defaultRenewPlanId("gone", ["plan-2", "plan-daily"])).toBe("plan-2");
  });

  it("returns empty when no plans", () => {
    expect(defaultRenewPlanId("x", [])).toBe("");
  });
});
