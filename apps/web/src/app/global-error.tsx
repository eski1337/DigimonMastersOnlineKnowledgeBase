'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            ⚠️ Application Error
          </h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              overflow: 'auto',
              maxWidth: '600px',
              marginBottom: '2rem'
            }}>
              {error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#fff',
                color: '#000',
                border: '1px solid #ccc',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
