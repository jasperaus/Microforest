import React from 'react';
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  SSAO,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * PostProcessing — cinematic post-processing stack.
 *
 * Effects (in order):
 *   1. SSAO        — screen-space ambient occlusion for contact shadows
 *   2. Bloom       — glow on emissive surfaces (mech neon eyes/vents, tiles)
 *   3. ChromaticAberration — subtle colour fringing at edges
 *   4. Vignette    — darkened border for cinematic framing
 *
 * If SSAO causes issues at build/runtime it can be safely removed;
 * the remaining effects still produce a strong look.
 */
export default function PostProcessing() {
  return (
    <EffectComposer multisampling={8}>
      {/* SSAO — can be removed if it conflicts with transparent materials */}
      <SSAO
        samples={16}
        radius={0.12}
        intensity={1.5}
        blendFunction={BlendFunction.MULTIPLY}
      />
      <Bloom
        intensity={1.6}
        luminanceThreshold={0.5}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[0.0008, 0.0008]}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette offset={0.35} darkness={0.6} />
    </EffectComposer>
  );
}
