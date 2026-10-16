"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function CloudIntegrationGrid() {
  const meshGroupRef = useRef<THREE.Group>(null);
  const cubeCount = 20;

  const positions = useMemo(() => {
    return Array.from({ length: cubeCount }).map((_, i) => {
      const u = (i / cubeCount) * Math.PI * 2;
      const v = ((i % 5) / 5) * Math.PI - Math.PI / 2;
      const r = 2.4;
      return [
        r * Math.cos(u) * Math.cos(v),
        r * Math.sin(v),
        r * Math.sin(u) * Math.cos(v),
      ] as [number, number, number];
    });
  }, []);

  useFrame((state, delta) => {
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.y += delta * 0.25;
      meshGroupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.15;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={meshGroupRef}>
        {/* Core Hub */}
        <mesh>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.7}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Orbiting Platform Connectors */}
        {positions.map((pos, idx) => (
          <group key={idx} position={pos}>
            <mesh>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial
                color={idx % 2 === 0 ? "#60a5fa" : "#818cf8"}
                emissive={idx % 2 === 0 ? "#2563eb" : "#4f46e5"}
                emissiveIntensity={0.7}
                metalness={0.8}
              />
            </mesh>
            {/* Fine laser line connecting to center */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([0, 0, 0, -pos[0], -pos[1], -pos[2]]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#38bdf8" transparent opacity={0.3} />
            </line>
          </group>
        ))}
      </group>
    </Float>
  );
}

export function Integrations3DAnimation() {
  return (
    <div className="w-full h-full min-h-[440px] relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 5]} intensity={2.2} color="#bae6fd" />
        <pointLight position={[-6, -4, 4]} intensity={2.0} color="#6366f1" />
        <CloudIntegrationGrid />
      </Canvas>
    </div>
  );
}

export default Integrations3DAnimation;

