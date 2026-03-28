import React from 'react';

function ActionButton({ label, icon, disabled, onClick, color = '#224466', textColor = '#aaccff', title }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        background: disabled ? '#111122' : color,
        border: `1px solid ${disabled ? '#222233' : textColor}55`,
        borderRadius: 5,
        color: disabled ? '#334455' : textColor,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 'bold',
        padding: '6px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function ActionBar({ selectedMech, phase, onMove, onAttack, onSpecial, onEndTurn, onDeselect }) {
  const isPlayerTurn = phase !== 'ENEMY_TURN' && phase !== 'GAME_OVER';
  const isAnimating = phase === 'MOVING' || phase === 'RESOLVING';
  const hasMech = !!selectedMech && selectedMech.alive;
  const canAct = hasMech && isPlayerTurn && !isAnimating;
  const canMove = canAct && selectedMech.ap >= 1;
  const canAttack = canAct && selectedMech.ap >= 1 && !selectedMech.overheated;
  const canSpecial = canAct && selectedMech.ap >= 2 && selectedMech.special !== 'none' && selectedMech.special !== 'stealth' || (canAct && selectedMech.ap >= 2);
  const canEndTurn = isPlayerTurn && !isAnimating;

  const phaseLabels = {
    IDLE: 'Select a mech',
    MECH_SELECTED: `${selectedMech?.name || ''} selected`,
    MOVING: 'Moving...',
    ATTACK_SELECT: 'Choose target',
    RESOLVING: 'Resolving...',
    SPECIAL_SELECT: 'Choose target',
    ENEMY_TURN: 'Enemy turn...',
    GAME_OVER: 'Game Over',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '8px 10px',
      background: '#0a0a1a',
      borderTop: '1px solid #1a1a3a',
    }}>
      {/* Phase label */}
      <div style={{
        fontFamily: 'monospace', fontSize: 10, color: '#556688',
        textAlign: 'center', letterSpacing: 1,
      }}>
        {phaseLabels[phase] || phase}
        {phase === 'ATTACK_SELECT' && <span style={{ color: '#ff4444' }}> — click enemy to fire</span>}
        {phase === 'MECH_SELECTED' && <span style={{ color: '#4488ff' }}> — click blue tile to move</span>}
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
          disabled={!canAct || selectedMech?.ap < 2 || selectedMech?.special === 'none'}
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
