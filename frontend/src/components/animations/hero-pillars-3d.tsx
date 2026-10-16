"use client";

import { useRef, useState, useEffect, MouseEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Lock, Users, Layers } from "lucide-react";

// --- 1. Minimalist Monochrome 3D Mini Scenes (Pure White & Silver Only) ---

// Pillar 1: Cryptographic Vault (Encrypted at rest)
function VaultMiniScene({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const currentSpeed = useRef(0.8);
  const currentScale = useRef(1);
  const currentEmissive = useRef(0.2);

  useFrame((_, delta) => {
    const targetSpeed = isHovered ? 2.4 : 0.8;
    const targetScale = isHovered ? 1.15 : 1.0;
    const targetEmissive = isHovered ? 0.75 : 0.2;

    currentSpeed.current = THREE.MathUtils.damp(currentSpeed.current, targetSpeed, 5, delta);
    currentScale.current = THREE.MathUtils.damp(currentScale.current, targetScale, 6, delta);
    currentEmissive.current = THREE.MathUtils.damp(currentEmissive.current, targetEmissive, 6, delta);

    if (groupRef.current) {
      groupRef.current.scale.setScalar(currentScale.current);
    }
    if (outerRef.current) {
      outerRef.current.rotation.x += delta * 0.35 * currentSpeed.current;
      outerRef.current.rotation.y += delta * 0.55 * currentSpeed.current;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.7 * currentSpeed.current;
      ringRef.current.rotation.x += delta * 0.3 * currentSpeed.current;
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = currentEmissive.current;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 1.1 * currentSpeed.current;
      coreRef.current.rotation.x += delta * 0.5 * currentSpeed.current;
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = currentEmissive.current + 0.15;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.15} floatIntensity={0.25}>
      <group ref={groupRef}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 3]} intensity={2.0} color="#ffffff" />
        <pointLight position={[-2, -2, -2]} intensity={0.5} color="#ffffff" />

        {/* Crisp White Wireframe Shell */}
        <mesh ref={outerRef}>
          <octahedronGeometry args={[1.35, 0]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={isHovered ? 0.55 : 0.28} />
        </mesh>

        {/* Polished Platinum/White Lock Torus */}
        <mesh ref={ringRef}>
          <torusGeometry args={[1.05, 0.075, 16, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.2}
            metalness={0.9}
            roughness={0.15}
          />
        </mesh>

        {/* Central Core Cube */}
        <mesh ref={coreRef}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.3}
            metalness={0.85}
            roughness={0.18}
          />
        </mesh>
      </group>
    </Float>
  );
}

// Pillar 2: Connected Nodes (Built for teams)
function TeamMiniScene({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const sat1Ref = useRef<THREE.Mesh>(null);
  const sat2Ref = useRef<THREE.Mesh>(null);
  const sat3Ref = useRef<THREE.Mesh>(null);

  const currentSpeed = useRef(0.8);
  const currentRadius = useRef(1.15);
  const currentEmissive = useRef(0.25);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const targetSpeed = isHovered ? 2.2 : 0.8;
    const targetRadius = isHovered ? 1.35 : 1.15;
    const targetEmissive = isHovered ? 0.7 : 0.25;

    currentSpeed.current = THREE.MathUtils.damp(currentSpeed.current, targetSpeed, 5, delta);
    currentRadius.current = THREE.MathUtils.damp(currentRadius.current, targetRadius, 6, delta);
    currentEmissive.current = THREE.MathUtils.damp(currentEmissive.current, targetEmissive, 6, delta);

    const speed = currentSpeed.current;
    const r = currentRadius.current;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.45 * speed;
    }
    if (coreRef.current) {
      coreRef.current.rotation.x = Math.sin(t * 1.5) * 0.2;
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = currentEmissive.current;
    }
    if (sat1Ref.current) {
      sat1Ref.current.position.set(
        Math.cos(t * speed) * r,
        Math.sin(t * speed * 1.2) * 0.4,
        Math.sin(t * speed) * r
      );
    }
    if (sat2Ref.current) {
      sat2Ref.current.position.set(
        Math.cos(t * speed + 2.09) * r,
        -Math.sin(t * speed * 1.2 + 2.09) * 0.4,
        Math.sin(t * speed + 2.09) * r
      );
    }
    if (sat3Ref.current) {
      sat3Ref.current.position.set(
        Math.cos(t * speed + 4.18) * r,
        Math.cos(t * speed * 1.2 + 4.18) * 0.45,
        Math.sin(t * speed + 4.18) * r
      );
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.15} floatIntensity={0.25}>
      <group ref={groupRef}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 3]} intensity={2.0} color="#ffffff" />
        <pointLight position={[-2, -2, -2]} intensity={0.5} color="#ffffff" />

        {/* Orbit track ring */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[1.15, 1.18, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={isHovered ? 0.38 : 0.18} side={THREE.DoubleSide} />
        </mesh>

        {/* Primary Leader Node */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.25}
            metalness={0.75}
            roughness={0.18}
          />
        </mesh>

        {/* Pure White Satellite Nodes */}
        <mesh ref={sat1Ref}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} />
        </mesh>
        <mesh ref={sat2Ref}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#e4e4e7" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
        <mesh ref={sat3Ref}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#d4d4d8" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

// Pillar 3: Layered Stack (Developer friendly)
function LayersMiniScene({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const l1Ref = useRef<THREE.Mesh>(null);
  const l2Ref = useRef<THREE.Mesh>(null);
  const l3Ref = useRef<THREE.Mesh>(null);

  const currentSpeed = useRef(0.8);
  const currentSpread = useRef(0.42);
  const currentEmissive = useRef(0.2);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const targetSpeed = isHovered ? 2.2 : 0.8;
    const targetSpread = isHovered ? 0.68 : 0.42; // Exploded stack view on hover
    const targetEmissive = isHovered ? 0.6 : 0.2;

    currentSpeed.current = THREE.MathUtils.damp(currentSpeed.current, targetSpeed, 5, delta);
    currentSpread.current = THREE.MathUtils.damp(currentSpread.current, targetSpread, 6, delta);
    currentEmissive.current = THREE.MathUtils.damp(currentEmissive.current, targetEmissive, 6, delta);

    const speed = currentSpeed.current;
    const spread = currentSpread.current;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4 * speed;
    }
    if (l1Ref.current) {
      l1Ref.current.position.y = spread + Math.sin(t * 2) * 0.05;
      const mat = l1Ref.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = currentEmissive.current;
    }
    if (l2Ref.current) {
      l2Ref.current.position.y = 0;
      const mat = l2Ref.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = currentEmissive.current * 0.85;
    }
    if (l3Ref.current) {
      l3Ref.current.position.y = -spread - Math.sin(t * 2) * 0.05;
      const mat = l3Ref.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = currentEmissive.current * 0.75;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.15} floatIntensity={0.25}>
      <group ref={groupRef} rotation={[0.4, 0.4, 0]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 3]} intensity={2.0} color="#ffffff" />
        <pointLight position={[-2, -2, -2]} intensity={0.5} color="#ffffff" />

        {/* Layer 1 - Top Plate */}
        <mesh ref={l1Ref} position={[0, 0.42, 0]}>
          <boxGeometry args={[1.4, 0.1, 1.4]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Layer 2 - Middle Plate */}
        <mesh ref={l2Ref} position={[0, 0, 0]}>
          <boxGeometry args={[1.25, 0.1, 1.25]} />
          <meshStandardMaterial
            color="#e4e4e7"
            emissive="#ffffff"
            emissiveIntensity={0.15}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* Layer 3 - Base Plate */}
        <mesh ref={l3Ref} position={[0, -0.42, 0]}>
          <boxGeometry args={[1.1, 0.1, 1.1]} />
          <meshStandardMaterial
            color="#d4d4d8"
            emissive="#ffffff"
            emissiveIntensity={0.15}
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.82}
          />
        </mesh>
      </group>
    </Float>
  );
}

