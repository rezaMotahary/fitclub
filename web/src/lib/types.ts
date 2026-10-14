export type Role = "MEMBER" | "SECRETARY" | "ADMIN";

export type PublicAuthUser = {
  id: string;
  role: Role;
  fullName: string;
  phone: string | null;
  email: string | null;
  memberId: string | null;
  membershipCode: string | null;
};

export type AuthMeResponse = {
  user: PublicAuthUser;
};

export type StaffLoginResponse = {
  user: PublicAuthUser;
};

export type MemberOtpRequestResponse = {
  ok: boolean;
  expiresAt?: string;
  message?: string;
};

export type MemberOtpVerifyResponse = {
  user: PublicAuthUser;
};

export type PlanPublic = {
  id: string;
  name: string;
  daysPerWeek: number;
  weeklyCap: number;
  priceToman: number;
  durationDays: number;
  isActive: boolean;
  sortOrder: number;
  priceLabel: string;
};

export type MemberSummary = {
  id: string;
  membershipCode: string;
  fullName: string;
  phone: string | null;
  sessionGender: "MEN" | "WOMEN";
  isArchived: boolean;
  coachName: string | null;
  debtAmount: number;
  currentPlanName: string | null;
  currentPhase: "current" | "upcoming" | "expired" | null;
  subscriptionEndsOn: string | null;
};
