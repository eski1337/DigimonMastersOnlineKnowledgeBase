import React from 'react';

const ImportButton: React.FC = () => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <a
        href="/import-digimon"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '0.625rem 1rem',
          backgroundColor: '#0066ff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '3px',
          fontWeight: 500,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
        }}
        onMouseOver={(e) => {
          (e.target as HTMLAnchorElement).style.backgroundColor = '#0052cc';
        }}
        onMouseOut={(e) => {
          (e.target as HTMLAnchorElement).style.backgroundColor = '#0066ff';
        }}
      >
        📥 Import from DMO Wiki
      </a>
    </div>
  );
};

export default ImportButton;
