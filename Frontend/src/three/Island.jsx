import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import FlickerLight from './FlickerLight.jsx'

/**
 * Interactive island model.
 * - Loads the Draco-compressed GLB (emissive strengths already tamed in-file).
 * - Reads the Blender "Area" empties and places warm/cool point lights there.
 * - Grab & drag: pointer drag rotates + offsets the island; release springs
 *   it back to its rest pose. It never wanders far and always returns.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EMISSIVE CONTROLS — edit the EMISSIVE object just below to tune how the
 * glowing parts (lamps, neon rings) look. Each entry matches meshes whose name
 * includes the key. `color` (null = keep the model's own colour), `intensity`.
 * ─────────────────────────────────────────────────────────────────────────
 */
const EMISSIVE = {
  // purple lamp glass shells ship WITHOUT emissive — give them a violet glow
  lamp_glass:  { color: '#a24dff', intensity: 2.0 },
  // the lights inside the lamps (already violet in the model)
  lamp_light:  { color: null,      intensity: 2.2 },
  // neon rings / sphere behind the character
  Circle:      { color: null,      intensity: 2.6 },
  Sphere:      { color: null,      intensity: 2.6 },
  // amber light patch on the island
  island001:   { color: null,      intensity: 2.0 },
}
// fallback cap for any other emissive material not listed above
const DEFAULT_EMISSIVE_CAP = 2.2

export default function Island({ dragEnabled = true }) {
  const { scene } = useGLTF('/models/scene.glb', '/draco/')
  const group = useRef()
  const inner = useRef()
  const { gl } = useThree()

  const [dragging, setDragging] = useState(false)
  const posTarget = useRef(new THREE.Vector3(0, 0, 0))
  const posCurrent = useRef(new THREE.Vector3(0, 0, 0))
  const rotTarget = useRef(new THREE.Vector2(0, 0)) // x=yaw, y=pitch
  const rotCurrent = useRef(new THREE.Vector2(0, 0))
  const last = useRef(new THREE.Vector2())
  const MAX_OFFSET = 1.6
  const MAX_ROT = 0.5

  const { prepared, anchors } = useMemo(() => {
    const root = scene.clone(true)
    const anchors = []
    root.traverse((obj) => {
      if (obj.name && obj.name.startsWith('Area')) {
        const p = new THREE.Vector3()
        obj.getWorldPosition(p)
        anchors.push({ name: obj.name, position: p })
      }
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true

        // find a matching EMISSIVE rule by mesh name (if any)
        const rule = Object.entries(EMISSIVE).find(
          ([key]) => obj.name && obj.name.toLowerCase().includes(key.toLowerCase())
        )?.[1]

        const fix = (m) => {
          const c = m.clone()
          if (!c.emissive) c.emissive = new THREE.Color(0, 0, 0)
          const lum = 0.3 * c.emissive.r + 0.59 * c.emissive.g + 0.11 * c.emissive.b

          if (rule) {
            // apply the explicit rule for this mesh
            if (rule.color) c.emissive = new THREE.Color(rule.color)
            c.emissiveIntensity = rule.intensity
            c.toneMapped = true
          } else if (lum > 0.01) {
            // any other glowing material: just cap it
            c.emissiveIntensity = Math.min(c.emissiveIntensity || 1, DEFAULT_EMISSIVE_CAP)
            c.toneMapped = true
          }
          return c
        }
        obj.material = Array.isArray(obj.material) ? obj.material.map(fix) : fix(obj.material)
      }
    })
    return { prepared: root, anchors }
  }, [scene])

  useEffect(() => {
    if (!dragEnabled) return
    const el = gl.domElement
    const onDown = (e) => { setDragging(true); last.current.set(e.clientX, e.clientY); el.style.cursor = 'grabbing' }
    const onMove = (e) => {
      if (!dragging) return
      const dx = (e.clientX - last.current.x)
      const dy = (e.clientY - last.current.y)
      last.current.set(e.clientX, e.clientY)
      // rotate with horizontal drag (yaw) and vertical drag (pitch)
      rotTarget.current.x = THREE.MathUtils.clamp(rotTarget.current.x + dx * 0.005, -MAX_ROT, MAX_ROT)
      rotTarget.current.y = THREE.MathUtils.clamp(rotTarget.current.y + dy * 0.004, -MAX_ROT * 0.6, MAX_ROT * 0.6)
      // slight positional pull
      posTarget.current.x = THREE.MathUtils.clamp(rotTarget.current.x * 2.2, -MAX_OFFSET, MAX_OFFSET)
      posTarget.current.y = THREE.MathUtils.clamp(-rotTarget.current.y * 1.6, -MAX_OFFSET, MAX_OFFSET)
    }
    const onUp = () => {
      setDragging(false)
      posTarget.current.set(0, 0, 0)
      rotTarget.current.set(0, 0)
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
    if (!group.current || !inner.current) return
    const t = state.clock.elapsedTime
    const k = Math.min(1, delta * 5)
    // spring position
    posCurrent.current.lerp(posTarget.current, k)
    group.current.position.x = posCurrent.current.x
    group.current.position.y = -3.5 + posCurrent.current.y + Math.sin(t * 0.5) * 0.1 // base offset + idle float
    // spring rotation
    rotCurrent.current.lerp(rotTarget.current, k)
    inner.current.rotation.y = rotCurrent.current.x + (dragging ? 0 : Math.sin(t * 0.12) * 0.08)
    inner.current.rotation.x = rotCurrent.current.y
  })

  return (
    <group ref={group} dispose={null} position={[0, -3.5, 0]}>
      <group ref={inner}>
        <primitive object={prepared} />
      </group>
      {anchors.map((a, i) => (
        <FlickerLight
          key={a.name}
          position={a.position}
          intensity={250}
          color={['#ffb968', '#5b7bff', '#c65cff', '#ffb968'][i % 4]}
          distance={18}
          seed={1.7}
          amount={0.15}
          decay={2}
        />
      ))}
    </group>
  )
}

useGLTF.preload('/models/scene.glb', '/draco/')
