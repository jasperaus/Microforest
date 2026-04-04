import React, { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

/**
 * CameraRig — positions the PerspectiveCamera in an isometric-style view and
 * provides a shake API that the GameContext can call.
 *
 * Features:
 *   - Subtle idle drift: camera orbits in a tiny circle (radius 0.15) for life
 *   - Death shake: up to 350ms, intensity 0.02
 *
 * Props:
 *   onShakeReady  (fn) — called with (shake) once mounted; GameContext stores it
 */

const BASE_X = 0;
const BASE_Y = 18;
const BASE_Z = 12;

const DRIFT_RADIUS = 0.15;
const DRIFT_SPEED = 0.4; // radians per second

export default function CameraRig({ onShakeReady }) {
  const { camera } = useThree();
  const shakeRef = useRef({ active: false, duration: 0, intensity: 0, elapsed: 0 });
  const timeRef = useRef(0);

  // Position camera once on mount
  useEffect(() => {
    camera.position.set(BASE_X, BASE_Y, BASE_Z);
    camera.lookAt(0, 0, 0);
    camera.fov = 37;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Shake implementation — supports up to 350ms duration, intensity up to 0.02
  const shake = useCallback((duration = 200, intensity = 0.02) => {
    shakeRef.current = { active: true, duration: Math.min(duration, 350), intensity, elapsed: 0 };
  }, []);

  useEffect(() => {
    onShakeReady?.(shake);
  }, [shake, onShakeReady]);

  useFrame((_, delta) => {
    // Accumulate time for idle drift
    timeRef.current += delta;
    const t = timeRef.current;

    // Idle drift offset — tiny circular orbit
    const driftX = Math.sin(t * DRIFT_SPEED) * DRIFT_RADIUS;
    const driftZ = Math.cos(t * DRIFT_SPEED) * DRIFT_RADIUS;

    const s = shakeRef.current;

    if (s.active) {
      s.elapsed += delta * 1000;
      const progress = s.elapsed / s.duration;

      if (progress >= 1) {
        s.active = false;
        // Snap back to base + drift only
        camera.position.set(BASE_X + driftX, BASE_Y, BASE_Z + driftZ);
        camera.lookAt(0, 0, 0);
        return;
      }

      const decay = 1 - progress;
      const ox = (Math.random() - 0.5) * 2 * s.intensity * 10 * decay;
      const oy = (Math.random() - 0.5) * 2 * s.intensity * 10 * decay;

      camera.position.set(BASE_X + driftX + ox, BASE_Y + oy, BASE_Z + driftZ);
      camera.lookAt(0, 0, 0);
    } else {
      // No shake — apply idle drift only
      camera.position.set(BASE_X + driftX, BASE_Y, BASE_Z + driftZ);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}
