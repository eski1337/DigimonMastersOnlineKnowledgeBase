'use client';

import dynamic from 'next/dynamic';
import { EvolutionGraphErrorBoundary } from './EvolutionGraphErrorBoundary';
import styles from './evolution-graph.module.css';

/* ── Dynamic import — React Flow is heavy, code-split it ──────────── */

const EvolutionGraph = dynamic(
  () => import('./EvolutionGraph').then((m) => ({ default: m.EvolutionGraph })),
  {
    ssr: false,
    loading: () => (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Evolution Graph</h2>
        </div>
        <div className={styles.skeleton}>
          <div className={styles.spinner} />
        </div>
      </div>
    ),
  },
);

/* ── Public wrapper: error boundary + dynamic import ──────────────── */

interface Props {
  slug: string;
  userRole?: string;
}

export function EvolutionGraphLoader({ slug, userRole }: Props) {
  return (
    <EvolutionGraphErrorBoundary slug={slug}>
      <EvolutionGraph slug={slug} userRole={userRole} />
    </EvolutionGraphErrorBoundary>
  );
}
