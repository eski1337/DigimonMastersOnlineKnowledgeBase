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
    <div style={{ 
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '2rem' }}>
            🚀 Batch Import Digimon
          </h1>
          <a 
            href="/admin" 
            style={{ 
              color: '#0066ff', 
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              border: '1px solid #0066ff',
              borderRadius: '4px'
            }}
          >
            ← Back to Admin
          </a>
        </div>

        <div style={{ 
          background: '#1a1a1a', 
          padding: '1.5rem', 
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #333'
        }}>
          <h2 style={{ marginTop: 0, color: '#0066ff', fontSize: '1.3rem' }}>How This Works</h2>
          <ul style={{ color: '#ccc', lineHeight: '1.8', margin: 0 }}>
            <li><strong>✅ Server-side import:</strong> Runs on CMS server (bypasses Cloudflare)</li>
            <li><strong>📝 Letter batches:</strong> Import Digimon by first letter groups</li>
            <li><strong>⏱️ One at a time:</strong> Click a batch, wait for completion (~5-10 min), then next</li>
            <li><strong>📊 Progress shown:</strong> See detailed results after each batch completes</li>
            <li><strong>⏸️ Can pause:</strong> Do some batches now, rest later - progress is saved!</li>
          </ul>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {letterRanges.map(range => (
            <button
              key={range.label}
              onClick={() => handleBatchImport(range.label, range.letters)}
              disabled={importing !== null}
              style={{
                padding: '2rem 1.5rem',
                background: importing === range.label 
                  ? 'linear-gradient(135deg, #ff6600 0%, #ff9933 100%)' 
                  : importing 
                    ? '#2a2a2a'
                    : 'linear-gradient(135deg, #0066ff 0%, #0099ff 100%)',
                color: '#fff',
                border: importing && importing !== range.label ? '1px solid #444' : 'none',
                borderRadius: '12px',
                cursor: importing ? 'not-allowed' : 'pointer',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                opacity: importing && importing !== range.label ? 0.4 : 1,
                transition: 'all 0.3s ease',
                boxShadow: importing === range.label 
                  ? '0 8px 20px rgba(255, 102, 0, 0.4)' 
                  : !importing 
                    ? '0 4px 12px rgba(0, 102, 255, 0.3)' 
                    : 'none',
                transform: importing === range.label ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {importing === range.label ? (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                  Importing...
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    {range.label}
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Click to Import</div>
                </>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
            color: '#fff',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '1px solid #ff6666',
            boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❌ Error</div>
            <div>{error}</div>
          </div>
        )}

        {results && (
          <div style={{
            background: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #00cc44',
            boxShadow: '0 4px 16px rgba(0, 204, 68, 0.2)'
          }}>
            <h2 style={{ marginTop: 0, color: '#00cc44', fontSize: '1.8rem', marginBottom: '1.5rem' }}>
              ✅ Batch Complete!
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ background: '#2a2a2a', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Total Found</div>
                <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold' }}>{results.totalFound}</div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Imported</div>
                <div style={{ color: '#00cc44', fontSize: '2rem', fontWeight: 'bold' }}>{results.imported}</div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏭️</div>
                <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Already Existed</div>
                <div style={{ color: '#0099ff', fontSize: '2rem', fontWeight: 'bold' }}>{results.skipped}</div>
              </div>
              
              <div style={{ background: '#2a2a2a', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❌</div>
                <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Failed</div>
                <div style={{ color: '#ff4444', fontSize: '2rem', fontWeight: 'bold' }}>{results.failed}</div>
              </div>
            </div>

            {results.importedList && results.importedList.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#2a2a2a', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <strong style={{ color: '#00cc44', fontSize: '1.2rem' }}>Successfully Imported ({results.importedList.length})</strong>
                </div>
                <ul style={{ 
                  marginTop: '1rem', 
                  color: '#ccc', 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.5rem',
                  listStyle: 'none',
                  padding: 0
                }}>
                  {results.importedList.map((name: string, idx: number) => (
                    <li key={idx} style={{ 
                      background: '#1a1a1a',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}>
                      • {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.failedList && results.failedList.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#2a2a2a', borderRadius: '8px', border: '1px solid #ff4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>❌</span>
                  <strong style={{ color: '#ff4444', fontSize: '1.2rem' }}>Failed Digimon ({results.failedList.length})</strong>
                </div>
                <ul style={{ marginTop: '1rem', color: '#ccc' }}>
                  {results.failedList.map((name: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.3rem' }}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem',
          background: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #333',
          color: '#999', 
          fontSize: '0.9rem',
          lineHeight: '1.6'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#0066ff' }}>💡 Tips:</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>Start with <strong>A-C</strong>, wait for completion, then continue with next batches</li>
            <li>Each batch takes ~5-10 minutes depending on number of Digimon</li>
            <li>Total time for all 8 batches: ~40-80 minutes</li>
            <li>You can close this page and come back - progress is saved in database</li>
            <li>If a batch fails, you can retry it anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
