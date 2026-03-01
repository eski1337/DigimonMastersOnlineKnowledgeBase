'use client';

import { Component, type ReactNode } from 'react';
import styles from './evolution-graph.module.css';

interface Props {
  children: ReactNode;
  slug: string;
}

interface State {
  hasError: boolean;
}

export class EvolutionGraphErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('EvolutionGraph crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <h2 className={styles.title}>Evolution Graph</h2>
          </div>
          <div className={styles.fallback}>
            <p className={styles.fallbackText}>Evolution graph failed to load.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-sm text-orange-400 underline hover:text-orange-300 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
