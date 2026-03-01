import React from 'react';

const BackupsNavLink: React.FC = () => {
  return (
    <a
      href="/admin/backups"
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </span>
      <span>Backups</span>
    </a>
  );
};

export default BackupsNavLink;
