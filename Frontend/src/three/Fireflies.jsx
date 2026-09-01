import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Fireflies — slow wandering glowing motes (Monster Hunter World vibe).
 *
 * Difference from embers:
 *  - Embers rise and recycle. Fireflies WANDER: each drifts around its own
 *    "home" spot on a slow looping path, so they hover instead of streaming up.
 *  - They PULSE (fade in/out) individually, like a real firefly's glow.
 *
 * Each firefly stores: a home position, a few random phase offsets, and small
 * radii. We rebuild its position every frame from sine waves around home — no
 * recycling needed because it never leaves its neighbourhood.
 */
export default function Fireflies({
  count = 70,
  spread = 9,         // how tightly clustered around the centre (smaller = tighter)
  centerY = 1,        // vertical centre of the swarm (around the knight/forest base)
  heightSpread = 7,   // vertical spread
  color = '#b8ff9e',  // soft green-yellow
  size = 0.18,
}) {
  const pointsRef = useRef()
  const matRef = useRef()

  const { positions, homes, phases, radii } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const homes = new Float32Array(count * 3)     // the spot each one orbits
    const phases = new Float32Array(count * 3)     // random start offset per axis
    const radii = new Float32Array(count * 3)      // how far it wanders per axis

    for (let i = 0; i < count; i++) {
      // Cluster around centre using a bell-ish distribution (average of randoms),
      // so most fireflies gather near the forest/knight, fewer stray out.
      const rand = () => ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2
      const hx = rand() * spread
      const hy = centerY + rand() * heightSpread
      const hz = rand() * spread
      homes[i * 3 + 0] = hx
      homes[i * 3 + 1] = hy
      homes[i * 3 + 2] = hz
      positions[i * 3 + 0] = hx
      positions[i * 3 + 1] = hy
      positions[i * 3 + 2] = hz

      phases[i * 3 + 0] = Math.random() * Math.PI * 2
      phases[i * 3 + 1] = Math.random() * Math.PI * 2
      phases[i * 3 + 2] = Math.random() * Math.PI * 2

      radii[i * 3 + 0] = 1.5 + Math.random() * 2.5
      radii[i * 3 + 1] = 1.0 + Math.random() * 1.8
      radii[i * 3 + 2] = 1.5 + Math.random() * 2.5
    }
    return { positions, homes, phases, radii }
  }, [count, spread, centerY, heightSpread])

  useFrame((state) => {
    if (!pointsRef.current) return
    const t = state.clock.elapsedTime
    const pos = pointsRef.current.geometry.attributes.position.array

    for (let i = 0; i < count; i++) {
      // wander = home + slow sine drift on each axis, each at a different speed
      pos[i * 3 + 0] = homes[i * 3 + 0] + Math.sin(t * 0.18 + phases[i * 3 + 0]) * radii[i * 3 + 0]
      pos[i * 3 + 1] = homes[i * 3 + 1] + Math.sin(t * 0.13 + phases[i * 3 + 1]) * radii[i * 3 + 1]
      pos[i * 3 + 2] = homes[i * 3 + 2] + Math.cos(t * 0.16 + phases[i * 3 + 2]) * radii[i * 3 + 2]
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true

    // global gentle pulse of the whole swarm's brightness
    if (matRef.current) {
      matRef.current.opacity = 0.7 + Math.sin(t * 1.2) * .28
      // slowly cycle through green→cyan→yellow-green hues
      const hue = 0.3 + Math.sin(t * 0.18) * 0.05
      const light = 0.55 + Math.sin(t * 0.5) * 0.1   // ~0.22–0.38 in HSL
      matRef.current.color.setHSL(hue, 0.85, light)
      matRef.current.color.multiplyScalar(2.5)
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}
