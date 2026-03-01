import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useField, useForm } from 'payload/components/forms';

/**
 * Custom field component for portal "destination".
 * Provides autocomplete search against the Maps collection.
 * When a map is selected it fills both destination (name) and destinationSlug (slug).
 */

interface MapHit {
  id: string;
  name: string;
  slug: string;
}

const MapSearchField: React.FC<{ path: string; field: any }> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path });
  const { dispatchFields } = useForm();

  // Derive the sibling slug path: replace last segment "destination" → "destinationSlug"
  const slugPath = path.replace(/\.destination$/, '.destinationSlug');

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<MapHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local query with stored value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/maps?where[name][contains]=${encodeURIComponent(term)}&limit=10&depth=0&sort=name`,
        { credentials: 'include' },
      );
      const data = await res.json();
      setResults((data.docs || []).map((d: any) => ({ id: d.id, name: d.name, slug: d.slug })));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setValue(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const handleSelect = (hit: MapHit) => {
    setQuery(hit.name);
    setValue(hit.name);
    // Set the sibling slug field via form dispatch
    dispatchFields({ type: 'UPDATE', path: slugPath, value: hit.slug, valid: true });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>
        {field?.label || 'Destination'}{field?.required && <span className="required">*</span>}
      </label>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder="Type to search maps..."
        className="field-type text"
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'var(--theme-input-bg)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 4,
          color: 'var(--theme-text)',
          fontSize: 14,
        }}
      />
      {field?.admin?.description && (
        <div className="field-description" style={{ fontSize: 12, color: 'var(--theme-elevation-400)', marginTop: 4 }}>
          {field.admin.description}
        </div>
      )}
      {open && (results.length > 0 || loading) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 6,
            marginTop: 4,
            maxHeight: 240,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {loading && (
            <div style={{ padding: '8px 12px', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              Searching...
            </div>
          )}
          {results.map((hit) => (
            <div
              key={hit.id}
              onClick={() => handleSelect(hit)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--theme-elevation-100)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-elevation-100)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--theme-text)' }}>{hit.name}</span>
              <span style={{ fontSize: 11, color: 'var(--theme-elevation-400)', fontFamily: 'monospace' }}>{hit.slug}</span>
            </div>
          ))}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div style={{ padding: '8px 12px', color: 'var(--theme-elevation-400)', fontSize: 13 }}>
              No maps found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapSearchField;
