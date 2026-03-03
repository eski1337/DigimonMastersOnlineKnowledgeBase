import type { Metadata } from 'next';
import { MonsterCardPage } from './client';

export const metadata: Metadata = {
  title: 'Monster Card System - DMO KB',
  description: 'Complete guide to the Monster Card system in Digimon Masters Online. All card levels, summoned Digimon, drops, experience values, and tiers explained.',
};

export default function Page() {
  return <MonsterCardPage />;
}
