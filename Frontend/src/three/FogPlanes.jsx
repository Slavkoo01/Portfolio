import { useRef, useMemo } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Volumetric-looking smoke from camera-facing billboards.
 *
 * The trick: scatter many flat planes low around the island, each showing the
 * SmokeCloud texture. Every frame we rotate each plane to face the camera
 * (a "billboard"). Because they always face you, you never see them edge-on —
 * overlapping many of them at low opacity reads as a soft 3D fog bank, exactly
 * like the New Londo reference. This is how games fake volumetric smoke cheaply.
 *
 * The texture already has real transparency (RGBA), so we use it directly as
 * `map` with transparent=true — the transparent background just disappears.
 */
export default function FogPlanes({
  count = 55,          // how many smoke billboards
  radius = 15,         // how far around the island they scatter
  baseY = -5,          // vertical centre of the fog bank (low, under/around island)
  yJitter = 4,         // vertical spread
  color = '#9498b5',   // cool grey tint
  opacity = 0.16,      // LOW per-plane; density comes from overlap
  minScale = 6,
  maxScale = 12,
  drift = 0.15,        // how much they slowly move
}) {
  const group = useRef()
  const { camera } = useThree()

  const smoke = useLoader(THREE.TextureLoader, '/textures/SmokeCloud.png')

  // Scatter data, computed once
  const planes = useMemo(() => {
    return Array.from({ length: count }).map(() => {
      // random point in a disc around the centre (denser toward middle)
      const ang = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * radius
      return {
        x: Math.cos(ang) * r,
        y: baseY + (Math.random() - 0.5) * yJitter,
        z: Math.sin(ang) * r,
        scale: minScale + Math.random() * (maxScale - minScale),
        spin: Math.random() * Math.PI * 2,      // random texture roll
        phase: Math.random() * Math.PI * 2,     // drift phase
        speed: 0.5 + Math.random() * 0.8,
      }
    })
  }, [count, radius, baseY, yJitter, minScale, maxScale])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.children.forEach((mesh, i) => {
      const p = planes[i]
      // slow drift
      mesh.position.x = p.x + Math.sin(t * 0.1 * p.speed + p.phase) * drift * 6
      mesh.position.z = p.z + Math.cos(t * 0.08 * p.speed + p.phase) * drift * 6
      mesh.position.y = p.y + Math.sin(t * 0.06 + p.phase) * 0.4
      // BILLBOARD: face the camera every frame
      mesh.quaternion.copy(camera.quaternion)
      // keep each plane's own texture roll so they don't look identical
      mesh.rotateZ(p.spin)
    })
  })

  return (
    <group ref={group}>
      {planes.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={p.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={smoke}
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}       // fog shouldn't hide things behind it
            blending={THREE.NormalBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
