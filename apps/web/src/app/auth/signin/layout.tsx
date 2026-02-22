import { Suspense } from 'react';

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">Loading...</div>}>{children}</Suspense>;
}
