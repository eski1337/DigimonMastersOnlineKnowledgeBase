import React from 'react';

const RegionEditorNavLink: React.FC = () => {
  return (
    <a
      href="/admin/region-editor"
      className="nav__link"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 20px',
        color: 'var(--ds-text-secondary)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'color 0.1s, background 0.1s',
      }}
    >
      <span className="nav__link-icon" style={{ width: 20, height: 20 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 19.5 7 19.5 17 12 22 4.5 17 4.5 7" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="4.5" y1="7" x2="19.5" y2="17" />
          <line x1="19.5" y1="7" x2="4.5" y2="17" />
        </svg>
      </span>
      <span>Region Editor</span>
    </a>
  );
};

export default RegionEditorNavLink;
