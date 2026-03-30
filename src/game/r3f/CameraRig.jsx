import React, { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

/**
 * CameraRig — positions the PerspectiveCamera in an isometric-style view and
 * provides a shake API that the GameContext can call.
 *
 * Props:
 *   onShakeReady  (fn) — called with (shake) once mounted; GameContext stores it
 */
export default function CameraRig({ onShakeReady }) {
  const { camera } = useThree();
  const shakeRef = useRef({ active: false, duration: 0, intensity: 0, elapsed: 0 });

  // Position camera once on mount
  useEffect(() => {
    camera.position.set(0, 18, 12);
    camera.lookAt(0, 0, 0);
    camera.fov = 37;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Shake implementation
  const shake = useCallback((duration = 200, intensity = 0.012) => {
    shakeRef.current = { active: true, duration, intensity, elapsed: 0 };
  }, []);

  useEffect(() => {
    onShakeReady?.(shake);
  }, [shake, onShakeReady]);

  useFrame((_, delta) => {
    const s = shakeRef.current;
    if (!s.active) return;

    s.elapsed += delta * 1000;
    const progress = s.elapsed / s.duration;

    if (progress >= 1) {
      s.active = false;
      // Restore camera to base position
      camera.position.set(0, 18, 12);
      camera.lookAt(0, 0, 0);
      return;
    }

    const decay = 1 - progress;
    const ox = (Math.random() - 0.5) * 2 * s.intensity * 10 * decay;
    const oy = (Math.random() - 0.5) * 2 * s.intensity * 10 * decay;

    camera.position.set(ox, 18 + oy, 12);
    camera.lookAt(0, 0, 0);
  });

  return null;
}
