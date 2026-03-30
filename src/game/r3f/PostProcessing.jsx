import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

/**
 * PostProcessing — Bloom + Vignette over the 3D scene.
 *
 * SSAO is omitted for now: @react-three/postprocessing v2 ships its own
 * SSAO but it requires careful depth-buffer config that can conflict with
 * transparent materials. Bloom and Vignette already achieve the desired
 * cinematic look.
 *
 * Bloom triggers on materials with emissiveIntensity ≥ 0.6 (mech neon
 * eyes/vents, tile highlights) — the luminanceThreshold controls the cutoff.
 */
export default function PostProcessing() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <Vignette offset={0.35} darkness={0.6} />
    </EffectComposer>
  );
}
