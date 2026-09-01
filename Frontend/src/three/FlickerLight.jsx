import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * A point light that flickers like a flame.
 *
 * Real flame flicker isn't a clean pulse — it's irregular. We fake that by
 * layering a few sine waves of different speeds and adding a touch of jitter.
 * The sum stays near `intensity` but wobbles, so the lamp feels alive.
 *
 * Drop it in place of a normal <pointLight>. `seed` offsets the phase so
 * multiple lamps don't flicker in sync.
 */
export default function FlickerLight({
  position = [0, 0, 0],
  color = '#ffb968',
  intensity = 10,
  distance = 20,
  decay = 2,
  amount = 0.35,   // how strong the flicker is (0 = steady, 1 = wild)
  seed = 0,
}) {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime + seed * 10
    // three sine waves at different speeds = irregular-looking flicker
    const f =
      Math.sin(t * 11) * 0.5 +
      Math.sin(t * 17.3) * 0.3 +
      Math.sin(t * 23.7) * 0.2
    // small random jitter on top
    const jitter = (Math.random() - 0.5) * 0.15
    // combine, scaled by `amount`, centered around 1
    const mult = 1 + (f * 0.5 + jitter) * amount
    ref.current.intensity = intensity * mult
  })

  return (
    <pointLight
      ref={ref}
      position={position}
      color={color}
      intensity={intensity}
      distance={distance}
      decay={decay}
    />
  )
}
