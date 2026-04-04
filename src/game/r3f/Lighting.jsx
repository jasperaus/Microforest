import React from 'react';
import { Stars } from '@react-three/drei';

/**
 * Lighting — scene illumination for the 3D battlefield.
 * Key light: directional sun casting PCFSoft shadows (4096 shadow map).
 * Fill: hemisphere sky/ground.
 * Ambient: minimal flat fill to prevent pitch-black undersides.
 * Accent: blue team glow, enemy zone glow, ground-bounce fill.
 * Atmosphere: distance fog + star-field backdrop.
 */
export default function Lighting() {
  return (
    <>
      {/* Atmospheric fog for depth */}
      <fog attach="fog" args={['#0a0a14', 18, 45]} />

      {/* Key light — directional sun */}
      <directionalLight
        position={[8, 20, 6]}
        intensity={2.8}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />

      {/* Fill lights */}
      <hemisphereLight args={['#aaccff', '#334422', 0.6]} />
      <ambientLight intensity={0.25} />

      {/* Blue team glow */}
      <pointLight position={[-6, 3, -4]} color="#4466ff" intensity={0.8} />

      {/* Enemy zone glow */}
      <pointLight position={[6, 3, 4]} color="#ff4444" intensity={0.6} />

      {/* Subtle ground-bounce fill */}
      <pointLight position={[0, -1, 0]} color="#223322" intensity={0.4} />

      {/* Sci-fi star-field backdrop */}
      <Stars
        radius={80}
        depth={40}
        count={2000}
        factor={3}
        saturation={0.2}
        fade
        speed={0.8}
      />
    </>
  );
}
