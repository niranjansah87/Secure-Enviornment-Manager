"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function TerminalMesh() {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
      meshRef.current.rotation.x = Math.cos(state.clock.getElapsedTime() * 0.4) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.4;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={meshRef}>
        {/* Monolith Hologram Slab */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.6, 1.8, 0.15]} />
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.9}
            roughness={0.2}
            emissive="#1e293b"
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Screen Outline Glow */}
        <mesh position={[0, 0, 0.09]}>
          <planeGeometry args={[2.4, 1.6]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.35} />
        </mesh>

        {/* Floating Halo Ring */}
        <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[1.9, 0.03, 16, 64]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#4f46e5"
            emissiveIntensity={0.8}
            metalness={0.9}
          />
        </mesh>
      </group>
    </Float>
  );
}

export function Docs3DAnimation() {
  return (
    <div className="w-full h-full min-h-[420px] relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 6, 5]} intensity={2.2} color="#bae6fd" />
        <pointLight position={[-5, -4, 4]} intensity={1.8} color="#6366f1" />
        <TerminalMesh />
      </Canvas>
    </div>
  );
}

export default Docs3DAnimation;

