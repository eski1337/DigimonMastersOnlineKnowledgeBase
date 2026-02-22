'use client';

import React, { useState } from 'react';

export default function BatchImportPage() {
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const letterRanges = [
    { label: 'A-C', letters: ['A', 'B', 'C'] },
    { label: 'D-F', letters: ['D', 'E', 'F'] },
    { label: 'G-I', letters: ['G', 'H', 'I'] },
    { label: 'J-L', letters: ['J', 'K', 'L'] },
    { label: 'M-O', letters: ['M', 'N', 'O'] },
    { label: 'P-R', letters: ['P', 'Q', 'R'] },
    { label: 'S-U', letters: ['S', 'T', 'U'] },
    { label: 'V-Z', letters: ['V', 'W', 'X', 'Y', 'Z'] },
  ];

  const handleBatchImport = async (range: string, letters: string[]) => {
    setImporting(range);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/batch-import-digimon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letters }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Batch import failed');
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to import batch');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#fff' }}>
        Batch Import Digimon from DMO Wiki
      </h1>

      <div style={{ 
        background: '#1a1a1a', 
        padding: '1.5rem', 
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #333'
      }}>
        <h2 style={{ marginTop: 0, color: '#0066ff' }}>How This Works</h2>
        <ul style={{ color: '#ccc', lineHeight: '1.8' }}>
          <li><strong>Server-side import:</strong> Runs on CMS server (bypasses Cloudflare)</li>
          <li><strong>Letter batches:</strong> Import Digimon by first letter groups</li>
          <li><strong>One at a time:</strong> Click a batch, wait for completion, then next</li>
          <li><strong>Progress shown:</strong> See results after each batch completes</li>
        </ul>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {letterRanges.map(range => (
          <button
            key={range.label}
            onClick={() => handleBatchImport(range.label, range.letters)}
            disabled={importing !== null}
            style={{
              padding: '1.5rem',
              background: importing === range.label ? '#ff6600' : '#0066ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              opacity: importing && importing !== range.label ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            {importing === range.label ? '⏳ Importing...' : `Import ${range.label}`}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          background: '#ff4444',
          color: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          ❌ {error}
        </div>
      )}

      {results && (
        <div style={{
          background: '#1a1a1a',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h2 style={{ marginTop: 0, color: '#00cc44' }}>✅ Batch Complete!</h2>
          <div style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Total found:</strong> {results.totalFound}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>✅ Successfully imported:</strong> <span style={{ color: '#00cc44' }}>{results.imported}</span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>⏭️ Already existed:</strong> {results.skipped}
            </div>
            <div>
              <strong>❌ Failed:</strong> <span style={{ color: '#ff4444' }}>{results.failed}</span>
            </div>
          </div>

          {results.failedList && results.failedList.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#2a2a2a', borderRadius: '4px' }}>
              <strong style={{ color: '#ff4444' }}>Failed Digimon:</strong>
              <ul style={{ marginTop: '0.5rem', color: '#ccc' }}>
                {results.failedList.map((name: string, idx: number) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          {results.importedList && results.importedList.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#2a2a2a', borderRadius: '4px' }}>
              <strong style={{ color: '#00cc44' }}>Successfully Imported:</strong>
              <ul style={{ marginTop: '0.5rem', color: '#ccc', maxHeight: '300px', overflow: 'auto' }}>
                {results.importedList.map((name: string, idx: number) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem', color: '#888', fontSize: '0.9rem' }}>
        💡 <strong>Tip:</strong> Start with A-C, wait for completion, then do D-F, etc. 
        This way you can import all ~600 Digimon in 8 batches over ~30-60 minutes.
      </div>
    </div>
  );
}
