import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DMO Knowledge Base — Digimon Masters Online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #f97316, #fb923c, #f97316)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f97316, #fb923c)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-2px',
            }}
          >
            DMO Knowledge Base
          </div>
          <div style={{ fontSize: 32, color: '#d1d5db', fontWeight: 400 }}>
            Digimon Masters Online Wiki & Database
          </div>
          <div style={{ fontSize: 18, color: '#6b7280', marginTop: 8 }}>
            GDMO · KDMO · NADMO · TWDMO · HKDMO · THDMO
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 20,
            color: '#4b5563',
            fontWeight: 500,
          }}
        >
          dmokb.info
        </div>
      </div>
    ),
    { ...size }
  );
}
