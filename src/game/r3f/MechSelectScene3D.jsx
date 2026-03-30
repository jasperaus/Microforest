import React, { useState } from 'react';
import mechsData from '../data/mechs.json';
import abilitiesData from '../data/abilities.json';
import campaignsData from '../data/campaigns.json';

const abilityMap = {};
abilitiesData.forEach(a => { abilityMap[a.id] = a; });

const CLASS_COLORS = {
  Scout:   '#00ccdd', Brawler: '#ff6600',
  Sniper:  '#44cc44', Support: '#ddaa00', Assault: '#cc2222',
};

const S = {
  root: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(160deg, #0a0a14, #141428)',
    fontFamily: 'monospace', color: '#d0e8f0', userSelect: 'none',
  },
  header: {
    padding: '20px 36px 12px', borderBottom: '1px solid #00eedd33',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#00eedd', letterSpacing: 4 },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  roster: { width: 200, borderRight: '1px solid #00eedd22', padding: 12, overflowY: 'auto' },
  rosterItem: (selected, unlocked) => ({
    padding: '10px 12px', marginBottom: 6, cursor: unlocked ? 'pointer' : 'default',
    border: selected ? '2px solid #00eedd' : '1px solid #334455',
    background: selected ? '#00eedd18' : 'transparent',
    opacity: unlocked ? 1 : 0.4,
    transition: 'all 0.1s',
  }),
  detail: { flex: 1, padding: '28px 36px', overflowY: 'auto' },
  mechName: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  classBadge: (cls) => ({
    display: 'inline-block', padding: '2px 10px', fontSize: 11,
    border: `1px solid ${CLASS_COLORS[cls] ?? '#556677'}`,
    color: CLASS_COLORS[cls] ?? '#556677',
    marginBottom: 16, letterSpacing: 2,
  }),
  desc: { fontSize: 13, color: '#7799aa', lineHeight: '1.6', marginBottom: 20 },
  statRow: { display: 'flex', alignItems: 'center', marginBottom: 8 },
  statLabel: { width: 72, fontSize: 11, color: '#7799aa', letterSpacing: 1 },
  bar: { flex: 1, height: 8, background: '#1a1a2a', borderRadius: 4, overflow: 'hidden' },
  barFill: (pct, color) => ({ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 4 }),
  special: { marginTop: 20, padding: 16, border: '1px solid #33445566', background: '#0a0a1a' },
  specialTitle: { fontSize: 11, color: '#00eedd', letterSpacing: 2, marginBottom: 6 },
  specialName: { fontSize: 14, color: '#ffcc44', marginBottom: 4 },
  specialDesc: { fontSize: 12, color: '#7799aa' },
  footer: {
    padding: '14px 36px', borderTop: '1px solid #00eedd33',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  slotInfo: { fontSize: 13, color: '#7799aa' },
  btn: (disabled) => ({
    padding: '12px 36px', border: `2px solid ${disabled ? '#334455' : '#00eedd'}`,
    background: 'transparent', color: disabled ? '#334455' : '#00eedd',
    fontSize: 14, fontFamily: 'monospace', letterSpacing: 2,
    cursor: disabled ? 'default' : 'pointer',
  }),
};

const STAT_CFG = [
  { key: 'maxHp',      label: 'HP',      max: 120, color: '#44cc44' },
  { key: 'speed',      label: 'SPEED',   max: 6,   color: '#4488ff' },
  { key: 'frontArmor', label: 'F.ARMOR', max: 60,  color: '#8899aa' },
  { key: 'rearArmor',  label: 'R.ARMOR', max: 60,  color: '#667788' },
];

export default function MechSelectScene3D({ missionIndex, onConfirm }) {
  const mission = campaignsData[missionIndex] ?? campaignsData[0];
  const slotCount = mission.playerSpawns.length;

  const unlocked = mechsData.filter(m => m.team === 'player' && m.unlocked);
  const [selected, setSelected] = useState(unlocked.map(m => m.id).slice(0, slotCount));
  const [focused, setFocused] = useState(unlocked[0] ?? null);

  const toggle = (mech) => {
    if (!mech.unlocked) return;
    setFocused(mech);
    setSelected(prev => {
      if (prev.includes(mech.id)) return prev.filter(id => id !== mech.id);
      if (prev.length >= slotCount) return [...prev.slice(1), mech.id];
      return [...prev, mech.id];
    });
  };

  const ability = focused ? abilityMap[focused.special] : null;
  const ready = selected.length > 0;

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerTitle}>SELECT YOUR SQUAD</div>
        <div style={{ fontSize: 13, color: '#7799aa' }}>
          Mission {missionIndex + 1}: {mission.name}
        </div>
      </div>

      <div style={S.body}>
        {/* Roster list */}
        <div style={S.roster}>
          {mechsData.filter(m => m.team === 'player').map(mech => (
            <div
              key={mech.id}
              style={S.rosterItem(selected.includes(mech.id), mech.unlocked)}
              onClick={() => toggle(mech)}
            >
              <div style={{ fontSize: 13, fontWeight: 'bold', color: selected.includes(mech.id) ? '#00eedd' : '#aaccdd' }}>
                {mech.name}
              </div>
              <div style={{ fontSize: 10, color: CLASS_COLORS[mech.class] ?? '#557788' }}>
                {mech.class.toUpperCase()}
              </div>
              {!mech.unlocked && <div style={{ fontSize: 10, color: '#556677' }}>LOCKED</div>}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {focused && (
          <div style={S.detail}>
            <div style={S.mechName}>{focused.name}</div>
            <div style={S.classBadge(focused.class)}>{focused.class.toUpperCase()}</div>
            <div style={S.desc}>{focused.description}</div>

            {STAT_CFG.map(({ key, label, max, color }) => (
              <div key={key} style={S.statRow}>
                <div style={S.statLabel}>{label}</div>
                <div style={S.bar}>
                  <div style={S.barFill(Math.min(1, focused[key] / max), color)} />
                </div>
                <div style={{ width: 36, textAlign: 'right', fontSize: 12, color: '#aaccdd', marginLeft: 8 }}>
                  {focused[key]}
                </div>
              </div>
            ))}

            {ability && (
              <div style={S.special}>
                <div style={S.specialTitle}>SPECIAL ABILITY</div>
                <div style={S.specialName}>{focused.specialName}</div>
                <div style={S.specialDesc}>{focused.specialDesc}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={S.footer}>
        <div style={S.slotInfo}>
          Squad: {selected.length} / {slotCount} selected
        </div>
        <button
          style={S.btn(!ready)}
          disabled={!ready}
          onClick={() => ready && onConfirm(selected)}
        >
          DEPLOY ▶
        </button>
      </div>
    </div>
  );
}
