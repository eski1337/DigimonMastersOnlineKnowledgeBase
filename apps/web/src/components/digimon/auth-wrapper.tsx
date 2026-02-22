'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthWrapperProps {
  children: (role: string | undefined) => ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  
  return <>{children(userRole)}</>;
}
