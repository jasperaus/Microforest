import React, { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import Lighting from './Lighting.jsx';
import PostProcessing from './PostProcessing.jsx';
import CameraRig from './CameraRig.jsx';
import BattleScene3D from './BattleScene3D.jsx';
import MenuScene3D from './MenuScene3D.jsx';
import StoryScene3D from './StoryScene3D.jsx';
import MechSelectScene3D from './MechSelectScene3D.jsx';
import VictoryScene3D from './VictoryScene3D.jsx';
import HUDOverlay from '../components/HUDOverlay.jsx';
import { createGameContext } from '../GameContext.js';
import weaponsData from '../data/weapons.json';

const SCENES = {
  MENU:        'menu',
  STORY:       'story',
  MECH_SELECT: 'mech_select',
  BATTLE:      'battle',
  VICTORY:     'victory',
};

/**
 * GameRoot — top-level scene router that manages the full game lifecycle.
 * Mounts:
 *   - A <Canvas> for all 3D scenes (BattleScene3D, background etc.)
 *   - Full-screen HTML overlays for menu, story, mech select, victory
 *   - HUDOverlay during battle
 */
export default function GameRoot() {
  const [scene, setScene] = useState(SCENES.MENU);
  const [missionIndex, setMissionIndex] = useState(0);
  const [selectedMechs, setSelectedMechs] = useState(null);
  const [victoryData, setVictoryData] = useState(null);

  // GameContext is rebuilt for each battle
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createGameContext(missionIndex, null, weaponsData);
    }
    return ctxRef.current;
  }, [missionIndex]);

  // Called by BattleScene3D when transitioning to another scene
  const handleSceneEnd = useCallback((sceneName, data = {}) => {
    if (sceneName === 'VictoryScene') {
      setVictoryData(data);
      setScene(SCENES.VICTORY);
    }
  }, []);

  // Handlers for the UI scenes
  const handleMenuStart = useCallback((dest) => {
    if (dest === 'mech_select') setScene(SCENES.MECH_SELECT);
  }, []);

  const handleMechConfirm = useCallback((mechs) => {
    setSelectedMechs(mechs);
    setScene(SCENES.STORY);
  }, []);

  const handleStoryContinue = useCallback(() => {
    // Fresh context for each battle
    ctxRef.current = createGameContext(missionIndex, null, weaponsData);
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

  const showCanvas = scene === SCENES.BATTLE;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* 3D Canvas — only active during battle */}
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
            <BattleScene3D
              key={`battle-${missionIndex}`}
              missionIndex={missionIndex}
              selectedMechs={selectedMechs}
              ctx={ctxRef.current}
              onSceneEnd={handleSceneEnd}
            />
          )}
          <PostProcessing />
        </Canvas>
      </div>

      {/* HUD — rendered above canvas during battle */}
      {scene === SCENES.BATTLE && (
        <HUDOverlay
          turnManager={ctxRef.current?.turnManager}
          onEndTurn={() => ctxRef.current?.turnManager?.endPlayerTurn()}
          onRequestMove={(mech) => ctxRef.current?.turnManager?.requestMove(mech)}
          onRequestAttack={(mech) => ctxRef.current?.turnManager?.requestAttack(mech)}
          onRequestSpecial={(mech) => ctxRef.current?.turnManager?.requestSpecial(mech)}
          onSelectMech={(mech) => ctxRef.current?.turnManager?.selectMech(mech)}
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
