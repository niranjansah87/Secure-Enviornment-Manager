"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function PipelineNodes() {
  const groupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Points>(null);

  const particleCount = 200;
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      // Line from x = -3 to x = 3 with jitter
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      spd[i] = 1.0 + Math.random() * 2.0;
    }
    return [pos, spd];
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.15;
    }
    if (streamRef.current) {
      const geo = streamRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let x = posAttr.getX(i);
        x += speeds[i] * delta * 1.2;
        if (x > 3.2) {
          x = -3.2;
        }
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    }
  });

  const stages = [
    { x: -2.4, color: "#60a5fa", label: "Dev" },
    { x: -1.2, color: "#38bdf8", label: "Proj" },
    { x: 0, color: "#818cf8", label: "Vault" },
    { x: 1.2, color: "#a78bfa", label: "Env" },
    { x: 2.4, color: "#34d399", label: "App" },
  ];

  return (
    <Float speed={2} rotationIntensity={0.15} floatIntensity={0.3}>
      <group ref={groupRef}>
        {/* Connecting Conduit Tube */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 5.2, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.6}
            metalness={0.9}
            roughness={0.2}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* 5 Stage Gate Rings */}
        {stages.map((st, i) => (
          <group key={i} position={[st.x, 0, 0]}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.65, 0.05, 16, 32]} />
              <meshStandardMaterial
                color={st.color}
                emissive={st.color}
                emissiveIntensity={0.8}
                metalness={0.8}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial
                color={st.color}
                emissive={st.color}
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        ))}

        {/* Secret Data Packets Stream */}
        <points ref={streamRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.06}
            color="#93c5fd"
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </Float>
  );
}

export function Workflow3DAnimation() {
  return (
    <div className="w-full h-full min-h-[440px] relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 6, 5]} intensity={2.4} color="#bae6fd" />
        <pointLight position={[-5, -3, 3]} intensity={1.8} color="#6366f1" />
        <PipelineNodes />
      </Canvas>
    </div>
  );
}

export default Workflow3DAnimation;

