import React from 'react';

const BAR_STYLE = {
  position: 'relative',
  width: '100%',
  height: 8,
  background: '#1a1a2e',
  borderRadius: 4,
  overflow: 'hidden',
  margin: '2px 0',
};

function StatBar({ value, max, color }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const barColor =
    color === 'hp'
      ? pct > 0.6 ? '#44ff66' : pct > 0.3 ? '#ffcc00' : '#ff3333'
      : color === 'heat'
      ? pct > 0.7 ? '#ff4400' : pct > 0.4 ? '#ffaa00' : '#4488ff'
      : '#aaaaaa';

  return (
    <div style={BAR_STYLE}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${Math.round(pct * 100)}%`,
        background: barColor,
        transition: 'width 0.2s ease, background 0.2s ease',
        borderRadius: 4,
      }} />
    </div>
  );
}

function APDots({ ap, maxAp }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
      {Array.from({ length: maxAp }).map((_, i) => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: i < ap ? '#44aaff' : '#222244',
          border: '1px solid #334466',
        }} />
      ))}
      <span style={{ fontSize: 9, color: '#6688aa', marginLeft: 4 }}>AP</span>
    </div>
  );
}

export default function MechCard({ mech }) {
  if (!mech) {
    return (
      <div style={{
        background: '#0d0d1e',
        border: '1px solid #1a1a3a',
        borderRadius: 6,
        padding: '12px 14px',
        minWidth: 190,
        color: '#334466',
        fontSize: 12,
        fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 22, opacity: 0.3 }}>🤖</div>
          <div style={{ marginTop: 6 }}>Select a mech</div>
        </div>
      </div>
    );
  }

  const classColors = {
    Scout: '#00eedd',
    Brawler: '#ff8c00',
    Sniper: '#00dd44',
    Support: '#ffd700',
    Assault: '#ff2244',
  };
  const nameColor = classColors[mech.class] || '#ffffff';

  return (
    <div style={{
      background: '#0d0d1e',
      border: `1px solid ${nameColor}44`,
      borderRadius: 6,
      padding: '10px 12px',
      minWidth: 190,
      fontFamily: 'monospace',
      fontSize: 11,
      color: '#ccccee',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 'bold', color: nameColor, fontSize: 14 }}>{mech.name}</span>
        <span style={{ color: '#667799', fontSize: 10 }}>{mech.class}</span>
      </div>

      {/* AP dots */}
      <APDots ap={mech.ap} maxAp={mech.maxAp} />

      {/* Status badges */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
        {mech.stealthed && <span style={{ background: '#222244', color: '#8888ff', padding: '1px 5px', borderRadius: 3, fontSize: 8 }}>STEALTH</span>}
        {mech.overheated && <span style={{ background: '#440000', color: '#ff4400', padding: '1px 5px', borderRadius: 3, fontSize: 8 }}>OVERHEATED</span>}
        {mech.calledShot && <span style={{ background: '#224422', color: '#44ff44', padding: '1px 5px', borderRadius: 3, fontSize: 8 }}>AIM+</span>}
      </div>

      {/* HP bar */}
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
          <span style={{ color: '#888899', fontSize: 9 }}>HP</span>
          <span style={{ color: '#ccccee', fontSize: 9 }}>{Math.max(0, mech.hp)}/{mech.maxHp}</span>
        </div>
        <StatBar value={mech.hp} max={mech.maxHp} color="hp" />
      </div>

      {/* Heat bar */}
      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
          <span style={{ color: '#888899', fontSize: 9 }}>HEAT</span>
          <span style={{ color: '#ccccee', fontSize: 9 }}>{mech.heat}/{mech.maxHeat}</span>
        </div>
        <StatBar value={mech.heat} max={mech.maxHeat} color="heat" />
      </div>

      {/* Armor */}
      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
        <div>
          <div style={{ color: '#667799', fontSize: 8 }}>FRONT</div>
          <div style={{ color: '#99bbcc', fontWeight: 'bold' }}>{Math.max(0, mech.frontArmor)}</div>
        </div>
        <div>
          <div style={{ color: '#667799', fontSize: 8 }}>REAR</div>
          <div style={{ color: '#99bbcc', fontWeight: 'bold' }}>{Math.max(0, mech.rearArmor)}</div>
        </div>
        <div>
          <div style={{ color: '#667799', fontSize: 8 }}>SPD</div>
          <div style={{ color: '#99bbcc', fontWeight: 'bold' }}>{mech.speed}</div>
        </div>
      </div>

      {/* Special */}
      {mech.specialName && (
        <div style={{
          marginTop: 6, padding: '3px 6px',
          background: '#111133', borderRadius: 4,
          border: '1px solid #223355', fontSize: 9,
          color: '#ffcc44',
        }}>
          ★ {mech.specialName}
        </div>
      )}
    </div>
  );
}
