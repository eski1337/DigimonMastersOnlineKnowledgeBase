import React from 'react';

const KanbanNavLink: React.FC = () => {
  return (
    <a
      href="/admin/kanban"
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
          <rect x="3" y="3" width="7" height="18" rx="1" />
          <rect x="14" y="3" width="7" height="12" rx="1" />
        </svg>
      </span>
      <span>Tasks Board</span>
    </a>
  );
};

export default KanbanNavLink;
