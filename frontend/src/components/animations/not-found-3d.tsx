"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Center, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function CyberShard() {
  const groupRef = useRef<THREE.Group>(null);
  const shardRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.2;
    }
    if (shardRef.current) {
      shardRef.current.rotation.y += 0.01;
      shardRef.current.rotation.z += 0.005;
    }
    if (innerRef.current) {
      const pulse = 1 + Math.sin(time * 4) * 0.2;
      innerRef.current.scale.set(pulse, pulse, pulse);
    }
    if (ring1Ref.current) ring1Ref.current.rotation.x += 0.015;
    if (ring2Ref.current) ring2Ref.current.rotation.y += 0.01;
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Center>
          {/* Main Crystal Shard */}
          <mesh ref={shardRef}>
            <icosahedronGeometry args={[1.5, 0]} />
            <meshStandardMaterial 
              color="#1a1a1a" 
              roughness={0.1} 
              metalness={0.9} 
              transparent 
              opacity={0.6}
            />
          </mesh>

          {/* Wireframe Overlay */}
          <mesh ref={shardRef} scale={[1.02, 1.02, 1.02]}>
            <icosahedronGeometry args={[1.5, 0]} />
            <meshStandardMaterial 
              color="#8b5cf6" 
              wireframe 
              emissive="#8b5cf6" 
              emissiveIntensity={2} 
            />
          </mesh>

          {/* Pulsing Core */}
          <mesh ref={innerRef}>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={10} />
          </mesh>

          {/* Orbiting Rings */}
          <group ref={ring1Ref}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[2.2, 0.02, 16, 100]} />
              <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
            </mesh>
          </group>
          <group ref={ring2Ref}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[2.6, 0.01, 16, 100]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
            </mesh>
          </group>

          {/* Point lights for inner glow effects */}
          <pointLight color="#8b5cf6" distance={5} intensity={5} />
        </Center>
      </Float>
    </group>
  );
}




function Particles() {
  const count = 100;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#8b5cf6" transparent opacity={0.6} />
    </points>
  );
}

export function NotFound3DAnimation() {
  return (
    <div className="absolute inset-0 z-0 bg-[#020617] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#8b5cf6" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1.5} />
        <CyberShard />
        <Particles />



        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      
      {/* Overlay Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]" />
    </div>
  );
}
