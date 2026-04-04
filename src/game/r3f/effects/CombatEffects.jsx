import React, { useState, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

let effectIdCounter = 0;

// ── Impact ring — expanding ring that fades out ──────────────────────────────
function ImpactRing({ position, color = '#ff4444', onDone }) {
  const ref = useRef();
  const matRef = useRef();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 3;
    if (t.current >= 1) { onDone(); return; }
    if (ref.current) {
      const scale = 0.2 + t.current * 1.2;
      ref.current.scale.set(scale, scale, scale);
    }
    if (matRef.current) {
      matRef.current.opacity = 1 - t.current;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.5, 24]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={3}
        transparent
        opacity={1}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Muzzle flash — brief bright sphere ───────────────────────────────────────
function MuzzleFlash({ position, color = '#ffcc44', onDone }) {
  const ref = useRef();
  const matRef = useRef();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 6;
    if (t.current >= 1) { onDone(); return; }
    if (ref.current) {
      const s = 0.15 * (1 - t.current);
      ref.current.scale.set(s, s, s);
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = 5 * (1 - t.current);
      matRef.current.opacity = 1 - t.current;
    }
  });

  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.6, position[2]]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={5}
        transparent
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Floating damage number ───────────────────────────────────────────────────
function FloatingNumber({ position, value, color = '#ff4444', onDone }) {
  const ref = useRef();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 1.5;
    if (t.current >= 1) { onDone(); return; }
    if (ref.current) {
      ref.current.position.y = position[1] + 1.0 + t.current * 0.8;
      ref.current.material.opacity = 1 - t.current * t.current;
    }
  });

  return (
    <sprite ref={ref} position={[position[0], position[1] + 1.0, position[2]]} scale={[0.5, 0.25, 1]}>
      <spriteMaterial
        color={color}
        transparent
        opacity={1}
        depthWrite={false}
      />
    </sprite>
  );
}

// ── Heal pulse — expanding green ring ─────────────────────────────────────────
function HealPulse({ position, onDone }) {
  const ref = useRef();
  const matRef = useRef();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 2.5;
    if (t.current >= 1) { onDone(); return; }
    if (ref.current) {
      const scale = 0.3 + t.current * 0.8;
      ref.current.scale.set(scale, scale, scale);
    }
    if (matRef.current) {
      matRef.current.opacity = 0.8 * (1 - t.current);
    }
  });

  return (
    <mesh ref={ref} position={[position[0], position[1] + 0.3, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.6, 24]} />
      <meshStandardMaterial
        ref={matRef}
        color="#44ff44"
        emissive="#44ff44"
        emissiveIntensity={4}
        transparent
        opacity={0.8}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const EFFECT_COMPONENTS = {
  impact: ImpactRing,
  muzzle: MuzzleFlash,
  damage: FloatingNumber,
  heal: HealPulse,
};

/**
 * CombatEffects — manages transient VFX (impact rings, muzzle flashes, damage numbers).
 *
 * Usage: call `ctx.spawnEffect(type, position, options)` from game logic.
 * Pass the returned `spawnEffect` callback into GameContext via `onEffectReady`.
 */
export default function CombatEffects({ onEffectReady }) {
  const [effects, setEffects] = useState([]);

  const removeEffect = useCallback((id) => {
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  const spawnEffect = useCallback((type, position, options = {}) => {
    const id = ++effectIdCounter;
    setEffects(prev => [...prev, { id, type, position, options }]);
    // Auto-cleanup after 2 seconds as a safety net
    setTimeout(() => removeEffect(id), 2000);
  }, [removeEffect]);

  // Expose spawnEffect to parent
  React.useEffect(() => {
    onEffectReady?.(spawnEffect);
  }, [onEffectReady, spawnEffect]);

  return (
    <group>
      {effects.map(({ id, type, position, options }) => {
        const Comp = EFFECT_COMPONENTS[type];
        if (!Comp) return null;
        return (
          <Comp
            key={id}
            position={position}
            onDone={() => removeEffect(id)}
            {...options}
          />
        );
      })}
    </group>
  );
}
