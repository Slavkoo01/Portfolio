import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Island from './Island.jsx'

/**
 * The 3D stage for the hero art.
 * Recreates the Blender atmosphere in Three.js terms:
 *  - dark violet fog for depth
 *  - a key + rim light so the island reads in 3D
 *  - bloom so the emissive rings/lamps glow like the render
 */
export default function Scene() {
  return (
    <Canvas
      camera={{ position: [8.4, 4.5, 20], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      {/* Atmospheric fog matching the night-violet palette */}
      <fog attach="fog" args={['#0a0710', 18, 55]} />

      {/* Ambient base so nothing is pure black */}
      <ambientLight intensity={0.7} color="#3a2a5c" />

      {/* Key light (cool, from upper left, like the render) */}
      <directionalLight
        position={[-8, 12, 8]}
        intensity={1.4}
        color="#9db4ff"
      />
      {/* Warm fill from the lamp side */}
      <pointLight position={[6, 2, 4]} intensity={5} color="#ffb968" distance={20} decay={2} />
      {/* Rim light from behind for separation */}
      <spotLight
        position={[0, 8, -12]}
        angle={0.6}
        penumbra={1}
        intensity={8}
        color="#c65cff"
        distance={40}
      />

      <Suspense fallback={null}>
        <Island dragEnabled />
      </Suspense>

      {/* Post-processing: bloom makes emissive parts glow */}
      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  )
}
