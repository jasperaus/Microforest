import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
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

const TILE_H = 0.15; // grass tile height, mech stands on top

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

function Sphere({ pos, radius, color, emissiveIntensity = 0 }) {
  return (
    <mesh position={pos} castShadow>
      <sphereGeometry args={[radius, 8, 8]} />
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

// ── Mech body shapes (one per id) ───────────────────────────────────────────

function ZipBody({ p, a, n }) {
  return (
    <group>
      {/* Legs */}
      <Box pos={[-0.14, 0.18, 0]} size={[0.13, 0.36, 0.13]} color={a} />
      <Box pos={[ 0.14, 0.18, 0]} size={[0.13, 0.36, 0.13]} color={a} />
      {/* Shin neon stripe */}
      <Box pos={[-0.14, 0.12, 0.07]} size={[0.06, 0.1, 0.02]} color={n} emissiveIntensity={2} />
      <Box pos={[ 0.14, 0.12, 0.07]} size={[0.06, 0.1, 0.02]} color={n} emissiveIntensity={2} />
      {/* Torso */}
      <Box pos={[0, 0.54, 0]} size={[0.36, 0.34, 0.24]} color={a} />
      {/* Frame accent */}
      <Box pos={[0, 0.54, 0.13]} size={[0.20, 0.22, 0.02]} color={p} roughness={0.2} metalness={0.8} />
      {/* Shoulders */}
      <Box pos={[-0.24, 0.62, 0]} size={[0.12, 0.16, 0.2]} color={a} />
      <Box pos={[ 0.24, 0.62, 0]} size={[0.12, 0.16, 0.2]} color={a} />
      {/* Head */}
      <Box pos={[0, 0.82, 0]} size={[0.24, 0.2, 0.2]} color={a} />
      {/* Twin cyan eyes */}
      <Sphere pos={[-0.07, 0.84, 0.11]} radius={0.045} color={n} emissiveIntensity={2.5} />
      <Sphere pos={[ 0.07, 0.84, 0.11]} radius={0.045} color={n} emissiveIntensity={2.5} />
    </group>
  );
}

function RexBody({ p, a, n }) {
  return (
    <group>
      {/* Heavy legs */}
      <Box pos={[-0.18, 0.22, 0]} size={[0.18, 0.44, 0.18]} color={a} />
      <Box pos={[ 0.18, 0.22, 0]} size={[0.18, 0.44, 0.18]} color={a} />
      {/* Kneepads */}
      <Box pos={[-0.18, 0.28, 0.10]} size={[0.14, 0.12, 0.06]} color={p} roughness={0.2} metalness={0.9} />
      <Box pos={[ 0.18, 0.28, 0.10]} size={[0.14, 0.12, 0.06]} color={p} roughness={0.2} metalness={0.9} />
      {/* Wide torso */}
      <Box pos={[0, 0.62, 0]} size={[0.52, 0.40, 0.30]} color={a} />
      {/* Chest plate */}
      <Box pos={[0, 0.64, 0.16]} size={[0.34, 0.28, 0.02]} color={p} roughness={0.15} metalness={0.9} />
      {/* Shoulder pads — large */}
      <Box pos={[-0.34, 0.70, 0]} size={[0.14, 0.22, 0.28]} color={a} />
      <Box pos={[ 0.34, 0.70, 0]} size={[0.14, 0.22, 0.28]} color={a} />
      {/* Head */}
      <Box pos={[0, 0.90, 0]} size={[0.30, 0.22, 0.24]} color={a} />
      {/* Visor slit */}
      <Box pos={[0, 0.91, 0.13]} size={[0.22, 0.06, 0.02]} color={n} emissiveIntensity={2.5} />
      {/* Neon shoulder strips */}
      <Box pos={[-0.34, 0.74, 0.14]} size={[0.10, 0.04, 0.02]} color={n} emissiveIntensity={2} />
      <Box pos={[ 0.34, 0.74, 0.14]} size={[0.10, 0.04, 0.02]} color={n} emissiveIntensity={2} />
    </group>
  );
}

function BoltBody({ p, a, n }) {
  return (
    <group>
      {/* Slim legs */}
      <Box pos={[-0.13, 0.20, 0]} size={[0.12, 0.40, 0.12]} color={a} />
      <Box pos={[ 0.13, 0.20, 0]} size={[0.12, 0.40, 0.12]} color={a} />
      {/* Torso */}
      <Box pos={[0, 0.56, 0]} size={[0.32, 0.36, 0.22]} color={a} />
      {/* Frame */}
      <Box pos={[0, 0.56, 0.12]} size={[0.22, 0.26, 0.02]} color={p} roughness={0.2} metalness={0.8} />
      {/* Sniper scope barrel on right shoulder */}
      <Box pos={[0.28, 0.66, 0.22]} size={[0.06, 0.06, 0.36]} color={p} roughness={0.1} metalness={0.9} />
      <Box pos={[0.28, 0.66, 0.40]} size={[0.10, 0.10, 0.04]} color={p} roughness={0.1} metalness={0.9} />
      {/* Shoulder pads */}
      <Box pos={[-0.22, 0.64, 0]} size={[0.10, 0.14, 0.18]} color={a} />
      <Box pos={[ 0.22, 0.64, 0]} size={[0.10, 0.14, 0.18]} color={a} />
      {/* Head — visor-style */}
      <Box pos={[0, 0.82, 0]} size={[0.22, 0.18, 0.18]} color={a} />
      <Box pos={[0, 0.83, 0.10]} size={[0.16, 0.08, 0.02]} color={n} emissiveIntensity={2.5} />
    </group>
  );
}

function NovaBody({ p, a, n }) {
  return (
    <group>
      {/* Legs */}
      <Box pos={[-0.16, 0.20, 0]} size={[0.15, 0.40, 0.15]} color={a} />
      <Box pos={[ 0.16, 0.20, 0]} size={[0.15, 0.40, 0.15]} color={a} />
      {/* Torso — wider mid */}
      <Box pos={[0, 0.56, 0]} size={[0.42, 0.38, 0.26]} color={a} />
      {/* Med-cross emblem */}
      <Box pos={[0, 0.58, 0.14]} size={[0.04, 0.18, 0.02]} color={n} emissiveIntensity={2} />
      <Box pos={[0, 0.58, 0.14]} size={[0.18, 0.04, 0.02]} color={n} emissiveIntensity={2} />
      {/* Repair arm on left */}
      <Box pos={[-0.30, 0.54, 0.06]} size={[0.10, 0.06, 0.28]} color={p} roughness={0.2} metalness={0.8} />
      {/* Shoulder pads */}
      <Box pos={[-0.28, 0.66, 0]} size={[0.12, 0.18, 0.22]} color={a} />
      <Box pos={[ 0.28, 0.66, 0]} size={[0.12, 0.18, 0.22]} color={a} />
      {/* Head */}
      <Box pos={[0, 0.84, 0]} size={[0.26, 0.20, 0.22]} color={a} />
      {/* Twin gold eyes */}
      <Sphere pos={[-0.07, 0.86, 0.12]} radius={0.05} color={n} emissiveIntensity={2.5} />
      <Sphere pos={[ 0.07, 0.86, 0.12]} radius={0.05} color={n} emissiveIntensity={2.5} />
    </group>
  );
}

function VexBody({ p, a, n }) {
  return (
    <group>
      {/* Legs */}
      <Box pos={[-0.17, 0.22, 0]} size={[0.16, 0.44, 0.16]} color={a} />
      <Box pos={[ 0.17, 0.22, 0]} size={[0.16, 0.44, 0.16]} color={a} />
      {/* Torso */}
      <Box pos={[0, 0.60, 0]} size={[0.46, 0.40, 0.28]} color={a} />
      {/* Missile pods on shoulders */}
      <Box pos={[-0.32, 0.72, 0.08]} size={[0.14, 0.20, 0.18]} color={p} roughness={0.1} metalness={0.9} />
      <Box pos={[ 0.32, 0.72, 0.08]} size={[0.14, 0.20, 0.18]} color={p} roughness={0.1} metalness={0.9} />
      {/* Missile tube holes — neon glow */}
      <Box pos={[-0.32, 0.76, 0.18]} size={[0.08, 0.04, 0.02]} color={n} emissiveIntensity={2} />
      <Box pos={[-0.32, 0.68, 0.18]} size={[0.08, 0.04, 0.02]} color={n} emissiveIntensity={2} />
      <Box pos={[ 0.32, 0.76, 0.18]} size={[0.08, 0.04, 0.02]} color={n} emissiveIntensity={2} />
      <Box pos={[ 0.32, 0.68, 0.18]} size={[0.08, 0.04, 0.02]} color={n} emissiveIntensity={2} />
      {/* Head */}
      <Box pos={[0, 0.90, 0]} size={[0.28, 0.20, 0.22]} color={a} />
      <Box pos={[0, 0.91, 0.12]} size={[0.20, 0.06, 0.02]} color={n} emissiveIntensity={2.5} />
    </group>
  );
}

function DroneAlphaBody({ p, a, n }) {
  return (
    <group>
      {/* Thin spindly legs */}
      <Box pos={[-0.14, 0.18, 0]} size={[0.08, 0.36, 0.08]} color={a} metalness={0.7} />
      <Box pos={[ 0.14, 0.18, 0]} size={[0.08, 0.36, 0.08]} color={a} metalness={0.7} />
      {/* Compact body */}
      <Box pos={[0, 0.52, 0]} size={[0.30, 0.30, 0.22]} color={a} roughness={0.5} metalness={0.6} />
      {/* Wing fins */}
      <Box pos={[-0.28, 0.58, -0.06]} size={[0.14, 0.06, 0.28]} color={p} roughness={0.1} metalness={0.9} />
      <Box pos={[ 0.28, 0.58, -0.06]} size={[0.14, 0.06, 0.28]} color={p} roughness={0.1} metalness={0.9} />
      {/* Dome head */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <sphereGeometry args={[0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={a} roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Eye — single large sensor */}
      <Sphere pos={[0, 0.72, 0.14]} radius={0.06} color={n} emissiveIntensity={2.5} />
    </group>
  );
}

function DroneHeavyBody({ p, a, n }) {
  return (
    <group>
      {/* Thick legs */}
      <Box pos={[-0.20, 0.24, 0]} size={[0.20, 0.48, 0.20]} color={a} roughness={0.7} metalness={0.5} />
      <Box pos={[ 0.20, 0.24, 0]} size={[0.20, 0.48, 0.20]} color={a} roughness={0.7} metalness={0.5} />
      {/* Heavy torso */}
      <Box pos={[0, 0.66, 0]} size={[0.54, 0.42, 0.32]} color={a} roughness={0.7} metalness={0.5} />
      {/* Armour plating bolts row */}
      <Box pos={[-0.16, 0.70, 0.17]} size={[0.06, 0.06, 0.02]} color={p} roughness={0.1} metalness={1} />
      <Box pos={[ 0.00, 0.70, 0.17]} size={[0.06, 0.06, 0.02]} color={p} roughness={0.1} metalness={1} />
      <Box pos={[ 0.16, 0.70, 0.17]} size={[0.06, 0.06, 0.02]} color={p} roughness={0.1} metalness={1} />
      {/* Shoulder cannons */}
      <Box pos={[-0.36, 0.74, 0.12]} size={[0.10, 0.10, 0.34]} color={p} roughness={0.1} metalness={0.9} />
      <Box pos={[ 0.36, 0.74, 0.12]} size={[0.10, 0.10, 0.34]} color={p} roughness={0.1} metalness={0.9} />
      {/* Muzzle glow */}
      <Sphere pos={[-0.36, 0.74, 0.30]} radius={0.04} color={n} emissiveIntensity={1.8} />
      <Sphere pos={[ 0.36, 0.74, 0.30]} radius={0.04} color={n} emissiveIntensity={1.8} />
      {/* Flat slab head */}
      <Box pos={[0, 0.96, 0]} size={[0.38, 0.18, 0.26]} color={a} roughness={0.7} metalness={0.5} />
      <Box pos={[0, 0.97, 0.14]} size={[0.26, 0.06, 0.02]} color={n} emissiveIntensity={2.5} />
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
