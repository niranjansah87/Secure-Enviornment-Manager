"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function LockModel() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.5;
      ringRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer Rotating Shield/Data Ring */}
      <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.5, 0.02, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.3} />
      </mesh>
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        {/* Core Lock Body */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[1.6, 1.2, 0.4]} />
          <meshStandardMaterial color="#8b5cf6" wireframe={true} emissive="#6d28d9" emissiveIntensity={0.5} />
        </mesh>
        
        {/* Inner solid body for layering */}
        <mesh position={[0, -0.4, 0]} scale={[0.98, 0.98, 0.98]}>
          <boxGeometry args={[1.6, 1.2, 0.4]} />
          <meshStandardMaterial color="#0B0F19" opacity={0.8} transparent />
        </mesh>

        {/* Lock Shackle (top ring) */}
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.55, 0.1, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#a78bfa" wireframe={true} emissive="#8b5cf6" emissiveIntensity={0.8}/>
        </mesh>
        
        {/* Keyhole */}
        {/* Top circle of keyhole */}
        <mesh position={[0, -0.25, 0.21]}>
          <circleGeometry args={[0.15, 32]} />
          <meshBasicMaterial color="#c4b5fd" />
        </mesh>
        {/* Bottom triangle of keyhole */}
        <mesh position={[0, -0.48, 0.21]}>
          <coneGeometry args={[0.18, 0.4, 3]} />
          <meshBasicMaterial color="#c4b5fd" />
        </mesh>
      </Float>
    </group>
  );
}

export function Security3DAnimation() {
  return (
    <div className="absolute inset-0 z-0 bg-[#070b14] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={["#070b14"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#c4b5fd" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
        
        <LockModel />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1.5} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
