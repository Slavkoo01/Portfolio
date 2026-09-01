import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Fire embers — many small glowing dots that drift upward across the whole
 * scene, then recycle to the bottom when they reach the top.
 *
 * How it works (the big picture):
 *  - We create ONE object that holds N points (a "Points" system). Drawing 300
 *    dots as one object is fast; drawing 300 separate meshes would be slow.
 *  - Each point has a position (x,y,z) and its own upward speed + drift.
 *  - Every frame we nudge each point upward. When it passes the top, we drop it
 *    back to the bottom at a new random x/z, so the stream never runs out.
 */
export default function Embers({
  count = 300,          // how many embers
  bounds = 26,          // half-size of the cube volume they fill (x and z)
  height = 22,          // vertical range they travel through
  color = '#ffb968',    // warm amber
  size = 0.13,          // dot size
}) {
  const pointsRef = useRef()
  const matRef = useRef()

  // --- Build the initial data ONCE (useMemo = compute once, remember) ---
  const { positions, speeds, drift } = useMemo(() => {
    // positions: 3 numbers (x,y,z) per ember, packed in one flat array.
    // This flat layout is what the GPU wants — [x0,y0,z0, x1,y1,z1, ...].
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)          // upward speed per ember
    const drift = new Float32Array(count * 2)       // slight x/z sway per ember

    for (let i = 0; i < count; i++) {
      // random position inside the volume
      positions[i * 3 + 0] = (Math.random() - 0.5) * bounds * 2   // x: -bounds..+bounds
      positions[i * 3 + 1] = (Math.random() - 0.5) * height       // y: spread vertically
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 2   // z

      // each ember rises at its own pace so they don't move in lockstep
      speeds[i] = 0.4 + Math.random() * 0.8

      // gentle horizontal sway amounts
      drift[i * 2 + 0] = (Math.random() - 0.5) * 0.4  // x sway
      drift[i * 2 + 1] = (Math.random() - 0.5) * 0.4  // z sway
    }
    return { positions, speeds, drift }
  }, [count, bounds, height])

  // --- Animate every frame ---
  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const t = state.clock.elapsedTime
    // the live array of positions we can mutate
    const pos = pointsRef.current.geometry.attributes.position.array
    const top = height / 2
    const bottom = -height / 2

    for (let i = 0; i < count; i++) {
      // move this ember up by its speed (delta keeps it framerate-independent)
      pos[i * 3 + 1] += speeds[i] * delta * 1.5

      // gentle horizontal sway using a sine wave (each ember offset by i)
      pos[i * 3 + 0] += Math.sin(t * 0.5 + i) * drift[i * 2 + 0] * delta
      pos[i * 3 + 2] += Math.cos(t * 0.4 + i) * drift[i * 2 + 1] * delta

      // recycle: if it went above the top, drop it back to the bottom
      if (pos[i * 3 + 1] > top) {
        pos[i * 3 + 1] = bottom
        pos[i * 3 + 0] = (Math.random() - 0.5) * bounds * 2
        pos[i * 3 + 2] = (Math.random() - 0.5) * bounds * 2
      }
    }
    // tell three.js the positions changed so it re-uploads them to the GPU
    pointsRef.current.geometry.attributes.position.needsUpdate = true

    // --- animate colour: slowly cycle through warm ember hues ---
    if (matRef.current) {
      matRef.current.opacity = 0.7 + Math.sin(t * 1.2) * .38
      // hue drifts across amber→orange→gold (0.03–0.11 in HSL hue)
      const hue = 0.07 + Math.sin(t * 0.25) * 0.04
      const light = 0.7 + Math.sin(t * .5) * .1
      matRef.current.color.setHSL(hue, 1, light)
      matRef.current.color.multiplyScalar(1.5)
      
    }
  })

  return (
    <points ref={pointsRef}>
      {/* geometry holds the raw point positions */}
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      {/* material controls how each point looks */}
      <pointsMaterial
        ref={matRef}
        color={color}
        size={size}
        sizeAttenuation           // farther embers look smaller (perspective)
        transparent
        opacity={1}
        depthWrite={false}        // don't block things behind them
        blending={THREE.AdditiveBlending}  // glow: overlapping embers add up
        toneMapped={false}        // keep them bright so bloom catches them
      />
    </points>
  )
}