// --- 2. Interactive 3D Perspective Card (Clean Monochrome Like Original Reference) ---

interface PillarItem {
  id: string;
  icon: typeof Lock;
  title: string;
  desc: string;
  floatDuration: number;
  render3D: (isHovered: boolean) => React.ReactNode;
}

function Hero3DPillarCard({ item, index }: { item: PillarItem; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subtle 3D Tilt values (natural, responsive)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 260 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: mouseX, y: mouseY });
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: 1,
        y: [0, -5, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay: 0.15 * index },
        y: {
          duration: item.floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      className="relative"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={{
          y: -7,
          scale: 1.025,
          transition: { type: "spring", stiffness: 350, damping: 22 },
        }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          transformPerspective: 1000,
        }}
        className="group relative rounded-xl p-3.5 sm:p-4 transition-colors duration-300 backdrop-blur-md border border-white/[0.08] bg-[#0c101a]/70 hover:bg-[#121724]/90 hover:border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(255,255,255,0.08)] cursor-pointer select-none"
      >
        {/* Dynamic Subtle White Cursor Glare (Single color, no neon haze) */}
        {isHovered && (
          <div
            className="pointer-events-none absolute -inset-px rounded-xl opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(240px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.08), transparent 70%)`,
            }}
          />
        )}

        {/* Sleek Top Edge Highlight with hover intensification */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-white/45 transition-all duration-300 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5" style={{ transform: "translateZ(18px)" }}>
          {/* Minimalist 3D Scene Badge (Monochrome Black & White) with scale & glow on hover */}
          <motion.div
            animate={{
              scale: isHovered ? 1.08 : 1,
              borderColor: isHovered ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.1)",
              boxShadow: isHovered
                ? "0 0 16px rgba(255, 255, 255, 0.14), inset 0 0 10px rgba(255, 255, 255, 0.06)"
                : "0 0 0px transparent",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl overflow-hidden border bg-[#07090e]/90"
          >
            {mounted ? (
              <Canvas
                gl={{ antialias: true, alpha: true }}
                camera={{ position: [0, 0, 4.2], fov: 45 }}
                className="w-full h-full pointer-events-none"
              >
                {item.render3D(isHovered)}
              </Canvas>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <Icon className="h-4 w-4 text-white" />
              </div>
            )}
          </motion.div>

          {/* Clean Typography */}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-white tracking-tight group-hover:text-white transition-colors">
              {item.title}
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-400 group-hover:text-zinc-300 mt-0.5 leading-snug transition-colors">
              {item.desc}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- 3. Main Exported Component ---

export default function HeroPillars3D() {
  const PILLARS: PillarItem[] = [
    {
      id: "encryption",
      icon: Lock,
      title: "Encrypted at rest",
      desc: "AES-256 (Fernet)",
      floatDuration: 3.8,
      render3D: (isHovered) => <VaultMiniScene isHovered={isHovered} />,
    },
    {
      id: "teams",
      icon: Users,
      title: "Built for teams",
      desc: "RBAC, audit logs, API keys",
      floatDuration: 4.4,
      render3D: (isHovered) => <TeamMiniScene isHovered={isHovered} />,
    },
    {
      id: "developer",
      icon: Layers,
      title: "Developer friendly",
      desc: "Web UI, CLI, SDK and remote dotenv",
      floatDuration: 4.0,
      render3D: (isHovered) => <LayersMiniScene isHovered={isHovered} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 pt-14 sm:pt-16 md:pt-20 w-full">
      {PILLARS.map((pillar, idx) => (
        <Hero3DPillarCard key={pillar.id} item={pillar} index={idx} />
      ))}
    </div>
  );
}
