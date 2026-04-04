import React, { useState, useEffect, useRef, useCallback } from 'react';
import MechCard from './MechCard.jsx';
import ActionBar from './ActionBar.jsx';
import EventBridge from '../phaser/EventBridge.js';

const LOG_MAX = 6;

/**
 * HUDOverlay — battle HUD rendered as an HTML overlay above the 3D canvas.
 *
 * Receives game state via EventBridge events (emitted by TurnManager /
 * AIController / GameContext) and action callbacks from GameRoot.
 *
 * Props:
 *   onEndTurn        () => void
 *   onRequestMove    () => void   — GameRoot passes TurnManager's selectedMech
 *   onRequestAttack  () => void
 *   onRequestSpecial () => void
 *   onDeselect       () => void
 */
export default function HUDOverlay({
  onEndTurn,
  onRequestMove,
  onRequestAttack,
  onRequestSpecial,
  onDeselect,
}) {
  const [phase, setPhase] = useState('IDLE');
  const [team, setTeam] = useState('player');
  const [turn, setTurn] = useState(1);
  const [selectedMech, setSelectedMech] = useState(null);
  const [playerMechs, setPlayerMechs] = useState([]);
  const [enemyMechs, setEnemyMechs] = useState([]);
  const [log, setLog] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const logRef = useRef(null);

  // Turn banner state
  const [banner, setBanner] = useState(null);     // { team, turn }
  const [bannerVisible, setBannerVisible] = useState(false);
  const bannerTimerRef = useRef(null);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-(LOG_MAX - 1)), msg]);
  }, []);

  useEffect(() => {
    let mounted = true;

    const handleEvent = ({ event, data }) => {
      if (!mounted) return;
      switch (event) {
        case 'phaseChange':
          setPhase(data.phase);
          setTeam(data.team);
          setTurn(data.turn);
          break;
        case 'turnStart':
          setTeam(data.team);
          setTurn(data.turn);
          if (data.mechs) setPlayerMechs(data.mechs);
          if (data.enemyMechs) setEnemyMechs(data.enemyMechs);
          // Show turn banner
          setBanner({ team: data.team, turn: data.turn });
          setBannerVisible(true);
          if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
          bannerTimerRef.current = setTimeout(() => {
            setBannerVisible(false);
          }, 1500);
          break;
        case 'mechSelected':
          setSelectedMech(data);
          break;
        case 'mechDeselected':
          setSelectedMech(null);
          break;
        case 'mechMoved':
          setSelectedMech(data);
          break;
        case 'mechUpdated':
          setSelectedMech(prev => (prev && prev.id === data.id) ? data : prev);
          setPlayerMechs(prev => prev.map(m => m.id === data.id ? data : m));
          setEnemyMechs(prev => prev.map(m => m.id === data.id ? data : m));
          break;
        case 'mechKilled':
          if (data.team === 'player') {
            setPlayerMechs(prev => prev.map(m => m.id === data.mechId ? { ...m, alive: false } : m));
            setSelectedMech(prev => (prev && prev.id === data.mechId) ? null : prev);
          } else {
            setEnemyMechs(prev => prev.map(m => m.id === data.mechId ? { ...m, alive: false } : m));
          }
          break;
        case 'combatResult':
          setSelectedMech(prev => (prev && prev.id === data.attacker.id) ? data.attacker : prev);
          break;
        case 'log':
          addLog(data);
          break;
        case 'gameOver':
          setGameOver(data);
          setPhase('GAME_OVER');
          break;
        default:
          break;
      }
    };

    EventBridge.setListener(handleEvent);
    return () => {
      mounted = false;
      EventBridge.removeListener(handleEvent);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [addLog]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // ── Action handlers — delegate to GameRoot callbacks ───────────────────────

  const handleMove    = () => onRequestMove?.();
  const handleAttack  = () => onRequestAttack?.();
  const handleSpecial = () => onRequestSpecial?.();
  const handleEndTurn = () => onEndTurn?.();
  const handleDeselect = () => onDeselect?.();

  const isEnemyTurn = team === 'enemy' || phase === 'ENEMY_TURN';

  // AP pip rendering helper
  const renderApPips = (mech) => {
    if (!mech || !mech.alive) return null;
    const maxAp = mech.maxAp ?? mech.baseAp ?? 3;
    const currentAp = mech.ap ?? 0;
    const pips = [];
    for (let i = 0; i < maxAp; i++) {
      pips.push(
        <span key={i} style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          margin: '0 2px',
          background: i < currentAp ? '#44aaff' : 'transparent',
          border: i < currentAp ? '1px solid #66ccff' : '1px solid #334466',
          boxShadow: i < currentAp ? '0 0 4px #44aaff88' : 'none',
          transition: 'all 0.25s ease',
        }} />
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4, paddingLeft: 4 }}>
        <span style={{ fontSize: 9, color: '#556677', marginRight: 4, letterSpacing: 1 }}>AP</span>
        {pips}
      </div>
    );
  };

  // Banner colors
  const bannerIsEnemy = banner?.team === 'enemy';
  const bannerColor = bannerIsEnemy ? '#ff4444' : '#44aaff';
  const bannerBg = bannerIsEnemy ? 'rgba(60, 0, 0, 0.92)' : 'rgba(0, 20, 60, 0.92)';
  const bannerBorder = bannerIsEnemy ? '#880000' : '#004488';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* Turn transition banner */}
      {banner && (
        <div style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 100,
          pointerEvents: 'none',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          opacity: bannerVisible ? 1 : 0,
          transform: bannerVisible ? 'translateY(0)' : 'translateY(-30px)',
        }}>
          <div style={{
            background: bannerBg,
            border: `2px solid ${bannerBorder}`,
            borderRadius: 6,
            padding: '10px 40px',
            color: bannerColor,
            fontSize: 20,
            fontWeight: 'bold',
            letterSpacing: 4,
            textShadow: `0 0 12px ${bannerColor}88`,
            textTransform: 'uppercase',
          }}>
            {bannerIsEnemy ? 'ENEMY TURN' : 'PLAYER TURN'}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 16px',
        background: 'rgba(5, 5, 20, 0.88)',
        borderBottom: '2px solid #1a1a3a',
        pointerEvents: 'none',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, color: '#00eedd', fontWeight: 'bold', letterSpacing: 2 }}>
          IRON CADETS
        </div>
        <div style={{
          fontSize: 13, fontWeight: 'bold', letterSpacing: 1,
          color: isEnemyTurn ? '#ff4444' : '#44aaff',
          background: isEnemyTurn ? '#330000' : '#001133',
          padding: '4px 14px', borderRadius: 4,
          border: `1px solid ${isEnemyTurn ? '#660000' : '#003366'}`,
        }}>
          {isEnemyTurn ? '⚠ ENEMY TURN' : '● PLAYER TURN'} — Round {turn}
        </div>
        <div style={{ fontSize: 11, color: '#445566' }}>
          {playerMechs.filter(m => m.alive).length} vs {enemyMechs.filter(m => m.alive).length} alive
        </div>
      </div>

      {/* Middle row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', pointerEvents: 'none' }}>
        {/* Left: selected mech card + AP pips + roster */}
        <div style={{ width: 220, flexShrink: 0, padding: 8, pointerEvents: 'auto' }}>
          <MechCard mech={selectedMech} />
          {selectedMech && renderApPips(selectedMech)}

          <div style={{ marginTop: 6 }}>
            {playerMechs.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '2px 4px', marginBottom: 2,
                background: selectedMech?.id === m.id ? '#112244' : '#0a0a1a',
                borderRadius: 3,
                opacity: m.alive ? 1 : 0.3,
                border: selectedMech?.id === m.id ? '1px solid #2244aa' : '1px solid #111122',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: m.alive ? (m.ap > 0 ? '#44aaff' : '#334466') : '#222222',
                }} />
                <span style={{ fontSize: 10, color: m.alive ? '#aaccee' : '#333344', flex: 1 }}>
                  {m.name}
                </span>
                <span style={{ fontSize: 10, color: '#556677' }}>
                  {m.alive ? `${m.hp}hp` : 'KO'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Centre: transparent (3D canvas shows through) */}
        <div style={{ flex: 1 }} />

        {/* Right: combat log */}
        <div style={{ width: 260, flexShrink: 0, padding: 8, pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5, 5, 20, 0.82)',
            border: '1px solid #1a1a3a',
            borderRadius: 5,
            padding: '4px 6px',
            height: '100%',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 10, color: '#334466', marginBottom: 4, letterSpacing: 1 }}>
              BATTLE LOG
            </div>
            <div
              ref={logRef}
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              {log.map((msg, i) => (
                <div key={i} style={{
                  fontSize: 10, color: '#778899', lineHeight: 1.3,
                  borderBottom: '1px solid #111122', paddingBottom: 2,
                }}>
                  {msg}
                </div>
              ))}
              {log.length === 0 && (
                <div style={{ fontSize: 9, color: '#223344', fontStyle: 'italic' }}>
                  Battle begins...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: action bar */}
      <div style={{ flexShrink: 0, pointerEvents: 'auto' }}>
        <ActionBar
          selectedMech={selectedMech}
          playerMechs={playerMechs}
          phase={phase}
          onMove={handleMove}
          onAttack={handleAttack}
          onSpecial={handleSpecial}
          onEndTurn={handleEndTurn}
          onDeselect={handleDeselect}
        />
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace',
            color: gameOver.won ? '#ffcc00' : '#ff3344',
            textShadow: `0 0 20px ${gameOver.won ? '#ffcc00' : '#ff3344'}`,
            letterSpacing: 4,
          }}>
            {gameOver.won ? 'VICTORY!' : 'DEFEAT'}
          </div>
        </div>
      )}
    </div>
  );
}
