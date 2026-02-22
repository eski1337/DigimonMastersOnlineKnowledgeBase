'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface DigivolutionTreeButtonProps {
  slug: string;
}

export function DigivolutionTreeButton({ slug }: DigivolutionTreeButtonProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const canEdit = userRole && ['owner', 'admin', 'editor'].includes(userRole);

  if (!canEdit) return null;

  return (
    <Link 
      href={`/digimon/${slug}/digivolutions`}
      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      View Digivolution Tree
    </Link>
  );
}
