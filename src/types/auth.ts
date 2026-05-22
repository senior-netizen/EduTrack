import { UserRole } from '@prisma/client';

export type JwtUser = {
  userId: string;
  schoolId: string | null;
  role: UserRole;
  email: string;
};
