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

export type MemberSubscriptionPublic = {
  id: string;
  status: string;
  phase: "current" | "upcoming" | "expired";
  plan: {
    id: string;
    name: string;
    daysPerWeek: number;
    weeklyCap: number;
  };
  startsOn: string;
  endsOn: string;
  priceToman: number;
  amountPaidToman: number;
  discountPercentApplied: number;
  debtToman: number;
  remainingDays: number;
  debtBlocksEntry: boolean;
};

export type MemberDetail = {
  id: string;
  membershipCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  sessionGender: "MEN" | "WOMEN";
  isArchived: boolean;
  coachName: string | null;
  notes: string | null;
  debtAmount: number;
  currentSubscription: MemberSubscriptionPublic | null;
  upcomingSubscription: MemberSubscriptionPublic | null;
};

export type PaymentPublic = {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  amountToman: number;
  method: string;
  status: string;
  title: string;
  paidAt: string;
  note: string | null;
  member?: {
    membershipCode: string;
    fullName: string;
    phone: string | null;
  };
};

export type RecordPaymentResponse = {
  payment: PaymentPublic;
  subscription: {
    id: string;
    priceToman: number;
    amountPaidToman: number;
    debtToman: number;
    startsOn: string;
    endsOn: string;
    planName: string;
  };
  member: MemberDetail;
  fullySettled: boolean;
  debtBlocksEntry: boolean;
};

export type RenewSubscriptionResponse = {
  subscription: {
    id: string;
    status: string;
    phase: "current" | "upcoming" | "expired";
    plan: {
      id: string;
      name: string;
      daysPerWeek: number;
      weeklyCap: number;
    };
    startsOn: string;
    endsOn: string;
    priceToman: number;
    amountPaidToman: number;
    discountPercentApplied: number;
    debtToman: number;
  };
  member: MemberDetail;
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

export type MemberNotice = {
  type: "expiry" | "expired" | "debt" | "weekly_cap" | "no_subscription";
  message: string;
};

export type MemberDashboard = {
  profile: {
    id: string;
    membershipCode: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    sessionGender: "MEN" | "WOMEN";
    coachName: string | null;
    isArchived: boolean;
  };
  subscription: {
    planName: string;
    weeklyCap: number;
    startsOn: string;
    endsOn: string;
    remainingDays: number | null;
    phase: "current";
    priceToman: number;
    amountPaidToman: number;
    debtToman: number;
  } | null;
  upcomingSubscription: {
    planName: string;
    weeklyCap: number;
    startsOn: string;
    endsOn: string;
    phase: "upcoming";
  } | null;
  weekly: {
    startDay: string;
    endDay: string;
    weeklyCap: number;
    countedDays: string[];
    usedDays: number;
    remaining: number;
    calendar: Array<{
      day: string;
      weekdayLabel: string;
      counted: boolean;
      isToday: boolean;
    }>;
  };
  notices: MemberNotice[];
  recentAttendance: Array<{
    id: string;
    checkInAt: string;
    checkOutAt: string | null;
    durationMinutes: number | null;
    closedAutomatically: boolean;
    isVoided: boolean;
    isOpen: boolean;
    recordedByName: string | null;
  }>;
  payments: Array<{
    id: string;
    title: string;
    amountToman: number;
    method: string;
    status: string;
    paidAt: string;
    note: string | null;
  }>;
};

export type AdminOverview = {
  activeMembers: number;
  attendanceToday: {
    day: string;
    checkInsToday: number;
    insideNow: number;
    rejectedToday: number;
  };
  expiringSoon: Array<{
    id: string;
    membershipCode: string;
    fullName: string;
    planName: string;
    endsOn: string;
    remainingDays: number;
  }>;
  receptionRevenueThisMonth: {
    amountToman: number;
    paymentCount: number;
    monthLabel: string;
  };
};
