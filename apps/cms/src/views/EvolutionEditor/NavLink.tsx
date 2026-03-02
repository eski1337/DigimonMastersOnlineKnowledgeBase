import React from 'react';
import { t } from '../../lib/i18n/navLabels';

const EvolutionEditorNavLink: React.FC = () => {
  return (
    <a
      href="/admin/evolution-editor"
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
          <circle cx="5" cy="6" r="3" />
          <circle cx="19" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <line x1="7.5" y1="7.5" x2="10.5" y2="16" />
          <line x1="16.5" y1="7.5" x2="13.5" y2="16" />
        </svg>
      </span>
      <span>{t('evolutionEditor')}</span>
    </a>
  );
};

export default EvolutionEditorNavLink;
