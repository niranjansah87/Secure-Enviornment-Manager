"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function FloatingOrbs() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const count = 36;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const initialPositions = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.2 + Math.sin(i * 1.5) * 0.4;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.sin(i * 3) * 0.5,
        speed: 0.5 + (i % 5) * 0.2,
      };
    });
  }, [count]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.15;
      ringRef.current.rotation.x = Math.sin(t * 0.2) * 0.2;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.5;
      coreRef.current.rotation.x += delta * 0.2;
    }

    if (meshRef.current) {
      initialPositions.forEach((pos, i) => {
        const currentAngle = (i / count) * Math.PI * 2 + t * 0.2 * pos.speed;
        const currentRadius = 2.2 + Math.sin(t + i) * 0.2;
        dummy.position.set(
          Math.cos(currentAngle) * currentRadius,
          Math.sin(currentAngle) * currentRadius,
          pos.z + Math.cos(t * 2 + i) * 0.2
        );
        dummy.scale.setScalar(0.08 + Math.sin(t * 3 + i) * 0.03);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
      <group>
        {/* Central Icosahedron Crystal Core */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            metalness={0.8}
            roughness={0.15}
            emissive="#0284c7"
            emissiveIntensity={0.6}
            wireframe={false}
          />
        </mesh>

        {/* Outer Wireframe Ring */}
        <group ref={ringRef}>
          <mesh>
            <torusGeometry args={[2.5, 0.03, 16, 64]} />
            <meshStandardMaterial
              color="#818cf8"
              emissive="#4f46e5"
              emissiveIntensity={0.7}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[2.7, 0.02, 16, 64]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.4}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>

        {/* Orbiting Instanced Node Orbs */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#2563eb"
            emissiveIntensity={0.8}
            metalness={0.9}
            roughness={0.1}
          />
        </instancedMesh>
      </group>
    </Float>
  );
}

export function Features3DAnimation() {
  return (
    <div className="w-full h-full min-h-[460px] relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5.8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 8, 6]} intensity={2.5} color="#bae6fd" />
        <pointLight position={[-6, -4, 4]} intensity={2.0} color="#6366f1" />
        <pointLight position={[0, 0, 3]} intensity={2.2} color="#38bdf8" />
        <FloatingOrbs />
      </Canvas>
    </div>
  );
}

export default Features3DAnimation;

