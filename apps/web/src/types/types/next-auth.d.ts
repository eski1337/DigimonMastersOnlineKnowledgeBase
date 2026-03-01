import 'next-auth';
import { UserRole } from '@dmo-kb/shared';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
      roles: UserRole[];
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: UserRole;
    roles?: UserRole[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    role?: UserRole;
    roles?: UserRole[];
  }
}
