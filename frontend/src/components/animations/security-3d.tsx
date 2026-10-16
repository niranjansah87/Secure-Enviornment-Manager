"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function VaultDial() {
  const outerRingRef = useRef<THREE.Group>(null);
  const midRingRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const spokesGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = Math.sin(t * 0.4) * 0.3 + t * 0.15;
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.z = -t * 0.25;
      midRingRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }
    if (spokesGroupRef.current) {
      spokesGroupRef.current.rotation.z = t * 0.3;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.6;
      coreRef.current.rotation.x += delta * 0.3;
    }
  });

  // Generate vault gear teeth / notched pins
  const teeth = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 2.4;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rot: angle,
      };
    });
  }, []);

  return (
    <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.4}>
      <group position={[0, 0, 0]}>
        {/* Outer Heavy Steel Gear Ring */}
        <group ref={outerRingRef}>
          <mesh>
            <torusGeometry args={[2.4, 0.08, 16, 64]} />
            <meshStandardMaterial
              color="#38bdf8"
              metalness={0.9}
              roughness={0.2}
              emissive="#0284c7"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Notched Teeth on Vault Rim */}
          {teeth.map((t, i) => (
            <mesh key={i} position={[t.x, t.y, 0]} rotation={[0, 0, t.rot]}>
              <boxGeometry args={[0.08, 0.18, 0.12]} />
              <meshStandardMaterial
                color="#60a5fa"
                metalness={0.8}
                roughness={0.3}
                emissive="#2563eb"
                emissiveIntensity={0.4}
              />
            </mesh>
          ))}
        </group>

        {/* Middle Cyan Gyroscopic Ring */}
        <group ref={midRingRef}>
          <mesh>
            <torusGeometry args={[1.8, 0.05, 16, 48]} />
            <meshStandardMaterial
              color="#818cf8"
              metalness={0.85}
              roughness={0.2}
              emissive="#4f46e5"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>

        {/* Spokes wheel */}
        <group ref={spokesGroupRef}>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <mesh key={deg} rotation={[0, 0, (deg * Math.PI) / 180]}>
              <cylinderGeometry args={[0.02, 0.02, 3.4, 8]} />
              <meshStandardMaterial
                color="#93c5fd"
                metalness={0.9}
                roughness={0.2}
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>

        {/* Center Holographic Vault Core */}
        <mesh ref={coreRef}>
          <octahedronGeometry args={[0.75, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            metalness={0.9}
            roughness={0.1}
            emissive="#0284c7"
            emissiveIntensity={0.8}
          />
        </mesh>

        {/* Internal Glow Sphere */}
        <mesh>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

function DataParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 300;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 3.5;
      const z = (Math.random() - 0.5) * 2;

      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.sin(theta) * r;
      pos[i * 3 + 2] = z;

      // Color gradation (cyan to indigo)
      col[i * 3] = 0.2 + Math.random() * 0.3;
      col[i * 3 + 1] = 0.6 + Math.random() * 0.4;
      col[i * 3 + 2] = 1.0;
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.z = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
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
        size={0.045}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Security3DAnimation() {
  return (
    <div className="w-full h-full min-h-[420px] relative pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={2.2} color="#bae6fd" />
        <pointLight position={[-6, -4, 4]} intensity={1.8} color="#6366f1" />
        <pointLight position={[0, 0, 2]} intensity={2.0} color="#38bdf8" />

        <VaultDial />
        <DataParticles />
      </Canvas>
    </div>
  );
}

export default Security3DAnimation;
