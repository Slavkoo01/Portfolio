import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Interactive island.
 * - The GLB uses KHR_materials_emissive_strength: some materials export with
 *   huge strength (lamp_light=60, island001=300). three.js loads that into
 *   material.emissiveIntensity, which blows them into white discs under bloom.
 *   We clamp emissiveIntensity to sane values per material so they read as a
 *   glow, not a sun — while keeping the neon hue.
 * - Places real point lights at the Blender "Area" anchor empties.
 * - Grab & drag with spring-back to origin.
 */
export default function Island({ dragEnabled = true }) {
  const { scene } = useGLTF('/models/scene.glb', '/draco/')
  const group = useRef()
  const { gl } = useThree()

  const [dragging, setDragging] = useState(false)
  const target = useRef(new THREE.Vector3(0, 0, 0))
  const current = useRef(new THREE.Vector3(0, 0, 0))
  const dragStart = useRef(new THREE.Vector2())
  const MAX_OFFSET = 2.2

  const { prepared, anchors } = useMemo(() => {
    const root = scene.clone(true)
    const anchors = []

    root.traverse((obj) => {
      if (obj.name && obj.name.startsWith('Area')) {
        const p = new THREE.Vector3()
        obj.getWorldPosition(p)
        anchors.push({ name: obj.name, position: p })
      }

      if (obj.isMesh && obj.material) {
        const clone = (m) => {
          const c = m.clone()
          // Emissive strengths are already tamed in the GLB itself; just make
          // sure everything is tone-mapped so bloom stays gentle.
          if (c.emissive) {
            const lum =
              0.3 * c.emissive.r + 0.59 * c.emissive.g + 0.11 * c.emissive.b
            if (lum > 0.01) {
              c.emissiveIntensity = Math.min(c.emissiveIntensity || 1, 1.4)
              c.toneMapped = true
            }
          }
          return c
        }
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(clone)
          : clone(obj.material)
      }
    })

    return { prepared: root, anchors }
  }, [scene])

  useEffect(() => {
    if (!dragEnabled) return
    const el = gl.domElement
    const onDown = (e) => {
      setDragging(true)
      dragStart.current.set(e.clientX, e.clientY)
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!dragging) return
      const dx = (e.clientX - dragStart.current.x) / window.innerWidth
      const dy = (e.clientY - dragStart.current.y) / window.innerHeight
      target.current.set(
        THREE.MathUtils.clamp(dx * 6, -MAX_OFFSET, MAX_OFFSET),
        THREE.MathUtils.clamp(-dy * 6, -MAX_OFFSET, MAX_OFFSET),
        0
      )
    }
    const onUp = () => {
      setDragging(false)
      target.current.set(0, 0, 0)
      el.style.cursor = 'grab'
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.style.cursor = 'grab'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, dragEnabled, gl])

  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    current.current.lerp(target.current, Math.min(1, delta * 6))
    group.current.position.x = current.current.x
    group.current.position.y = current.current.y + Math.sin(t * 0.6) * 0.12
    if (!dragging) group.current.rotation.y = Math.sin(t * 0.15) * 0.15
  })

  return (
    <group ref={group} dispose={null}>
      <primitive object={prepared} />
      {anchors.map((a, i) => (
        <pointLight
          key={a.name}
          position={a.position}
          color={['#c65cff', '#5b7bff', '#e04dff', '#ffb968'][i % 4]}
          intensity={2.5}
          distance={14}
          decay={2}
        />
      ))}
    </group>
  )
}

useGLTF.preload('/models/scene.glb', '/draco/')
