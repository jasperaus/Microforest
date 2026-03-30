import React from 'react';

/**
 * Lighting — scene illumination for the 3D battlefield.
 * Key light: directional sun casting PCFSoft shadows.
 * Fill: hemisphere sky/ground.
 * Ambient: minimal flat fill to prevent pitch-black undersides.
 */
export default function Lighting() {
  return (
    <>
      <directionalLight
        position={[8, 20, 6]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />
      <hemisphereLight
        args={['#aaccff', '#334422', 0.6]}
      />
      <ambientLight intensity={0.25} />
    </>
  );
}
