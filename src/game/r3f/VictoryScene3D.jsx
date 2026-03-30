import React, { useState } from 'react';
import campaignsData from '../data/campaigns.json';

const S = {
  root: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #0f1228 0%, #07070f 100%)',
    fontFamily: 'monospace', color: '#d0e8f0', userSelect: 'none',
  },
  result: (won) => ({
    fontSize: 52, fontWeight: 'bold', letterSpacing: 8, marginBottom: 12,
    color: won ? '#00eedd' : '#ff4444',
    textShadow: won
      ? '0 0 32px #00eedd, 0 0 64px #00aabb'
      : '0 0 32px #ff4444, 0 0 64px #aa0000',
  }),
  subtitle: { fontSize: 16, color: '#7799aa', letterSpacing: 4, marginBottom: 40 },
  statsBox: {
    padding: '28px 56px', border: '1px solid #00eedd33',
    background: 'rgba(0,10,20,0.85)', marginBottom: 40,
  },
  statRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 48 },
  statKey: { fontSize: 12, color: '#7799aa', letterSpacing: 2 },
  statVal: { fontSize: 14, color: '#d0e8f0', fontWeight: 'bold' },
  btn: (primary) => ({
    padding: '13px 40px', marginLeft: 16,
    border: `2px solid ${primary ? '#00eedd' : '#334455'}`,
    background: 'transparent',
    color: primary ? '#00eedd' : '#7799aa',
    fontSize: 14, fontFamily: 'monospace', letterSpacing: 2, cursor: 'pointer',
    transition: 'all 0.15s',
  }),
};

export default function VictoryScene3D({ won, missionIndex, stats, onNextMission, onMenu }) {
  const mission = campaignsData[missionIndex] ?? campaignsData[0];
  const nextMission = campaignsData[missionIndex + 1];

  return (
    <div style={S.root}>
      <div style={S.result(won)}>{won ? 'VICTORY' : 'DEFEAT'}</div>
      <div style={S.subtitle}>
        {won ? mission.name.toUpperCase() + ' — COMPLETED' : 'YOUR MECHS HAVE BEEN DESTROYED'}
      </div>

      <div style={S.statsBox}>
        <div style={S.statRow}>
          <span style={S.statKey}>TURNS TAKEN</span>
          <span style={S.statVal}>{stats?.turns ?? '—'}</span>
        </div>
        <div style={S.statRow}>
          <span style={S.statKey}>ENEMIES DESTROYED</span>
          <span style={S.statVal}>{stats?.enemiesKilled ?? 0}</span>
        </div>
        <div style={S.statRow}>
          <span style={S.statKey}>MECHS LOST</span>
          <span style={S.statVal}>{stats?.mechsLost ?? 0}</span>
        </div>
        {won && mission.rewardCredits > 0 && (
          <div style={S.statRow}>
            <span style={S.statKey}>CREDITS EARNED</span>
            <span style={{ ...S.statVal, color: '#ffcc44' }}>+{mission.rewardCredits}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex' }}>
        <button style={S.btn(false)} onClick={onMenu}>
          ↩ MAIN MENU
        </button>
        {won && nextMission && (
          <button style={S.btn(true)} onClick={onNextMission}>
            NEXT MISSION ▶
          </button>
        )}
        {(!won || !nextMission) && (
          <button style={S.btn(true)} onClick={onMenu}>
            {won ? 'CAMPAIGN COMPLETE ✓' : 'TRY AGAIN'}
          </button>
        )}
      </div>
    </div>
  );
}
