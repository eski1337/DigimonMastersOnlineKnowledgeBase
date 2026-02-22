'use client';

import React, { useState } from 'react';

export const ImportDigimonButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState('');

  const extractSlug = (input: string) => {
    // Extract slug from URL or use input as-is
    if (input.includes('dmowiki.com')) {
      const match = input.match(/dmowiki\.com\/(?:wiki\/)?([^/?#]+)/);
      return match ? match[1] : input;
    }
    return input;
  };

  const handleImport = async () => {
    const slug = extractSlug(url);
    if (!slug) {
      setError('Please enter a valid Digimon name or dmowiki.com URL');
      return;
    }

    setLoading(true);
    setError('');
    setPreviewData(null);

    try {
      const response = await fetch('/api/import-digimon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setPreviewData(data.preview);
    } catch (err: any) {
      setError(err.message || 'Failed to import Digimon');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!previewData) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/import-digimon/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Save failed');
      }

      // Success - close modal and refresh page
      setIsOpen(false);
      setUrl('');
      setPreviewData(null);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to save Digimon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn--style-secondary btn--size-medium btn--icon-style-without-border"
        style={{
          marginLeft: '0.5rem',
          background: '#333',
          color: '#fff',
          border: '1px solid #555',
          padding: '0.5rem 1rem',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        <span>Import from DMO Wiki</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => !loading && setIsOpen(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Import Digimon from DMO Wiki</h2>

            {!previewData ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Digimon Name or dmowiki.com URL:
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g., Agumon or https://dmowiki.com/Agumon"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  />
                  <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
                    Enter a Digimon name (e.g., "Agumon") or paste the full dmowiki.com URL
                  </small>
                </div>

                {error && (
                  <div
                    style={{
                      background: '#ff4444',
                      color: '#fff',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      marginBottom: '1rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    onClick={handleImport}
                    disabled={loading || !url}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#0066ff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading || !url ? 'not-allowed' : 'pointer',
                      opacity: loading || !url ? 0.5 : 1,
                    }}
                  >
                    {loading ? 'Importing...' : 'Import & Preview'}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#0066ff', marginTop: 0 }}>Preview: {previewData.name}</h3>
                  <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '14px' }}>
                      <div><strong>Form:</strong> {previewData.form}</div>
                      <div><strong>Rank:</strong> {previewData.rank}</div>
                      <div><strong>Attribute:</strong> {previewData.attribute}</div>
                      <div><strong>Element:</strong> {previewData.element}</div>
                      {previewData.attackerType && (
                        <div><strong>Attacker Type:</strong> {previewData.attackerType}</div>
                      )}
                      <div><strong>Families:</strong> {previewData.families?.join(', ')}</div>
                    </div>

                    {previewData.stats && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Stats:</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem', fontSize: '12px' }}>
                          <div>HP: {previewData.stats.hp}</div>
                          <div>AT: {previewData.stats.at}</div>
                          <div>DE: {previewData.stats.de}</div>
                          <div>AS: {previewData.stats.as}</div>
                          <div>DS: {previewData.stats.ds}</div>
                          <div>CT: {previewData.stats.ct}</div>
                          <div>HT: {previewData.stats.ht}</div>
                          <div>EV: {previewData.stats.ev}</div>
                        </div>
                      </div>
                    )}

                    {previewData.skills && previewData.skills.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Skills:</strong> {previewData.skills.length} found
                      </div>
                    )}

                    {previewData.introduction && (
                      <div style={{ marginTop: '1rem' }}>
                        <strong>Introduction:</strong>
                        <p style={{ fontSize: '13px', margin: '0.5rem 0 0 0', color: '#ccc' }}>
                          {previewData.introduction.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div
                    style={{
                      background: '#ff4444',
                      color: '#fff',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      marginBottom: '1rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div
                  style={{
                    background: '#ff9800',
                    color: '#000',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    fontSize: '14px',
                  }}
                >
                  ⚠️ <strong>Review carefully before saving.</strong> This will create a new Digimon entry.
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#00cc44',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {loading ? 'Saving...' : '✓ Save to Database'}
                  </button>
                  <button
                    onClick={() => setPreviewData(null)}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setPreviewData(null);
                      setUrl('');
                    }}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
