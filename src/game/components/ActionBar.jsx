import React, { useState } from 'react';

const pulseKeyframes = `
@keyframes endTurnPulse {
  0%   { box-shadow: 0 0 0px #44cc4400; }
  50%  { box-shadow: 0 0 12px #44cc4488; }
  100% { box-shadow: 0 0 0px #44cc4400; }
}
`;

function ActionButton({ label, icon, disabled, onClick, color = '#224466', textColor = '#aaccff', title, pulse }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: disabled ? '#111122' : color,
        border: `1px solid ${disabled ? '#222233' : textColor}55`,
        borderRadius: 5,
        color: disabled ? '#334455' : textColor,
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 'bold',
        padding: '8px 14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        filter: (!disabled && hovered) ? 'brightness(1.25)' : 'brightness(1)',
        animation: pulse ? 'endTurnPulse 1.2s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ActionBar({ selectedMech, playerMechs, phase, onMove, onAttack, onSpecial, onEndTurn, onDeselect }) {
  const isPlayerTurn = phase !== 'ENEMY_TURN' && phase !== 'GAME_OVER';
  const isAnimating = phase === 'MOVING' || phase === 'RESOLVING';
  const hasMech = !!selectedMech && selectedMech.alive;
  const canAct = hasMech && isPlayerTurn && !isAnimating;
  const canMove = canAct && selectedMech.ap >= 1;
  const canAttack = canAct && selectedMech.ap >= 1 && !selectedMech.overheated;
  const canSpecial = canAct && selectedMech.ap >= 2 && selectedMech.special && selectedMech.special !== 'none';
  const canEndTurn = isPlayerTurn && !isAnimating;

  // Check if all alive player mechs are exhausted (0 AP)
  const allExhausted = isPlayerTurn && !isAnimating
    && Array.isArray(playerMechs) && playerMechs.length > 0
    && playerMechs.filter(m => m.alive).length > 0
    && playerMechs.filter(m => m.alive).every(m => (m.ap ?? 0) <= 0);

  const phaseLabels = {
    IDLE: 'Click a mech on the battlefield to select it',
    MECH_SELECTED: `${selectedMech?.name || ''} selected`,
    MOVING: 'Moving...',
    ATTACK_SELECT: 'Choose target',
    RESOLVING: 'Resolving...',
    SPECIAL_SELECT: 'Choose target',
    ENEMY_TURN: 'Enemy turn — stand by...',
    GAME_OVER: 'Game Over',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '10px 16px',
      background: '#0a0a1a',
      borderTop: '2px solid #1a1a3a',
    }}>
      {/* Inject pulse animation keyframes */}
      <style>{pulseKeyframes}</style>

      {/* Phase label */}
      <div style={{
        fontFamily: 'monospace', fontSize: 12, color: '#556688',
        textAlign: 'center', letterSpacing: 1,
      }}>
        {phaseLabels[phase] || phase}
        {phase === 'IDLE' && <span style={{ color: '#334455' }}> (right side of battlefield)</span>}
        {phase === 'MECH_SELECTED' && <span style={{ color: '#4488ff' }}> — click a blue tile to move, or press ATTACK</span>}
        {phase === 'ATTACK_SELECT' && <span style={{ color: '#ff4444' }}> — click a red-highlighted enemy to fire</span>}
        {phase === 'SPECIAL_SELECT' && <span style={{ color: '#aa44ff' }}> — click a highlighted target</span>}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        <ActionButton
          icon="👟"
          label="MOVE"
          disabled={!canMove}
          onClick={onMove}
          color="#112244"
          textColor="#4488ff"
          title="Move mech (costs 1 AP)"
        />
        <ActionButton
          icon="🎯"
          label="ATTACK"
          disabled={!canAttack}
          onClick={onAttack}
          color="#330011"
          textColor="#ff4466"
          title={selectedMech?.overheated ? 'Overheated! Cannot attack' : 'Attack enemy (costs 1 AP)'}
        />
        <ActionButton
          icon="⚡"
          label={selectedMech?.specialName?.split(' ')[0] || 'SPECIAL'}
          disabled={!canSpecial}
          onClick={onSpecial}
          color="#221133"
          textColor="#aa44ff"
          title={`${selectedMech?.specialName || 'Special ability'} (costs 2 AP)`}
        />
        <ActionButton
          icon="⏭"
          label="END TURN"
          disabled={!canEndTurn}
          onClick={onEndTurn}
          color="#112211"
          textColor="#44cc44"
          title="End player turn"
          pulse={allExhausted}
        />
        {hasMech && (
          <ActionButton
            icon="✕"
            label="DESELECT"
            disabled={isAnimating || phase === 'ENEMY_TURN'}
            onClick={onDeselect}
            color="#111111"
            textColor="#555577"
            title="Deselect mech"
          />
        )}
      </div>
    </div>
  );
}
