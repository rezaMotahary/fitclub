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

export type AttendanceResult =
  | "SUCCESS"
  | "REJECTED_WEEKLY_CAP"
  | "REJECTED_EXPIRED"
  | "REJECTED_DEBT"
  | "REJECTED_OTHER"
  | "REJECTED_OUTSIDE_SESSION"
  | "REJECTED_ALREADY_INSIDE"
  | "REJECTED_ARCHIVED"
  | "REJECTED_NOT_STARTED";

export type AttendanceRecord = {
  id: string;
  memberId: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationMinutes: number | null;
  result: AttendanceResult;
  rejectReason: string | null;
  closedAutomatically: boolean;
  voidReason: string | null;
  voidedAt: string | null;
  isVoided: boolean;
  isOpen: boolean;
  recordedById: string | null;
  voidedById: string | null;
};

export type AttendanceEligibility = {
  allowed: boolean;
  denyCode: string | null;
  denyMessage: string | null;
  weeklyCap: number;
  countedDaysThisWeek: number;
  remainingWeekDays: number;
  todayAlreadyCounted: boolean;
  subscriptionEndsOn: string | null;
  remainingSubscriptionDays: number | null;
  debtBlocks: boolean;
  insideSession: boolean;
  hasOpenAttendance: boolean;
};

export type AttendanceEligibilityResponse = {
  member: {
    id: string;
    membershipCode: string;
    fullName: string;
    phone: string | null;
    sessionGender: "MEN" | "WOMEN";
    isArchived: boolean;
    debtAmount: number;
    coachName: string | null;
    currentPlanName: string | null;
    currentPlanDaysPerWeek: number | null;
    subscriptionEndsOn: string | null;
  };
  eligibility: AttendanceEligibility;
  openAttendance: AttendanceRecord | null;
  weekly: {
    startDay: string;
    endDay: string;
    countedDays: string[];
    weeklyCap: number;
    remaining: number;
  };
};

export type AttendanceTodayResponse = {
  day: string;
  stats: {
    checkInsToday: number;
    insideNow: number;
    rejectedToday: number;
    voidedToday: number;
  };
  items: Array<
    AttendanceRecord & {
      memberName: string;
      membershipCode: string;
      recordedByName: string | null;
      voidedByName: string | null;
    }
  >;
};

export type AttendanceInsideResponse = {
  count: number;
  items: Array<{
    attendance: AttendanceRecord;
    member: {
      id: string;
      membershipCode: string;
      fullName: string;
      phone: string | null;
      sessionGender: "MEN" | "WOMEN";
    };
    elapsedSeconds: number;
  }>;
};

export type CheckInResponse = {
  ok: boolean;
  eligibility: AttendanceEligibility;
  attendance: AttendanceRecord;
  member: AttendanceEligibilityResponse["member"];
};
