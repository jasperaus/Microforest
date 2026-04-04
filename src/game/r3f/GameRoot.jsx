import React, { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import Lighting from './Lighting.jsx';
import PostProcessing from './PostProcessing.jsx';
import CameraRig from './CameraRig.jsx';
import CombatEffects from './effects/CombatEffects.jsx';
import BattleScene3D from './BattleScene3D.jsx';
import MenuScene3D from './MenuScene3D.jsx';
import StoryScene3D from './StoryScene3D.jsx';
import MechSelectScene3D from './MechSelectScene3D.jsx';
import VictoryScene3D from './VictoryScene3D.jsx';
import HUDOverlay from '../components/HUDOverlay.jsx';
import { createGameContext } from '../GameContext.js';
import weaponsData from '../data/weapons.json';
import campaignsData from '../data/campaigns.json';

const SCENES = {
  MENU:        'menu',
  STORY:       'story',
  MECH_SELECT: 'mech_select',
  BATTLE:      'battle',
  VICTORY:     'victory',
};

/**
 * GameRoot — top-level scene router that manages the full game lifecycle.
 */
export default function GameRoot() {
  const [scene, setScene] = useState(SCENES.MENU);
  const [missionIndex, setMissionIndex] = useState(0);
  const [selectedMechs, setSelectedMechs] = useState(null);
  const [victoryData, setVictoryData] = useState(null);
  const [battleReady, setBattleReady] = useState(false);

  // GameContext is rebuilt for each battle
  const ctxRef = useRef(null);

  // Called by BattleScene3D once the first player turn is ready
  const handleBattleReady = useCallback(() => {
    setBattleReady(true);
  }, []);

  // Called by BattleScene3D when transitioning to another scene
  const handleSceneEnd = useCallback((sceneName, data = {}) => {
    if (sceneName === 'VictoryScene') {
      setVictoryData(data);
      setScene(SCENES.VICTORY);
    }
  }, []);

  // Handlers for UI scenes
  const handleMenuStart = useCallback((dest) => {
    if (dest === 'mech_select') setScene(SCENES.MECH_SELECT);
  }, []);

  const handleMechConfirm = useCallback((mechs) => {
    setSelectedMechs(mechs);
    setScene(SCENES.STORY);
  }, []);

  const handleStoryContinue = useCallback(() => {
    // Fresh context for each battle; resolve mission up front so ctx is never null-mission
    const mission = campaignsData[missionIndex] ?? campaignsData[0];
    ctxRef.current = createGameContext(missionIndex, mission, weaponsData);
    setBattleReady(false);
    setScene(SCENES.BATTLE);
  }, [missionIndex]);

  const handleNextMission = useCallback(() => {
    const next = missionIndex + 1;
    setMissionIndex(next);
    setSelectedMechs(null);
    ctxRef.current = null;
    setScene(SCENES.MECH_SELECT);
  }, [missionIndex]);

  const handleMenu = useCallback(() => {
    setMissionIndex(0);
    setSelectedMechs(null);
    ctxRef.current = null;
    setScene(SCENES.MENU);
  }, []);

  // ── HUD action callbacks (use TurnManager's real MechState instances) ──────

  const handleRequestMove = useCallback(() => {
    const tm = ctxRef.current?.turnManager;
    if (tm) tm.requestMove(tm.selectedMech);
  }, []);

  const handleRequestAttack = useCallback(() => {
    const tm = ctxRef.current?.turnManager;
    if (tm) tm.requestAttack(tm.selectedMech);
  }, []);

  const handleRequestSpecial = useCallback(() => {
    const tm = ctxRef.current?.turnManager;
    if (tm) tm.requestSpecial(tm.selectedMech);
  }, []);

  const handleEndTurn = useCallback(() => {
    ctxRef.current?.turnManager?.endPlayerTurn();
  }, []);

  const handleDeselect = useCallback(() => {
    ctxRef.current?.turnManager?.deselectMech();
  }, []);

  const showCanvas = scene === SCENES.BATTLE;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* 3D Canvas — always mounted but only visible during battle */}
      <div style={{ position: 'absolute', inset: 0, visibility: showCanvas ? 'visible' : 'hidden' }}>
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          camera={{ fov: 37, near: 0.1, far: 100, position: [0, 18, 12] }}
        >
          <Lighting />
          <CameraRig
            onShakeReady={(shake) => {
              if (ctxRef.current) ctxRef.current._shakeCamera = shake;
            }}
          />
          {scene === SCENES.BATTLE && ctxRef.current && (
            <>
              <BattleScene3D
                key={`battle-${missionIndex}`}
                missionIndex={missionIndex}
                selectedMechs={selectedMechs}
                ctx={ctxRef.current}
                onSceneEnd={handleSceneEnd}
                onReady={handleBattleReady}
              />
              <CombatEffects
                onEffectReady={(spawn) => {
                  if (ctxRef.current) ctxRef.current.spawnEffect = spawn;
                }}
              />
            </>
          )}
          <PostProcessing />
        </Canvas>
      </div>

      {/* Loading overlay — shown from Deploy until first player turn begins */}
      {scene === SCENES.BATTLE && !battleReady && (
        <BattleLoadingOverlay />
      )}

      {/* HUD — rendered above canvas during battle */}
      {scene === SCENES.BATTLE && battleReady && (
        <HUDOverlay
          onEndTurn={handleEndTurn}
          onRequestMove={handleRequestMove}
          onRequestAttack={handleRequestAttack}
          onRequestSpecial={handleRequestSpecial}
          onDeselect={handleDeselect}
        />
      )}

      {/* HTML overlay scenes */}
      {scene === SCENES.MENU && (
        <MenuScene3D onStart={handleMenuStart} />
      )}

      {scene === SCENES.MECH_SELECT && (
        <MechSelectScene3D
          missionIndex={missionIndex}
          onConfirm={handleMechConfirm}
        />
      )}

      {scene === SCENES.STORY && (
        <StoryScene3D
          missionIndex={missionIndex}
          onContinue={handleStoryContinue}
        />
      )}

      {scene === SCENES.VICTORY && victoryData && (
        <VictoryScene3D
          won={victoryData.won}
          missionIndex={missionIndex}
          stats={victoryData.stats}
          onNextMission={handleNextMission}
          onMenu={handleMenu}
        />
      )}
    </div>
  );
}

// ── Loading overlay ───────────────────────────────────────────────────────────

function BattleLoadingOverlay() {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const iv = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(160deg, #07070f, #0d0d1e)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', color: '#00eedd',
      zIndex: 10,
    }}>
      {/* Progress bar */}
      <div style={{ width: 280, marginBottom: 24 }}>
        <div style={{
          width: '100%', height: 3,
          background: '#0a1a22',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #00eedd, #4488ff)',
            animation: 'loading-bar 1.2s ease-in-out forwards',
          }} />
        </div>
      </div>

      <div style={{ fontSize: 13, letterSpacing: 4, color: '#00eedd' }}>
        INITIALIZING BATTLEFIELD{dots}
      </div>
      <div style={{ fontSize: 10, color: '#334455', marginTop: 10, letterSpacing: 2 }}>
        DEPLOYING UNITS
      </div>

      <style>{`
        @keyframes loading-bar {
          0%   { width: 0%; }
          60%  { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
