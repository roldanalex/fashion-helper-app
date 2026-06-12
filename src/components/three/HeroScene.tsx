"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";

function GoldenThread() {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    // Gentle parallax toward the pointer
    const { x, y } = state.pointer;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      y * 0.15,
      0.04,
    );
    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      x * 0.3,
      0.04,
    );
  });

  return (
    <group ref={group}>
      <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}>
        <mesh>
          <torusKnotGeometry args={[1.05, 0.26, 220, 36, 2, 5]} />
          <meshStandardMaterial
            color="#c9a45c"
            metalness={0.92}
            roughness={0.28}
          />
        </mesh>
      </Float>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.4], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      className="!pointer-events-none"
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <GoldenThread />
      {/* Procedural studio lighting — no external HDR downloads */}
      <Environment resolution={128}>
        <Lightformer
          intensity={2.2}
          position={[3, 2, 4]}
          scale={[4, 2, 1]}
          color="#f5e7c8"
        />
        <Lightformer
          intensity={1.1}
          position={[-4, -1, 2]}
          scale={[3, 3, 1]}
          color="#8d7a5c"
        />
        <Lightformer
          intensity={0.8}
          position={[0, 4, -3]}
          scale={[6, 1, 1]}
          color="#ffffff"
        />
      </Environment>
    </Canvas>
  );
}
