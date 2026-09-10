import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
} from 'react'

import {
  Canvas,
  useFrame,
  useLoader,
} from '@react-three/fiber'

import {
  OrbitControls,
  Stars,
} from '@react-three/drei'

import * as THREE from 'three'

import CountriesLayer from './CountriesLayer'

import type {
  CountryInfo,
} from '../data/countries'

/* =========================================================
   Types
========================================================= */

type WorldGlobeProps = {
  selectedCountry: CountryInfo | null
}

type GlobeSceneProps = {
  selectedCountry: CountryInfo | null
}

/* =========================================================
   Settings
========================================================= */

const GLOBE_RADIUS = 2

const GLOBE_IMAGE =
  '/textures/earth.png'

const DEFAULT_LONGITUDE = 53
const DEFAULT_LATITUDE = 32

const CAMERA_DISTANCE = 7.7

/* =========================================================
   Globe Texture
========================================================= */

function GlobeMesh() {
  const texture = useLoader(
    THREE.TextureLoader,
    GLOBE_IMAGE,
  )

  texture.colorSpace =
    THREE.SRGBColorSpace

  texture.anisotropy = 8

  return (
    <>
      <mesh>
        <sphereGeometry
          args={[
            GLOBE_RADIUS,
            128,
            128,
          ]}
        />

        <meshBasicMaterial
          map={texture}
          side={THREE.FrontSide}
        />
      </mesh>

      <mesh scale={1.002}>
        <sphereGeometry
          args={[
            GLOBE_RADIUS,
            96,
            96,
          ]}
        />

        <meshBasicMaterial
          color="#43BFFF"
          transparent
          opacity={0.045}
          blending={
            THREE.AdditiveBlending
          }
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

/* =========================================================
   Atmosphere
========================================================= */

function Atmosphere() {
  return (
    <>
      <mesh scale={1.045}>
        <sphereGeometry
          args={[
            GLOBE_RADIUS,
            64,
            64,
          ]}
        />

        <meshBasicMaterial
          color="#31AFFF"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={
            THREE.AdditiveBlending
          }
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.075}>
        <sphereGeometry
          args={[
            GLOBE_RADIUS,
            64,
            64,
          ]}
        />

        <meshBasicMaterial
          color="#168CFF"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          blending={
            THREE.AdditiveBlending
          }
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

/* =========================================================
   Lights
========================================================= */

function GlobeLights() {
  return (
    <>
      <ambientLight intensity={1} />

      <directionalLight
        position={[
          5,
          3,
          5,
        ]}
        intensity={1.5}
      />
    </>
  )
}

/* =========================================================
   Energy Rings
========================================================= */

function EnergyRings() {
  const ring1 =
    useRef<THREE.Mesh | null>(null)

  const ring2 =
    useRef<THREE.Mesh | null>(null)

  useFrame((_, delta) => {
    if (ring1.current) {
      ring1.current.rotation.z +=
        delta * 0.12

      ring1.current.rotation.y +=
        delta * 0.05
    }

    if (ring2.current) {
      ring2.current.rotation.z -=
        delta * 0.08

      ring2.current.rotation.x +=
        delta * 0.04
    }
  })

  return (
    <>
      <mesh
        ref={ring1}
        rotation={[
          Math.PI / 3,
          0,
          0,
        ]}
      >
        <torusGeometry
          args={[
            2.28,
            0.004,
            8,
            160,
          ]}
        />

        <meshBasicMaterial
          color="#55C7FF"
          transparent
          opacity={0.25}
          blending={
            THREE.AdditiveBlending
          }
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={ring2}
        rotation={[
          -Math.PI / 3.4,
          0.2,
          0,
        ]}
      >
        <torusGeometry
          args={[
            2.35,
            0.003,
            8,
            160,
          ]}
        />

        <meshBasicMaterial
          color="#A878FF"
          transparent
          opacity={0.16}
          blending={
            THREE.AdditiveBlending
          }
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

/* =========================================================
   Orbit Particles
========================================================= */

function OrbitParticles() {
  const groupRef =
    useRef<THREE.Group | null>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return
    }

    groupRef.current.rotation.y +=
      delta * 0.08
  })

  const particles =
    Array.from(
      { length: 18 },
      (_, index) => {
        const angle =
          (index / 18) *
          Math.PI *
          2

        const radius = 2.29

        return {
          x:
            Math.cos(angle) *
            radius,

          y:
            Math.sin(angle) *
            radius *
            0.35,

          z: 0,
        }
      },
    )

  return (
    <group
      ref={groupRef}
      rotation={[
        Math.PI / 3,
        0,
        0,
      ]}
    >
      {particles.map(
        (
          particle,
          index,
        ) => (
          <mesh
            key={`orbit-${index}`}
            position={[
              particle.x,
              particle.y,
              particle.z,
            ]}
          >
            <sphereGeometry
              args={[
                index % 5 === 0
                  ? 0.018
                  : 0.008,
                8,
                8,
              ]}
            />

            <meshBasicMaterial
              color={
                index % 5 === 0
                  ? '#FFFFFF'
                  : '#54C9FF'
              }
              transparent
              opacity={
                index % 5 === 0
                  ? 0.9
                  : 0.5
              }
              blending={
                THREE.AdditiveBlending
              }
              depthWrite={false}
            />
          </mesh>
        ),
      )}
    </group>
  )
}

/* =========================================================
   Geographic Rotation
========================================================= */

function createFocusQuaternion(
  longitude: number,
  latitude: number,
): THREE.Quaternion {
  const longitudeRad =
    THREE.MathUtils.degToRad(
      longitude,
    )

  const latitudeRad =
    THREE.MathUtils.degToRad(
      latitude,
    )

  const yaw =
    -Math.PI / 2 -
    longitudeRad

  const pitch =
    latitudeRad

  const qYaw =
    new THREE.Quaternion()

  qYaw.setFromAxisAngle(
    new THREE.Vector3(
      0,
      1,
      0,
    ),
    yaw,
  )

  const qPitch =
    new THREE.Quaternion()

  qPitch.setFromAxisAngle(
    new THREE.Vector3(
      1,
      0,
      0,
    ),
    pitch,
  )

  return qPitch.multiply(
    qYaw,
  )
}

/* =========================================================
   Scene
========================================================= */

function GlobeScene({
  selectedCountry,
}: GlobeSceneProps) {
  const globeGroup =
    useRef<THREE.Group | null>(null)

  const targetRotation =
    useRef<THREE.Quaternion | null>(
      null,
    )

  const controlsRef =
    useRef<any>(null)

  /* =======================================================
     Focus
  ======================================================= */

  const focusCountry =
    useCallback(
      (center: THREE.Vector3) => {
        if (!globeGroup.current) {
          return
        }

        const direction =
          center
            .clone()
            .normalize()

        const latitude =
          THREE.MathUtils.radToDeg(
            Math.asin(
              THREE.MathUtils.clamp(
                direction.y,
                -1,
                1,
              ),
            ),
          )

        const longitude =
          THREE.MathUtils.radToDeg(
            Math.atan2(
              -direction.z,
              direction.x,
            ),
          )

        const target =
          createFocusQuaternion(
            longitude,
            latitude,
          )

        targetRotation.current =
          target

        console.log(
          '[WorldGlobe] Focus:',
          {
            longitude,
            latitude,
          },
        )
      },
      [],
    )

  /* =======================================================
     Default Iran Focus
  ======================================================= */

  useEffect(() => {
    if (selectedCountry) {
      return
    }

    targetRotation.current =
      createFocusQuaternion(
        DEFAULT_LONGITUDE,
        DEFAULT_LATITUDE,
      )
  }, [
    selectedCountry,
  ])

  /* =======================================================
     Selected Country Focus
  ======================================================= */

  useEffect(() => {
    // فوکوس واقعی از CountriesLayer
    // با onCountryCenter انجام می‌شود.
  }, [
    selectedCountry,
  ])

  /* =======================================================
     Smooth Rotation
  ======================================================= */

  useFrame(() => {
    const globe =
      globeGroup.current

    const target =
      targetRotation.current

    if (!globe || !target) {
      return
    }

    globe.quaternion.slerp(
      target,
      0.075,
    )

    const angle =
      globe.quaternion.angleTo(
        target,
      )

    if (angle < 0.0005) {
      globe.quaternion.copy(
        target,
      )

      targetRotation.current =
        null
    }
  })

  /* =======================================================
     Render
  ======================================================= */

  return (
    <>
      <GlobeLights />

      <Stars
        radius={50}
        depth={35}
        count={1800}
        factor={1.8}
        saturation={0.2}
        fade
        speed={0.2}
      />

      <group ref={globeGroup}>
        <GlobeMesh />

        <Atmosphere />

        <EnergyRings />

        <OrbitParticles />

        <CountriesLayer
          selectedCountry={
            selectedCountry
          }
          onCountryCenter={
            focusCountry
          }
        />
      </group>

<OrbitControls
  ref={controlsRef}
  enablePan={false}
  enableRotate={false}
  enableZoom={false}
  minDistance={3.5}
  maxDistance={8.5}
  enableDamping={false}
/>
    </>
  )
}

/* =========================================================
   Loading
========================================================= */

function GlobeLoading() {
  return null
}

/* =========================================================
   WorldGlobe
========================================================= */

export default function WorldGlobe({
  selectedCountry,
}: WorldGlobeProps) {
  useEffect(() => {
    if (!selectedCountry) {
      return
    }

    console.log(
      '[WorldGlobe] Selected country:',
      selectedCountry.name,
      selectedCountry.isoA3,
    )
  }, [
    selectedCountry,
  ])

  return (
    <div
      className="world-globe"
      style={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        flex: '1 1 auto',

        background:
          'radial-gradient(circle at center, #102D48 0%, #07121F 45%, #02060D 100%)',
      }}
    >
      <Canvas
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        camera={{
          position: [
            0,
            0,
            CAMERA_DISTANCE,
          ],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[
          1,
          2,
        ]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference:
            'high-performance',
        }}
      >
        <Suspense
          fallback={
            <GlobeLoading />
          }
        >
          <GlobeScene
            selectedCountry={
              selectedCountry
            }
          />
        </Suspense>
      </Canvas>
    </div>
  )
}