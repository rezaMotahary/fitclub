import type { Role } from '@prisma/client';

export type AuthUser = {
  id: string;
  role: Role;
  fullName: string;
  phone: string | null;
  email: string | null;
  memberId: string | null;
  membershipCode: string | null;
  isArchived: boolean;
};

export type PublicAuthUser = {
  id: string;
  role: Role;
  fullName: string;
  phone: string | null;
  email: string | null;
  memberId: string | null;
  membershipCode: string | null;
};
