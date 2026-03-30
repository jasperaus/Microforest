import React from 'react';
import GameRoot from './r3f/GameRoot.jsx';

/**
 * IronCadetsGame — game entry point.
 *
 * The Phaser engine has been replaced with Three.js + React Three Fiber.
 * GameRoot manages scene routing and mounts the R3F <Canvas> internally.
 */
export default function IronCadetsGame({ onBack }) {
  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      background: '#07070f',
      overflow: 'hidden',
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: 6, left: 6, zIndex: 300,
          background: 'rgba(5,5,20,0.85)',
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

      <GameRoot />
    </div>
  );
}
