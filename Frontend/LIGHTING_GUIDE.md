# Podešavanje osvetljenja 3D ostrva

Sva svetla su u `src/three/Scene.jsx`. Menjaj vrednosti, sačuvaj, browser se sam osveži (`npm run dev`).

## Ako je PRETAMNO
- `ambientLight intensity` (0.6) → podigni na 0.9–1.2
- `hemisphereLight` treći broj (0.7) → 1.0–1.3
- `directionalLight intensity` (1.8) → 2.5–3.5
- `toneMappingExposure` (1.15, u <Canvas gl={...}>) → 1.3–1.6

## Ako je PRESVETLO / lampe blešte
- `Bloom intensity` (0.9) → 0.4–0.6
- `Bloom luminanceThreshold` (0.6) → 0.75–0.9 (viši = manje bloom-a)
- `pointLight intensity` (12, topla lampa) → 6–8

## Boja atmosfere
- `fog args={['#0c0813', 22, 60]}` → prva vrednost je boja magle, druga/treća gde počinje/završava
- `ambientLight color` (#4a3a6b) → toplije (#5a4a3b) ili hladnije (#3a3a6b)

## Emissive (lampe/prstenovi koji svetle)
Već su podešeni u samom GLB fajlu (strength ukroćen sa 60/300 na 2.0).
Ako hoćeš jače/slabije, u `src/three/Island.jsx` nađi `emissiveIntensity` (Math.min(..., 2.2)).

## Anchor svetla (na Blender Area tačkama)
U `src/three/Island.jsx`, `<pointLight ... intensity={3.5}>` — pojačaj/smanji za boju na ostrvu.

## Interakcija (grab & rotate)
U `src/three/Island.jsx`:
- `MAX_ROT` (0.5) — koliko se može zarotirati
- `MAX_OFFSET` (1.6) — koliko se pomera
- Brzina vraćanja: `delta * 5` u useFrame (veći broj = brže vraćanje)
