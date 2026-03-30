import React, { useState, useEffect } from 'react';
import campaignsData from '../data/campaigns.json';

const S = {
  root: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#07070f',
    fontFamily: 'monospace', color: '#aaccff',
    userSelect: 'none',
  },
  panel: {
    width: 620, padding: '40px 48px',
    border: '2px solid #00eedd44',
    background: 'rgba(0,10,20,0.85)',
    boxShadow: '0 0 40px #00eedd22',
  },
  missionLabel: { fontSize: 11, letterSpacing: 4, color: '#00eedd', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#00eedd', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#88aacc', marginBottom: 20 },
  objective: { fontSize: 13, color: '#ffcc44', marginBottom: 20 },
  story: { fontSize: 13, lineHeight: '1.7', color: '#99b8cc', marginBottom: 32 },
  btn: {
    padding: '12px 36px', background: 'transparent',
    border: '2px solid #00eedd', color: '#00eedd',
    fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

export default function StoryScene3D({ missionIndex, onContinue }) {
  const mission = campaignsData[missionIndex] ?? campaignsData[0];
  const [hover, setHover] = useState(false);

  return (
    <div style={S.root}>
      <div style={S.panel}>
        <div style={S.missionLabel}>MISSION {missionIndex + 1}</div>
        <div style={S.title}>{mission.name.toUpperCase()}</div>
        <div style={S.subtitle}>{mission.subtitle}</div>
        <div style={S.objective}>▸ Objective: {mission.objective}</div>
        <div style={S.story}>{mission.story}</div>
        <button
          style={{ ...S.btn, ...(hover ? { background: '#00eedd22' } : {}) }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={onContinue}
        >
          DEPLOY ▶
        </button>
      </div>
    </div>
  );
}
