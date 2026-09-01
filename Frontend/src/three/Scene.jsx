import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, HueSaturation, BrightnessContrast } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import Island from './Island.jsx'
import Embers from './Embers.jsx'
import Fireflies from './Fireflies.jsx'
import FogPlanes from './FogPlanes.jsx'


/**
 * 3D stage for the hero.
 * Lighting strategy to approximate the Blender render's mood:
 *  - low ambient + a soft "night" environment for gentle fill (so nothing is
 *    pure black but it stays moody)
 *  - cool key light from upper-left, warm rim from the lantern side
 *  - bloom tuned so lanterns/neon glow without blowing out
 */
export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [7, 4, 18], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >

      <fog attach="fog" args={['#0c0813', 22, 60]} />
      {/* Soft ambient base */}
      <ambientLight intensity={5} color="#4a3a6b" />
      {/* Hemisphere: cool sky, warm ground bounce — soft realistic fill */}
      <hemisphereLight args={['#6a7bff', '#3a2a1a', 0.9]} />

      {/* Cool key light, upper-left (like the render) */}
      <directionalLight position={[-6, 10, 6]} intensity={2} color="#aebfff" castShadow
        shadow-mapSize={[1024, 1024]} />

      {/* Violet rim from behind for separation + neon feel */}
      <spotLight position={[0, 7, -12]} angle={0.7} penumbra={1} intensity={20}
        color="#c65cff" distance={45} />

      <Suspense fallback={null}>
        <Island dragEnabled />
        {/* Encircling + base mist (loads the cloud texture, so inside Suspense) */}
        <FogPlanes count={100} radius={0} baseY={-3} opacity={0.006} minScale={3} maxScale={9} drift={0.85} yJitter={5}/>
      </Suspense>

      {/* Fire embers drifting up across the whole scene */}
      <Embers count={200} />

      {/* Slow wandering fireflies, clustered around the forest & knight */}
      <Fireflies count={70} />

      {/* ─── Compositing stack ───────────────────────────────────────────────
          Island stays FULLY SHARP. Instead of screen-space DoF (which blurred
          the island too), depth now comes from: fog on the far background, a
          stronger vignette, and bloom on the glowing parts. The far particles
          read as soft because of their own additive glow + fog.
      */}
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={1.35}
          luminanceThreshold={.45}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
       <HueSaturation saturation={.05}/>
       <BrightnessContrast contrast={.05}/>
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  )
}
