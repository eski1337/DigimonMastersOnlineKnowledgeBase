'use client';

import { useSession } from 'next-auth/react';
import { DigivolutionEditor } from './digivolution-editor';

interface DigivolutionEditorWrapperProps {
  digimonId: string;
  digimonName: string;
  currentDigivolutions?: {
    digivolvesFrom?: Array<{ id: string; name: string }>;
    digivolvesTo?: Array<{ id: string; name: string }>;
    jogress?: Array<{ id: string; name: string }>;
  };
}

export function DigivolutionEditorWrapper({ 
  digimonId, 
  digimonName, 
  currentDigivolutions 
}: DigivolutionEditorWrapperProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  return (
    <DigivolutionEditor 
      digimonId={digimonId}
      digimonName={digimonName}
      currentDigivolutions={currentDigivolutions}
      userRole={userRole}
    />
  );
}
