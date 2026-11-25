'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function NebulaField() {
  const pointsRef = useRef<THREE.Points>(null);
  const ringsRef = useRef<THREE.Group>(null);

  const { positions, colors } = useMemo(() => {
    const count = 1400;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color('#ff3b30');
    const c2 = new THREE.Color('#f97316');
    const c3 = new THREE.Color('#38bdf8');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 1.4 + Math.random() * 4.2;
      const spinAngle = radius * 1.6;
      const branchAngle = ((i % 3) * (Math.PI * 2)) / 3;

      const rx = (Math.random() - 0.5) * 0.75;
      const ry = (Math.random() - 0.5) * 0.65;
      const rz = (Math.random() - 0.5) * 0.75;

      pos[i3] = Math.cos(branchAngle + spinAngle) * radius + rx;
      pos[i3 + 1] = ry * 1.4;
      pos[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rz;

      const mix = i % 5 === 0 ? c3 : c1.clone().lerp(c2, radius / 5.6);
      col[i3] = mix.r;
      col[i3 + 1] = mix.g;
      col[i3 + 2] = mix.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.065;
      pointsRef.current.rotation.x = THREE.MathUtils.lerp(
        pointsRef.current.rotation.x,
        state.pointer.y * 0.18 + 0.25,
        0.05
      );
      pointsRef.current.rotation.z = THREE.MathUtils.lerp(
        pointsRef.current.rotation.z,
        -state.pointer.x * 0.14,
        0.05
      );
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.z += delta * 0.12;
      ringsRef.current.rotation.y -= delta * 0.08;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.042}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <Float speed={1.5} floatIntensity={0.3}>
        <group ref={ringsRef}>
          <mesh rotation={[Math.PI / 2.6, 0.2, 0]}>
            <torusGeometry args={[2.2, 0.012, 16, 120]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.35} />
          </mesh>
          <mesh rotation={[-Math.PI / 3.2, -0.3, 0]}>
            <torusGeometry args={[2.8, 0.008, 16, 120]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} />
          </mesh>
        </group>
      </Float>

      <Sparkles count={70} scale={9} size={1.8} speed={0.35} color="#fb923c" />
    </group>
  );
}

export function NebulaParticleHero() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Canvas camera={{ position: [0, 1.4, 6.2], fov: 48 }} dpr={[1, 1.75]}>
        <NebulaField />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-[#05060a]/30 via-transparent to-[#05060a]" />
    </div>
  );
}
