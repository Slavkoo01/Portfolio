import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport is narrower than `breakpoint` (default 1024px,
 * Tailwind's lg). Used to swap the heavy 3D scene for a static image on phones.
 */
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}
