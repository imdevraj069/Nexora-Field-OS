'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, Line, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface NodeDef {
  id: string;
  label: string;
  sub: string;
  pos: [number, number, number];
  color: string;
}

const NODES: NodeDef[] = [
  { id: 'pwa', label: 'Field PWA', sub: 'Offline-ready 5-tab dock', pos: [-2.1, 1.05, 0.4], color: '#ff3b30' },
  { id: 'shards', label: 'Shards S1–S3', sub: 'Isolated tenant Postgres', pos: [2.15, 0.95, -0.2], color: '#f97316' },
  { id: 'minio', label: '50 GB MinIO', sub: 'Signed-URL media vault', pos: [-1.85, -1.15, -0.35], color: '#0ea5e9' },
  { id: 'ai', label: 'Gemini 2.5 AI', sub: 'Voice-to-text & risk radar', pos: [1.95, -1.05, 0.45], color: '#10b981' },
];

function CommandCore({
  hovered,
  setHovered,
}: {
  hovered: string | null;
  setHovered: (id: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetX = state.pointer.y * 0.22;
      const targetY = state.pointer.x * 0.35;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.06);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.06);
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.38;
    if (ring2Ref.current) ring2Ref.current.rotation.z -= delta * 0.26;
  });

  const linePairs = useMemo(
    () =>
      NODES.map((n) => ({
        id: n.id,
        points: [
          [0, 0, 0] as [number, number, number],
          n.pos,
        ],
        color: n.color,
      })),
    []
  );

  return (
    <group ref={groupRef}>
      {/* Central Nexora Core */}
      <Float speed={2.2} rotationIntensity={0.35} floatIntensity={0.45}>
        <mesh
          onPointerOver={() => setHovered('core')}
          onPointerOut={() => setHovered(null)}
        >
          <icosahedronGeometry args={[0.78, 1]} />
          <meshStandardMaterial
            color={hovered === 'core' ? '#ff3b30' : '#f97316'}
            roughness={0.22}
            metalness={0.55}
            emissive="#ff3b30"
            emissiveIntensity={hovered === 'core' ? 0.55 : 0.28}
          />
        </mesh>

        <mesh ref={ring1Ref} rotation={[Math.PI / 2.4, 0.2, 0]}>
          <torusGeometry args={[1.28, 0.025, 16, 80]} />
          <meshStandardMaterial color="#f97316" metalness={0.6} roughness={0.25} />
        </mesh>

        <mesh ref={ring2Ref} rotation={[-Math.PI / 3, 0.4, 0]}>
          <torusGeometry args={[1.62, 0.018, 16, 80]} />
          <meshStandardMaterial color="#fb923c" metalness={0.5} roughness={0.3} transparent opacity={0.7} />
        </mesh>
      </Float>

      {/* Connection Splines */}
      {linePairs.map((lp) => (
        <Line
          key={lp.id}
          points={lp.points}
          color={hovered === lp.id ? lp.color : '#94a3b8'}
          lineWidth={hovered === lp.id ? 2.4 : 1.2}
          transparent
          opacity={hovered === lp.id ? 0.95 : 0.45}
        />
      ))}

      {/* Orbiting Architectural Nodes */}
      {NODES.map((node, idx) => {
        const isHovered = hovered === node.id;
        return (
          <Float key={node.id} speed={1.7 + idx * 0.2} floatIntensity={0.4}>
            <group position={node.pos}>
              <mesh
                scale={isHovered ? 1.22 : 1}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHovered(node.id);
                }}
                onPointerOut={() => setHovered(null)}
              >
                <dodecahedronGeometry args={[0.36, 0]} />
                <meshStandardMaterial
                  color={node.color}
                  roughness={0.25}
                  metalness={0.45}
                  emissive={node.color}
                  emissiveIntensity={isHovered ? 0.55 : 0.2}
                />
              </mesh>
              <Html distanceFactor={8} position={[0, -0.58, 0]} center>
                <div
                  className={`pointer-events-none whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-semibold shadow-lg transition-all ${
                    isHovered
                      ? 'bg-[#111318] text-white scale-105'
                      : 'bg-white/90 text-[#111318] border border-slate-200/80'
                  }`}
                >
                  <div>{node.label}</div>
                  {isHovered && <div className="text-[9px] font-normal text-orange-300">{node.sub}</div>}
                </div>
              </Html>
            </group>
          </Float>
        );
      })}

      <Sparkles count={42} scale={6} size={2.2} speed={0.45} color="#f97316" />
    </group>
  );
}

export function HeroScene3D() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative h-[380px] sm:h-[440px] lg:h-[500px] w-full rounded-[32px] glass-card overflow-hidden">
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-[#111318] shadow-sm border border-slate-200/70">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Interactive 3D Command Topology — Move cursor to inspect
      </div>

      <Canvas camera={{ position: [0, 0.2, 5.6], fov: 44 }} dpr={[1, 2]}>
        <ambientLight intensity={0.95} />
        <directionalLight position={[5, 6, 5]} intensity={1.45} color="#ffffff" />
        <pointLight position={[-4, -3, 3]} intensity={0.9} color="#ff3b30" />
        <CommandCore hovered={hovered} setHovered={setHovered} />
      </Canvas>
    </div>
  );
}
