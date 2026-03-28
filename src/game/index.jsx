import React, { useEffect, useRef, useState } from 'react';
import HUDOverlay from './components/HUDOverlay.jsx';
import EventBridge from './phaser/EventBridge.js';

// Scenes
import BootScene from './phaser/scenes/BootScene.js';
import MenuScene from './phaser/scenes/MenuScene.js';
import MechSelectScene from './phaser/scenes/MechSelectScene.js';
import BattleScene from './phaser/scenes/BattleScene.js';
import VictoryScene from './phaser/scenes/VictoryScene.js';

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';

// Track which scenes need the React HUD overlay
const BATTLE_SCENES = new Set(['BattleScene']);

export default function IronCadetsGame({ onBack }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [activeScene, setActiveScene] = useState('BootScene');
  const [hudVisible, setHudVisible] = useState(false);

  useEffect(() => {
    let game = null;

    // Dynamic Phaser import to avoid SSR issues
    const initPhaser = async () => {
      const Phaser = await import('phaser');

      game = new Phaser.default.Game({
        type: Phaser.default.AUTO,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1a1a2e',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        parent: containerRef.current,
        scale: {
          mode: Phaser.default.Scale.FIT,
          autoCenter: Phaser.default.Scale.CENTER_HORIZONTALLY,
        },
        scene: [BootScene, MenuScene, MechSelectScene, BattleScene, VictoryScene],
      });

      gameRef.current = game;

      // Track active scene to show/hide React HUD
      game.events.on('step', () => {
        if (!game.scene) return;
        const active = game.scene.getScenes(true);
        if (active.length > 0) {
          const sceneName = active[0].scene.key;
          setActiveScene(sceneName);
          setHudVisible(BATTLE_SCENES.has(sceneName));
        }
      });
    };

    initPhaser();

    return () => {
      // Clean up Phaser instance to prevent memory leaks
      EventBridge.clearListener();
      if (game) {
        game.destroy(true);
        game = null;
      }
      gameRef.current = null;
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: CANVAS_WIDTH,
      margin: '0 auto',
      background: '#1a1a2e',
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          zIndex: 200,
          background: 'rgba(5, 5, 20, 0.85)',
          border: '1px solid #223355',
          color: '#446688',
          fontFamily: 'monospace',
          fontSize: 10,
          padding: '3px 8px',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>

      {/* Phaser canvas mount point */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        }}
      />

      {/* React HUD overlay — only shown during battle */}
      {hudVisible && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <HUDOverlay gameRef={gameRef} />
        </div>
      )}
    </div>
  );
}
