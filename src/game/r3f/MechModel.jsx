import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { lerp, easeInOutSine } from './animUtils.js';

// ── Shared material colors per mech id ─────────────────────────────────────
const MECH_PALETTE = {
  zip:         { frame: '#00aabb', armor: '#d0dce8', neon: '#00ffee' },
  rex:         { frame: '#cc5500', armor: '#d0dce8', neon: '#ff8c00' },
  bolt:        { frame: '#008833', armor: '#d0dce8', neon: '#00ff66' },
  nova:        { frame: '#ccaa00', armor: '#d0dce8', neon: '#ffdd00' },
  vex:         { frame: '#cc0033', armor: '#d0dce8', neon: '#ff2244' },
  drone_alpha: { frame: '#6611aa', armor: '#3a2a44', neon: '#bb44ff' },
  drone_heavy: { frame: '#880000', armor: '#3a3030', neon: '#ff4400' },
};

// Future: set to true and place .glb files in /public/models/{mechId}.glb
const USE_GLTF_MODELS = false; // eslint-disable-line no-unused-vars

// ── Primitive helpers ───────────────────────────────────────────────────────

function Box({ pos, size, color, roughness = 0.3, metalness = 0.5, emissive, emissiveIntensity = 0 }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? color}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

function Sphere({ pos, radius, color, emissiveIntensity = 0, segments = 12 }) {
  return (
    <mesh position={pos} castShadow>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial
        color={color}
        roughness={0.1}
        metalness={0.3}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

function Cyl({ pos, args, color, rotation, roughness = 0.3, metalness = 0.5, emissive, emissiveIntensity = 0 }) {
  return (
    <mesh position={pos} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive ?? color} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

function Cone({ pos, args, color, rotation, roughness = 0.2, metalness = 0.7 }) {
  return (
    <mesh position={pos} rotation={rotation} castShadow>
      <coneGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

// Spinning fins for drone_alpha
function SpinningFins({ color }) {
  const ref = React.useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 4; });
  return (
    <group ref={ref} position={[0, 0.72, 0]}>
      <Box pos={[-0.32, 0, 0]} size={[0.22, 0.03, 0.12]} color={color} roughness={0.1} metalness={0.9} />
      <Box pos={[ 0.32, 0, 0]} size={[0.22, 0.03, 0.12]} color={color} roughness={0.1} metalness={0.9} />
      <Box pos={[0, 0, -0.32]} size={[0.12, 0.03, 0.22]} color={color} roughness={0.1} metalness={0.9} />
      <Box pos={[0, 0,  0.32]} size={[0.12, 0.03, 0.22]} color={color} roughness={0.1} metalness={0.9} />
    </group>
  );
}

// ── Mech body shapes (one per id) ───────────────────────────────────────────

function ZipBody({ p, a, n }) {
  return (
    <group scale={[1.3, 1.3, 1.3]}>
      {/* Upper legs */}
      <Box pos={[-0.15, 0.28, 0]} size={[0.14, 0.26, 0.14]} color={a} roughness={0.5} />
      <Box pos={[ 0.15, 0.28, 0]} size={[0.14, 0.26, 0.14]} color={a} roughness={0.5} />
      {/* Knee joints */}
      <Cyl pos={[-0.15, 0.16, 0]} args={[0.07, 0.07, 0.06, 8]} color={p} roughness={0.2} metalness={0.9} />
      <Cyl pos={[ 0.15, 0.16, 0]} args={[0.07, 0.07, 0.06, 8]} color={p} roughness={0.2} metalness={0.9} />
      {/* Lower legs */}
      <Box pos={[-0.15, 0.06, 0.01]} size={[0.12, 0.20, 0.12]} color={a} roughness={0.5} />
      <Box pos={[ 0.15, 0.06, 0.01]} size={[0.12, 0.20, 0.12]} color={a} roughness={0.5} />
      {/* Shin neon stripes */}
      <Box pos={[-0.15, 0.04, 0.07]} size={[0.06, 0.10, 0.02]} color={n} emissiveIntensity={2.2} />
      <Box pos={[ 0.15, 0.04, 0.07]} size={[0.06, 0.10, 0.02]} color={n} emissiveIntensity={2.2} />
      {/* Feet */}
      <Box pos={[-0.15,-0.04, 0.02]} size={[0.14, 0.06, 0.18]} color={p} roughness={0.3} metalness={0.8} />
      <Box pos={[ 0.15,-0.04, 0.02]} size={[0.14, 0.06, 0.18]} color={p} roughness={0.3} metalness={0.8} />
      {/* Hip connector */}
      <Cyl pos={[0, 0.40, 0]} args={[0.14, 0.16, 0.10, 8]} color={a} roughness={0.4} />
      {/* Torso */}
      <Box pos={[0, 0.58, 0]} size={[0.38, 0.32, 0.25]} color={a} roughness={0.4} />
      {/* Chest panel */}
      <Box pos={[0, 0.59, 0.13]} size={[0.22, 0.22, 0.02]} color={p} roughness={0.15} metalness={0.85} />
      {/* Vent slits */}
      <Box pos={[0, 0.50, 0.13]} size={[0.18, 0.03, 0.02]} color={n} emissiveIntensity={1.4} />
      {/* Shoulder joints */}
      <Cyl pos={[-0.26, 0.64, 0]} args={[0.06, 0.06, 0.06, 8]} color={p} roughness={0.2} metalness={0.9} rotation={[0,0,Math.PI/2]} />
      <Cyl pos={[ 0.26, 0.64, 0]} args={[0.06, 0.06, 0.06, 8]} color={p} roughness={0.2} metalness={0.9} rotation={[0,0,Math.PI/2]} />
      {/* Shoulder pads */}
      <Box pos={[-0.27, 0.64, 0]} size={[0.13, 0.16, 0.22]} color={a} roughness={0.4} />
      <Box pos={[ 0.27, 0.64, 0]} size={[0.13, 0.16, 0.22]} color={a} roughness={0.4} />
      {/* Arm weapon — twin light cannons */}
      <Cyl pos={[-0.30, 0.56, 0.16]} args={[0.025, 0.025, 0.22, 6]} color={p} roughness={0.1} metalness={0.9} rotation={[Math.PI/2,0,0]} />
      <Sphere pos={[-0.30, 0.56, 0.28]} radius={0.028} color={n} emissiveIntensity={2.2} />
      {/* Neck */}
      <Cyl pos={[0, 0.75, 0]} args={[0.06, 0.08, 0.08, 8]} color={a} roughness={0.4} />
      {/* Head */}
      <Box pos={[0, 0.86, 0]} size={[0.26, 0.22, 0.22]} color={a} roughness={0.4} />
      {/* Antenna */}
      <Cyl pos={[0.08, 0.99, 0]} args={[0.008, 0.004, 0.14, 4]} color={p} roughness={0.2} metalness={0.9} />
      {/* Twin eyes */}
      <Sphere pos={[-0.07, 0.87, 0.12]} radius={0.048} color={n} emissiveIntensity={2.8} />
      <Sphere pos={[ 0.07, 0.87, 0.12]} radius={0.048} color={n} emissiveIntensity={2.8} />
    </group>
  );
}

function RexBody({ p, a, n }) {
  return (
    <group scale={[1.35, 1.35, 1.35]}>
      {/* Upper legs */}
      <Box pos={[-0.19, 0.30, 0]} size={[0.20, 0.28, 0.20]} color={a} roughness={0.6} />
      <Box pos={[ 0.19, 0.30, 0]} size={[0.20, 0.28, 0.20]} color={a} roughness={0.6} />
      {/* Knee joints */}
      <Cyl pos={[-0.19, 0.16, 0]} args={[0.10, 0.10, 0.08, 8]} color={p} roughness={0.15} metalness={0.95} />
      <Cyl pos={[ 0.19, 0.16, 0]} args={[0.10, 0.10, 0.08, 8]} color={p} roughness={0.15} metalness={0.95} />
      {/* Kneecaps */}
      <Box pos={[-0.19, 0.16, 0.11]} size={[0.16, 0.12, 0.06]} color={p} roughness={0.15} metalness={0.9} />
      <Box pos={[ 0.19, 0.16, 0.11]} size={[0.16, 0.12, 0.06]} color={p} roughness={0.15} metalness={0.9} />
      {/* Lower legs */}
      <Box pos={[-0.19, 0.04, 0]} size={[0.18, 0.20, 0.18]} color={a} roughness={0.6} />
      <Box pos={[ 0.19, 0.04, 0]} size={[0.18, 0.20, 0.18]} color={a} roughness={0.6} />
      {/* Feet — wide platform */}
      <Box pos={[-0.19,-0.06, 0.02]} size={[0.22, 0.08, 0.24]} color={p} roughness={0.4} metalness={0.7} />
      <Box pos={[ 0.19,-0.06, 0.02]} size={[0.22, 0.08, 0.24]} color={p} roughness={0.4} metalness={0.7} />
      {/* Hip block */}
      <Box pos={[0, 0.43, 0]} size={[0.36, 0.14, 0.26]} color={a} roughness={0.55} />
      {/* Wide torso */}
      <Box pos={[0, 0.65, 0]} size={[0.56, 0.42, 0.32]} color={a} roughness={0.55} />
      {/* Heavy chest plate */}
      <Box pos={[0, 0.66, 0.17]} size={[0.38, 0.30, 0.03]} color={p} roughness={0.12} metalness={0.95} />
      {/* Armour rivets */}
      <Cyl pos={[-0.14, 0.70, 0.20]} args={[0.025, 0.025, 0.04, 6]} color={p} roughness={0.1} metalness={1} />
      <Cyl pos={[ 0.14, 0.70, 0.20]} args={[0.025, 0.025, 0.04, 6]} color={p} roughness={0.1} metalness={1} />
      <Cyl pos={[0,    0.58, 0.20]} args={[0.025, 0.025, 0.04, 6]} color={p} roughness={0.1} metalness={1} />
      {/* Shoulder joints */}
      <Cyl pos={[-0.36, 0.70, 0]} args={[0.08, 0.08, 0.08, 8]} color={p} roughness={0.15} metalness={0.95} rotation={[0,0,Math.PI/2]} />
      <Cyl pos={[ 0.36, 0.70, 0]} args={[0.08, 0.08, 0.08, 8]} color={p} roughness={0.15} metalness={0.95} rotation={[0,0,Math.PI/2]} />
      {/* Shoulder pads — massive */}
      <Box pos={[-0.38, 0.71, 0]} size={[0.16, 0.24, 0.30]} color={a} roughness={0.55} />
      <Box pos={[ 0.38, 0.71, 0]} size={[0.16, 0.24, 0.30]} color={a} roughness={0.55} />
      {/* Neon shoulder strips */}
      <Box pos={[-0.38, 0.76, 0.16]} size={[0.12, 0.04, 0.02]} color={n} emissiveIntensity={2.2} />
      <Box pos={[ 0.38, 0.76, 0.16]} size={[0.12, 0.04, 0.02]} color={n} emissiveIntensity={2.2} />
      {/* Fist/arm — right side hammer arm */}
      <Box pos={[0.38, 0.56, 0.10]} size={[0.14, 0.12, 0.28]} color={p} roughness={0.2} metalness={0.9} />
      <Cyl pos={[0.38, 0.56, 0.26]} args={[0.08, 0.06, 0.08, 6]} color={p} roughness={0.1} metalness={0.95} rotation={[Math.PI/2,0,0]} />
      {/* Neck */}
      <Cyl pos={[0, 0.87, 0]} args={[0.08, 0.10, 0.08, 8]} color={a} roughness={0.5} />
      {/* Head — boxy */}
      <Box pos={[0, 0.96, 0]} size={[0.32, 0.24, 0.26]} color={a} roughness={0.5} />
      {/* Visor slit */}
      <Box pos={[0, 0.97, 0.14]} size={[0.24, 0.07, 0.02]} color={n} emissiveIntensity={2.8} />
      {/* Side vents */}
      <Box pos={[-0.17, 0.93, 0.13]} size={[0.04, 0.08, 0.02]} color={n} emissiveIntensity={1.5} />
      <Box pos={[ 0.17, 0.93, 0.13]} size={[0.04, 0.08, 0.02]} color={n} emissiveIntensity={1.5} />
    </group>
  );
}

function BoltBody({ p, a, n }) {
  return (
    <group scale={[1.3, 1.3, 1.3]}>
      {/* Slim upper legs */}
      <Box pos={[-0.13, 0.28, 0]} size={[0.12, 0.24, 0.12]} color={a} roughness={0.45} />
      <Box pos={[ 0.13, 0.28, 0]} size={[0.12, 0.24, 0.12]} color={a} roughness={0.45} />
      {/* Knee joints */}
      <Cyl pos={[-0.13, 0.16, 0]} args={[0.06, 0.06, 0.05, 8]} color={p} roughness={0.2} metalness={0.9} />
      <Cyl pos={[ 0.13, 0.16, 0]} args={[0.06, 0.06, 0.05, 8]} color={p} roughness={0.2} metalness={0.9} />
      {/* Lower legs */}
      <Box pos={[-0.13, 0.06, 0]} size={[0.10, 0.20, 0.10]} color={a} roughness={0.45} />
      <Box pos={[ 0.13, 0.06, 0]} size={[0.10, 0.20, 0.10]} color={a} roughness={0.45} />
      {/* Feet */}
      <Box pos={[-0.13,-0.04, 0.02]} size={[0.12, 0.06, 0.16]} color={p} roughness={0.3} metalness={0.8} />
      <Box pos={[ 0.13,-0.04, 0.02]} size={[0.12, 0.06, 0.16]} color={p} roughness={0.3} metalness={0.8} />
      {/* Hip */}
      <Cyl pos={[0, 0.40, 0]} args={[0.11, 0.13, 0.08, 8]} color={a} roughness={0.45} />
      {/* Torso — narrow */}
      <Box pos={[0, 0.58, 0]} size={[0.30, 0.32, 0.22]} color={a} roughness={0.45} />
      {/* Chest frame plate */}
      <Box pos={[0, 0.58, 0.12]} size={[0.20, 0.24, 0.02]} color={p} roughness={0.15} metalness={0.85} />
      {/* Energy cell slot */}
      <Box pos={[0, 0.50, 0.12]} size={[0.10, 0.05, 0.02]} color={n} emissiveIntensity={1.8} />
      {/* Shoulder joints */}
      <Cyl pos={[-0.22, 0.64, 0]} args={[0.055, 0.055, 0.05, 8]} color={p} roughness={0.2} metalness={0.9} rotation={[0,0,Math.PI/2]} />
      <Cyl pos={[ 0.22, 0.64, 0]} args={[0.055, 0.055, 0.05, 8]} color={p} roughness={0.2} metalness={0.9} rotation={[0,0,Math.PI/2]} />
      {/* Shoulder pads */}
      <Box pos={[-0.23, 0.65, 0]} size={[0.11, 0.14, 0.20]} color={a} roughness={0.45} />
      <Box pos={[ 0.23, 0.65, 0]} size={[0.11, 0.14, 0.20]} color={a} roughness={0.45} />
      {/* Sniper rifle — right shoulder mounted, long barrel */}
      <Box pos={[0.26, 0.68, 0.14]} size={[0.09, 0.09, 0.14]} color={p} roughness={0.1} metalness={0.95} />
      <Cyl pos={[0.26, 0.68, 0.34]} args={[0.032, 0.026, 0.40, 8]} color={p} roughness={0.1} metalness={0.95} rotation={[Math.PI/2,0,0]} />
      {/* Scope ring */}
      <Cyl pos={[0.26, 0.68, 0.22]} args={[0.048, 0.048, 0.04, 10]} color={p} roughness={0.1} metalness={1} rotation={[Math.PI/2,0,0]} />
      {/* Muzzle glow */}
      <Sphere pos={[0.26, 0.68, 0.55]} radius={0.03} color={n} emissiveIntensity={2.5} />
      {/* Neck */}
      <Cyl pos={[0, 0.75, 0]} args={[0.055, 0.065, 0.07, 8]} color={a} roughness={0.45} />
      {/* Head — sleek visor */}
      <Box pos={[0, 0.83, 0]} size={[0.24, 0.20, 0.20]} color={a} roughness={0.4} />
      {/* Wide visor */}
      <Box pos={[0, 0.84, 0.11]} size={[0.18, 0.08, 0.02]} color={n} emissiveIntensity={2.8} />
      {/* Antenna */}
      <Cyl pos={[-0.08, 0.95, 0]} args={[0.007, 0.003, 0.12, 4]} color={p} roughness={0.2} metalness={0.9} />
    </group>
  );
}

function NovaBody({ p, a, n }) {
  return (
    <group scale={[1.3, 1.3, 1.3]}>
      {/* Upper legs */}
      <Box pos={[-0.17, 0.28, 0]} size={[0.16, 0.26, 0.16]} color={a} roughness={0.5} />
      <Box pos={[ 0.17, 0.28, 0]} size={[0.16, 0.26, 0.16]} color={a} roughness={0.5} />
      {/* Knee joints */}
      <Cyl pos={[-0.17, 0.15, 0]} args={[0.08, 0.08, 0.07, 8]} color={p} roughness={0.2} metalness={0.85} />
      <Cyl pos={[ 0.17, 0.15, 0]} args={[0.08, 0.08, 0.07, 8]} color={p} roughness={0.2} metalness={0.85} />
      {/* Lower legs */}
      <Box pos={[-0.17, 0.05, 0]} size={[0.14, 0.20, 0.14]} color={a} roughness={0.5} />
      <Box pos={[ 0.17, 0.05, 0]} size={[0.14, 0.20, 0.14]} color={a} roughness={0.5} />
      {/* Feet */}
      <Box pos={[-0.17,-0.05, 0.02]} size={[0.16, 0.07, 0.20]} color={p} roughness={0.35} metalness={0.75} />
      <Box pos={[ 0.17,-0.05, 0.02]} size={[0.16, 0.07, 0.20]} color={p} roughness={0.35} metalness={0.75} />
      {/* Hip */}
      <Box pos={[0, 0.42, 0]} size={[0.30, 0.12, 0.24]} color={a} roughness={0.5} />
      {/* Torso — wider */}
      <Box pos={[0, 0.60, 0]} size={[0.44, 0.38, 0.28]} color={a} roughness={0.5} />
      {/* Med-cross emblem */}
      <Box pos={[0, 0.62, 0.15]} size={[0.05, 0.20, 0.02]} color={n} emissiveIntensity={2.2} />
      <Box pos={[0, 0.62, 0.15]} size={[0.20, 0.05, 0.02]} color={n} emissiveIntensity={2.2} />
      {/* Panel lines */}
      <Box pos={[0, 0.50, 0.15]} size={[0.28, 0.02, 0.02]} color={p} roughness={0.2} metalness={0.8} />
      {/* Shoulder joints */}
      <Cyl pos={[-0.30, 0.66, 0]} args={[0.07, 0.07, 0.07, 8]} color={p} roughness={0.2} metalness={0.85} rotation={[0,0,Math.PI/2]} />
      <Cyl pos={[ 0.30, 0.66, 0]} args={[0.07, 0.07, 0.07, 8]} color={p} roughness={0.2} metalness={0.85} rotation={[0,0,Math.PI/2]} />
      {/* Shoulder pads */}
      <Box pos={[-0.31, 0.67, 0]} size={[0.13, 0.20, 0.24]} color={a} roughness={0.5} />
      <Box pos={[ 0.31, 0.67, 0]} size={[0.13, 0.20, 0.24]} color={a} roughness={0.5} />
      {/* Repair arm — articulated */}
      <Box pos={[-0.34, 0.58, 0]} size={[0.10, 0.07, 0.07]} color={p} roughness={0.2} metalness={0.85} />
      <Cyl pos={[-0.34, 0.56, 0.12]} args={[0.03, 0.025, 0.20, 6]} color={p} roughness={0.15} metalness={0.9} rotation={[Math.PI/2,0,0]} />
      {/* Tool tip glow */}
      <Sphere pos={[-0.34, 0.56, 0.24]} radius={0.034} color={n} emissiveIntensity={2.4} />
      {/* Neck */}
      <Cyl pos={[0, 0.80, 0]} args={[0.07, 0.09, 0.08, 8]} color={a} roughness={0.5} />
      {/* Head */}
      <Box pos={[0, 0.89, 0]} size={[0.28, 0.22, 0.24]} color={a} roughness={0.4} />
      {/* Twin gold eyes */}
      <Sphere pos={[-0.07, 0.90, 0.13]} radius={0.052} color={n} emissiveIntensity={2.8} />
      <Sphere pos={[ 0.07, 0.90, 0.13]} radius={0.052} color={n} emissiveIntensity={2.8} />
      {/* Top sensor dome */}
      <mesh position={[0, 0.99, 0]} castShadow>
        <sphereGeometry args={[0.07, 8, 6, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color={p} roughness={0.2} metalness={0.85} />
      </mesh>
    </group>
  );
}

function VexBody({ p, a, n }) {
  return (
    <group scale={[1.35, 1.35, 1.35]}>
      {/* Upper legs */}
      <Box pos={[-0.18, 0.29, 0]} size={[0.18, 0.26, 0.18]} color={a} roughness={0.55} />
      <Box pos={[ 0.18, 0.29, 0]} size={[0.18, 0.26, 0.18]} color={a} roughness={0.55} />
      {/* Knee joints */}
      <Cyl pos={[-0.18, 0.16, 0]} args={[0.09, 0.09, 0.07, 8]} color={p} roughness={0.15} metalness={0.92} />
      <Cyl pos={[ 0.18, 0.16, 0]} args={[0.09, 0.09, 0.07, 8]} color={p} roughness={0.15} metalness={0.92} />
      {/* Lower legs */}
      <Box pos={[-0.18, 0.05, 0]} size={[0.16, 0.22, 0.16]} color={a} roughness={0.55} />
      <Box pos={[ 0.18, 0.05, 0]} size={[0.16, 0.22, 0.16]} color={a} roughness={0.55} />
      {/* Feet */}
      <Box pos={[-0.18,-0.06, 0.02]} size={[0.20, 0.08, 0.22]} color={p} roughness={0.4} metalness={0.8} />
      <Box pos={[ 0.18,-0.06, 0.02]} size={[0.20, 0.08, 0.22]} color={p} roughness={0.4} metalness={0.8} />
      {/* Hip */}
      <Box pos={[0, 0.42, 0]} size={[0.34, 0.12, 0.26]} color={a} roughness={0.5} />
      {/* Torso */}
      <Box pos={[0, 0.62, 0]} size={[0.48, 0.40, 0.30]} color={a} roughness={0.5} />
      {/* Chest plate */}
      <Box pos={[0, 0.64, 0.16]} size={[0.28, 0.26, 0.03]} color={p} roughness={0.15} metalness={0.9} />
      {/* Chest glow line */}
      <Box pos={[0, 0.52, 0.16]} size={[0.24, 0.03, 0.02]} color={n} emissiveIntensity={1.8} />
      {/* Shoulder joints */}
      <Cyl pos={[-0.33, 0.72, 0]} args={[0.08, 0.08, 0.08, 8]} color={p} roughness={0.15} metalness={0.92} rotation={[0,0,Math.PI/2]} />
      <Cyl pos={[ 0.33, 0.72, 0]} args={[0.08, 0.08, 0.08, 8]} color={p} roughness={0.15} metalness={0.92} rotation={[0,0,Math.PI/2]} />
      {/* Shoulder pads */}
      <Box pos={[-0.35, 0.72, 0]} size={[0.15, 0.22, 0.26]} color={a} roughness={0.5} />
      <Box pos={[ 0.35, 0.72, 0]} size={[0.15, 0.22, 0.26]} color={a} roughness={0.5} />
      {/* Missile pods — raised on shoulders */}
      <Box pos={[-0.35, 0.80, 0.10]} size={[0.15, 0.22, 0.20]} color={p} roughness={0.1} metalness={0.95} />
      <Box pos={[ 0.35, 0.80, 0.10]} size={[0.15, 0.22, 0.20]} color={p} roughness={0.1} metalness={0.95} />
      {/* Missile tubes — 4 per pod */}
      <Cyl pos={[-0.38, 0.84, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[-0.31, 0.84, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[-0.38, 0.76, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[-0.31, 0.76, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[ 0.38, 0.84, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[ 0.31, 0.84, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[ 0.38, 0.76, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[ 0.31, 0.76, 0.21]} args={[0.025, 0.025, 0.08, 6]} color={n} roughness={0.1} emissive={n} emissiveIntensity={2.2} rotation={[Math.PI/2,0,0]} />
      {/* Neck */}
      <Cyl pos={[0, 0.84, 0]} args={[0.07, 0.09, 0.08, 8]} color={a} roughness={0.5} />
      {/* Head */}
      <Box pos={[0, 0.93, 0]} size={[0.30, 0.22, 0.24]} color={a} roughness={0.45} />
      {/* Visor */}
      <Box pos={[0, 0.94, 0.13]} size={[0.22, 0.07, 0.02]} color={n} emissiveIntensity={2.8} />
    </group>
  );
}

function DroneAlphaBody({ p, a, n }) {
  return (
    <group scale={[1.3, 1.3, 1.3]}>
      {/* Spindly lower legs */}
      <Cyl pos={[-0.16, 0.14, 0]} args={[0.038, 0.045, 0.28, 6]} color={a} roughness={0.35} metalness={0.75} />
      <Cyl pos={[ 0.16, 0.14, 0]} args={[0.038, 0.045, 0.28, 6]} color={a} roughness={0.35} metalness={0.75} />
      {/* Foot claws */}
      <Cone pos={[-0.16,-0.02, 0.06]} args={[0.04, 0.10, 4]} color={p} roughness={0.1} metalness={0.95} rotation={[Math.PI/5,0,0]} />
      <Cone pos={[-0.16,-0.02,-0.06]} args={[0.04, 0.10, 4]} color={p} roughness={0.1} metalness={0.95} rotation={[-Math.PI/5,0,0]} />
      <Cone pos={[ 0.16,-0.02, 0.06]} args={[0.04, 0.10, 4]} color={p} roughness={0.1} metalness={0.95} rotation={[Math.PI/5,0,0]} />
      <Cone pos={[ 0.16,-0.02,-0.06]} args={[0.04, 0.10, 4]} color={p} roughness={0.1} metalness={0.95} rotation={[-Math.PI/5,0,0]} />
      {/* Knee servo joints */}
      <Cyl pos={[-0.16, 0.30, 0]} args={[0.055, 0.055, 0.05, 6]} color={p} roughness={0.1} metalness={0.95} />
      <Cyl pos={[ 0.16, 0.30, 0]} args={[0.055, 0.055, 0.05, 6]} color={p} roughness={0.1} metalness={0.95} />
      {/* Upper leg struts */}
      <Cyl pos={[-0.16, 0.40, 0]} args={[0.04, 0.05, 0.16, 6]} color={a} roughness={0.35} metalness={0.75} />
      <Cyl pos={[ 0.16, 0.40, 0]} args={[0.04, 0.05, 0.16, 6]} color={a} roughness={0.35} metalness={0.75} />
      {/* Body — compact hexagonal core */}
      <Cyl pos={[0, 0.54, 0]} args={[0.20, 0.22, 0.28, 6]} color={a} roughness={0.45} metalness={0.65} />
      {/* Body front panel */}
      <Box pos={[0, 0.54, 0.21]} size={[0.22, 0.20, 0.02]} color={p} roughness={0.1} metalness={0.92} />
      {/* Fixed side wing fins */}
      <Box pos={[-0.30, 0.54,-0.04]} size={[0.16, 0.05, 0.30]} color={p} roughness={0.1} metalness={0.95} />
      <Box pos={[ 0.30, 0.54,-0.04]} size={[0.16, 0.05, 0.30]} color={p} roughness={0.1} metalness={0.95} />
      {/* Fin tip glow */}
      <Sphere pos={[-0.40, 0.54, -0.04]} radius={0.03} color={n} emissiveIntensity={2.0} />
      <Sphere pos={[ 0.40, 0.54, -0.04]} radius={0.03} color={n} emissiveIntensity={2.0} />
      {/* Spinning top rotors */}
      <SpinningFins color={p} />
      {/* Neck strut */}
      <Cyl pos={[0, 0.70, 0]} args={[0.06, 0.07, 0.06, 6]} color={a} roughness={0.4} metalness={0.7} />
      {/* Dome sensor head */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={a} roughness={0.35} metalness={0.72} />
      </mesh>
      {/* Main eye sensor */}
      <Sphere pos={[0, 0.76, 0.16]} radius={0.07} color={n} emissiveIntensity={3.0} />
      {/* Side sensor dots */}
      <Sphere pos={[-0.10, 0.78, 0.12]} radius={0.025} color={n} emissiveIntensity={2.0} />
      <Sphere pos={[ 0.10, 0.78, 0.12]} radius={0.025} color={n} emissiveIntensity={2.0} />
    </group>
  );
}

function DroneHeavyBody({ p, a, n }) {
  return (
    <group scale={[1.4, 1.4, 1.4]}>
      {/* Thick upper legs */}
      <Box pos={[-0.21, 0.30, 0]} size={[0.22, 0.26, 0.22]} color={a} roughness={0.70} metalness={0.55} />
      <Box pos={[ 0.21, 0.30, 0]} size={[0.22, 0.26, 0.22]} color={a} roughness={0.70} metalness={0.55} />
      {/* Knee joint — heavy disc */}
      <Cyl pos={[-0.21, 0.17, 0]} args={[0.11, 0.11, 0.08, 8]} color={p} roughness={0.1} metalness={0.98} />
      <Cyl pos={[ 0.21, 0.17, 0]} args={[0.11, 0.11, 0.08, 8]} color={p} roughness={0.1} metalness={0.98} />
      {/* Lower legs */}
      <Box pos={[-0.21, 0.04, 0]} size={[0.20, 0.24, 0.20]} color={a} roughness={0.70} metalness={0.55} />
      <Box pos={[ 0.21, 0.04, 0]} size={[0.20, 0.24, 0.20]} color={a} roughness={0.70} metalness={0.55} />
      {/* Feet — wide reinforced */}
      <Box pos={[-0.21,-0.08, 0.02]} size={[0.26, 0.10, 0.28]} color={p} roughness={0.45} metalness={0.8} />
      <Box pos={[ 0.21,-0.08, 0.02]} size={[0.26, 0.10, 0.28]} color={p} roughness={0.45} metalness={0.8} />
      {/* Hip block */}
      <Box pos={[0, 0.44, 0]} size={[0.42, 0.16, 0.30]} color={a} roughness={0.65} metalness={0.55} />
      {/* Heavy torso */}
      <Box pos={[0, 0.68, 0]} size={[0.58, 0.44, 0.34]} color={a} roughness={0.65} metalness={0.55} />
      {/* Armour plates */}
      <Box pos={[0, 0.72, 0.18]} size={[0.40, 0.28, 0.03]} color={p} roughness={0.1} metalness={0.95} />
      {/* Bolt rivets */}
      <Cyl pos={[-0.16, 0.76, 0.22]} args={[0.028, 0.028, 0.04, 6]} color={p} roughness={0.05} metalness={1} />
      <Cyl pos={[ 0.00, 0.76, 0.22]} args={[0.028, 0.028, 0.04, 6]} color={p} roughness={0.05} metalness={1} />
      <Cyl pos={[ 0.16, 0.76, 0.22]} args={[0.028, 0.028, 0.04, 6]} color={p} roughness={0.05} metalness={1} />
      <Cyl pos={[-0.16, 0.62, 0.22]} args={[0.028, 0.028, 0.04, 6]} color={p} roughness={0.05} metalness={1} />
      <Cyl pos={[ 0.16, 0.62, 0.22]} args={[0.028, 0.028, 0.04, 6]} color={p} roughness={0.05} metalness={1} />
      {/* Shoulder mounts */}
      <Cyl pos={[-0.38, 0.74, 0]} args={[0.09, 0.09, 0.09, 8]} color={p} roughness={0.1} metalness={0.95} rotation={[0,0,Math.PI/2]} />
      <Cyl pos={[ 0.38, 0.74, 0]} args={[0.09, 0.09, 0.09, 8]} color={p} roughness={0.1} metalness={0.95} rotation={[0,0,Math.PI/2]} />
      {/* Shoulder cannon housings */}
      <Box pos={[-0.42, 0.76, 0.08]} size={[0.14, 0.14, 0.20]} color={p} roughness={0.1} metalness={0.95} />
      <Box pos={[ 0.42, 0.76, 0.08]} size={[0.14, 0.14, 0.20]} color={p} roughness={0.1} metalness={0.95} />
      {/* Cannon barrels */}
      <Cyl pos={[-0.42, 0.76, 0.28]} args={[0.042, 0.036, 0.36, 8]} color={p} roughness={0.1} metalness={0.95} rotation={[Math.PI/2,0,0]} />
      <Cyl pos={[ 0.42, 0.76, 0.28]} args={[0.042, 0.036, 0.36, 8]} color={p} roughness={0.1} metalness={0.95} rotation={[Math.PI/2,0,0]} />
      {/* Muzzle glow */}
      <Sphere pos={[-0.42, 0.76, 0.48]} radius={0.045} color={n} emissiveIntensity={2.2} />
      <Sphere pos={[ 0.42, 0.76, 0.48]} radius={0.045} color={n} emissiveIntensity={2.2} />
      {/* Head — flat slab */}
      <Box pos={[0, 0.98, 0]} size={[0.42, 0.20, 0.28]} color={a} roughness={0.65} metalness={0.55} />
      {/* Forehead plate */}
      <Box pos={[0, 0.99, 0.15]} size={[0.28, 0.14, 0.03]} color={p} roughness={0.1} metalness={0.95} />
      {/* Visor — wide angry slit */}
      <Box pos={[0, 1.00, 0.19]} size={[0.30, 0.07, 0.02]} color={n} emissiveIntensity={2.8} />
      {/* Side vents */}
      <Box pos={[-0.22, 0.95, 0.14]} size={[0.05, 0.10, 0.02]} color={n} emissiveIntensity={1.4} />
      <Box pos={[ 0.22, 0.95, 0.14]} size={[0.05, 0.10, 0.02]} color={n} emissiveIntensity={1.4} />
    </group>
  );
}

const BODY_COMPONENTS = {
  zip:         ZipBody,
  rex:         RexBody,
  bolt:        BoltBody,
  nova:        NovaBody,
  vex:         VexBody,
  drone_alpha: DroneAlphaBody,
  drone_heavy: DroneHeavyBody,
};

// ── Animation state machine ─────────────────────────────────────────────────

const AnimState = {
  IDLE:   'idle',
  MOVE:   'move',
  HIT:    'hit',
  MISS:   'miss',
  DEATH:  'death',
  HEAL:   'heal',
  STEALTH:'stealth',
  OVERHEAT:'overheat',
};

/**
 * MechModel — renders one mech as a group of Box/Sphere primitives and exposes
 * an imperative animation API via a forwarded ref.
 *
 * The animation API object is also passed to `onAnimReady(id, api)` so
 * GameContext can store it without needing React refs from the parent.
 *
 * Props:
 *   mechId       string       — 'zip' | 'rex' | 'bolt' | 'nova' | 'vex' | 'drone_alpha' | 'drone_heavy'
 *   position     [x, y, z]   — world-space position (y = tile-top)
 *   alive        bool
 *   stealthed    bool
 *   onAnimReady  (id, api) => void
 *   onClick      (mechId) => void
 */
const MechModel = forwardRef(function MechModel(
  { mechId, position, alive, stealthed, onAnimReady, onClick },
  ref
) {
  const groupRef = useRef();
  const animRef = useRef({
    state: AnimState.IDLE,
    // move
    targetX: position[0], targetZ: position[2], startX: position[0], startZ: position[2], moveT: 0,
    // bob
    bobT: Math.random() * Math.PI * 2,
    // hit flash
    hitFlash: 0,
    // death
    deathT: 0,
    // opacity
    opacity: stealthed ? 0.3 : 1,
    // resolvers
    moveResolve: null,
    hitResolve: null,
    missResolve: null,
    deathResolve: null,
    healResolve: null,
    stealthResolve: null,
    overheatResolve: null,
  });

  // Strip unique-spawn suffix (e.g. 'drone_alpha_e0' → 'drone_alpha')
  const baseId = mechId.replace(/_e\d+$/, '');
  const palette = MECH_PALETTE[baseId] ?? MECH_PALETTE.zip;
  const BodyComponent = BODY_COMPONENTS[baseId] ?? ZipBody;

  // Expose animation API
  const api = {
    moveTo(x, z) {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.state = AnimState.MOVE;
        anim.startX = groupRef.current?.position.x ?? position[0];
        anim.startZ = groupRef.current?.position.z ?? position[2];
        anim.targetX = x;
        anim.targetZ = z;
        anim.moveT = 0;
        anim.moveResolve = resolve;
      });
    },
    playHitEffect(_damage, _opts) {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.hitFlash = 1;
        anim.hitResolve = resolve;
      });
    },
    playMissEffect() {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.state = AnimState.MISS;
        anim.missResolve = resolve;
      });
    },
    playDeathEffect() {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.state = AnimState.DEATH;
        anim.deathT = 0;
        anim.deathResolve = resolve;
      });
    },
    playHealEffect() {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.state = AnimState.HEAL;
        anim.healResolve = resolve;
      });
    },
    playStealthEffect() {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.state = AnimState.STEALTH;
        anim.stealthResolve = resolve;
      });
    },
    playOverheatEffect() {
      return new Promise(resolve => {
        const anim = animRef.current;
        anim.state = AnimState.OVERHEAT;
        anim.overheatResolve = resolve;
      });
    },
  };

  useImperativeHandle(ref, () => api);

  // Notify parent once
  React.useEffect(() => {
    onAnimReady?.(mechId, api);
  }, [mechId]); // eslint-disable-line

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const anim = animRef.current;

    // ── Idle bob ──────────────────────────────────────────────────────────
    if (anim.state === AnimState.IDLE) {
      anim.bobT += delta * 1.4;
      g.position.y = position[1] + Math.sin(anim.bobT) * 0.02;
    }

    // ── Move ──────────────────────────────────────────────────────────────
    if (anim.state === AnimState.MOVE) {
      anim.moveT = Math.min(1, anim.moveT + delta * 2.2);
      const t = easeInOutSine(anim.moveT);
      g.position.x = lerp(anim.startX, anim.targetX, t);
      g.position.z = lerp(anim.startZ, anim.targetZ, t);
      // Arc
      g.position.y = position[1] + Math.sin(anim.moveT * Math.PI) * 0.3;

      if (anim.moveT >= 1) {
        anim.state = AnimState.IDLE;
        try { anim.moveResolve?.(); } finally { anim.moveResolve = null; }
      }
    }

    // ── Hit flash ─────────────────────────────────────────────────────────
    if (anim.hitFlash > 0) {
      anim.hitFlash = Math.max(0, anim.hitFlash - delta * 4);
      if (anim.hitFlash <= 0) {
        try { anim.hitResolve?.(); } finally { anim.hitResolve = null; }
      }
    }

    // ── Death ─────────────────────────────────────────────────────────────
    if (anim.state === AnimState.DEATH) {
      anim.deathT = Math.min(1, anim.deathT + delta * 1.2);
      g.rotation.z = lerp(0, Math.PI / 2, easeInOutSine(anim.deathT));
      g.position.y = lerp(position[1], position[1] - 0.5, anim.deathT);
      g.scale.setScalar(lerp(1, 0.4, anim.deathT));
      if (anim.deathT >= 1) {
        g.visible = false;
        try { anim.deathResolve?.(); } finally { anim.deathResolve = null; }
      }
    }

    // ── Miss wobble ───────────────────────────────────────────────────────
    if (anim.state === AnimState.MISS) {
      anim.moveT = (anim.moveT ?? 0) + delta * 8;
      g.rotation.y = Math.sin(anim.moveT) * 0.15;
      if (anim.moveT > Math.PI) {
        anim.state = AnimState.IDLE;
        g.rotation.y = 0;
        anim.moveT = 0;
        try { anim.missResolve?.(); } finally { anim.missResolve = null; }
      }
    }

    // ── Heal pulse ────────────────────────────────────────────────────────
    if (anim.state === AnimState.HEAL) {
      anim.moveT = (anim.moveT ?? 0) + delta * 3;
      const s = 1 + Math.sin(anim.moveT * Math.PI) * 0.08;
      g.scale.setScalar(s);
      if (anim.moveT > 1) {
        anim.state = AnimState.IDLE;
        g.scale.setScalar(1);
        anim.moveT = 0;
        try { anim.healResolve?.(); } finally { anim.healResolve = null; }
      }
    }

    // ── Stealth fade ──────────────────────────────────────────────────────
    if (anim.state === AnimState.STEALTH) {
      anim.moveT = (anim.moveT ?? 0) + delta * 3;
      if (anim.moveT > 1) {
        anim.state = AnimState.IDLE;
        anim.moveT = 0;
        try { anim.stealthResolve?.(); } finally { anim.stealthResolve = null; }
      }
    }

    // ── Overheat shake ────────────────────────────────────────────────────
    if (anim.state === AnimState.OVERHEAT) {
      anim.moveT = (anim.moveT ?? 0) + delta * 10;
      g.position.x = (anim.targetX ?? position[0]) + Math.sin(anim.moveT * 3.7) * 0.04;
      if (anim.moveT > 1.2) {
        anim.state = AnimState.IDLE;
        g.position.x = anim.targetX ?? position[0];
        anim.moveT = 0;
        try { anim.overheatResolve?.(); } finally { anim.overheatResolve = null; }
      }
    }
  });

  if (!alive) return null;

  const opacity = stealthed ? 0.35 : 1;

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onClick={(e) => { e.stopPropagation(); onClick?.(mechId); }}
    >
      <BodyComponent
        p={palette.frame}
        a={palette.armor}
        n={palette.neon}
        opacity={opacity}
      />
    </group>
  );
});

export default MechModel;
