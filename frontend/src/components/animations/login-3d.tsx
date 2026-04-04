"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function KeyModel() {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= delta * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
    if (shellRef.current) {
      shellRef.current.rotation.x += delta * 0.2;
      shellRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group>
      {/* Outer Protective Wireframe Shell */}
      <mesh ref={shellRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[2.8, 1]} />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Floating Key */}
      <group ref={groupRef}>
        <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5}>
          {/* Key Head (Torus) */}
          <mesh position={[-1.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.15, 16, 32]} />
            <meshStandardMaterial color="#60a5fa" emissive="#2563eb" emissiveIntensity={0.6} />
          </mesh>
          
          {/* Key Shaft (Cylinder) */}
          <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 2.2, 16]} />
            <meshStandardMaterial color="#93c5fd" emissive="#3b82f6" emissiveIntensity={0.4} />
          </mesh>
          
          {/* Key Teeth 1 */}
          <mesh position={[0.8, -0.3, 0]}>
            <boxGeometry args={[0.2, 0.5, 0.1]} />
            <meshStandardMaterial color="#60a5fa" emissive="#2563eb" emissiveIntensity={0.5} />
          </mesh>

          {/* Key Teeth 2 */}
          <mesh position={[1.15, -0.25, 0]}>
            <boxGeometry args={[0.15, 0.4, 0.1]} />
            <meshStandardMaterial color="#60a5fa" emissive="#2563eb" emissiveIntensity={0.5} />
          </mesh>

          {/* Subtle glow inside the key head */}
          <mesh position={[-1.2, 0, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </mesh>
        </Float>
      </group>
    </group>
  );
}

export function Login3DAnimation() {
  return (
    <div className="absolute inset-0 z-0 bg-[#070b14] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={["#030712"]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#93c5fd" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        
        <KeyModel />
        {/* Slightly blue-tinted stars for login differentiation */}
        <Stars radius={100} depth={50} count={2500} factor={3} saturation={0.5} fade speed={1} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
}
