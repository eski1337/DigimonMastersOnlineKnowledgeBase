import React from 'react';

const ServerHealthNavLink: React.FC = () => {
  return (
    <a
      href="/admin/server-health"
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
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
          <polyline points="8 16 10 14 12 16 14 14 16 16" />
        </svg>
      </span>
      <span>Server Health</span>
    </a>
  );
};

export default ServerHealthNavLink;
