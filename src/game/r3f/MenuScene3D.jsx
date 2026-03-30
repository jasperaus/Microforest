import React, { useEffect, useRef } from 'react';

const S = {
  root: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(160deg, #0a0a14 0%, #141428 100%)',
    fontFamily: 'monospace', color: '#d0e8f0',
    userSelect: 'none',
  },
  title: {
    fontSize: 52, fontWeight: 'bold', letterSpacing: 6,
    color: '#00eedd', textShadow: '0 0 24px #00eedd, 0 0 48px #00aabb',
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#7799aa', letterSpacing: 4, marginBottom: 56 },
  btn: {
    display: 'block', width: 240, padding: '14px 0', marginBottom: 16,
    background: 'transparent', border: '2px solid #00eedd',
    color: '#00eedd', fontSize: 16, fontFamily: 'monospace', letterSpacing: 3,
    cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'center',
  },
  btnHover: { background: '#00eedd22', boxShadow: '0 0 16px #00eedd66' },
  version: { position: 'absolute', bottom: 18, right: 24, fontSize: 11, color: '#334455' },
  scanline: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
  },
};

function Btn({ label, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      style={{ ...S.btn, ...(hover ? S.btnHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function MenuScene3D({ onStart }) {
  return (
    <div style={S.root}>
      <div style={S.scanline} />
      <div style={S.title}>IRON CADETS</div>
      <div style={S.subtitle}>MECH TACTICS</div>
      <Btn label="▶  NEW CAMPAIGN"  onClick={() => onStart('mech_select')} />
      <Btn label="⚙  OPTIONS"       onClick={() => {}} />
      <div style={S.version}>v3.0 — 3D ENGINE</div>
    </div>
  );
}
