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
