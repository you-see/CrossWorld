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

  // Lower anisotropy is cheaper on mobile GPUs.
  texture.anisotropy = 2

  return (
    <>
      {/* Main earth */}
      <mesh>
        <sphereGeometry
          args={[
            GLOBE_RADIUS,
            64,
            64,
          ]}
        />

        <meshBasicMaterial
          map={texture}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Very subtle inner glow */}
      <mesh scale={1.002}>
        <sphereGeometry
          args={[
            GLOBE_RADIUS,
            32,
            32,
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
            32,
            32,
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
            32,
            32,
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
      <ambientLight
        intensity={1}
      />

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
    useRef<THREE.Group | null>(
      null,
    )

  const targetRotation =
    useRef<
      THREE.Quaternion | null
    >(null)

  const controlsRef =
    useRef<any>(null)

  /* =======================================================
     Focus Country
  ======================================================= */

  const focusCountry =
    useCallback(
      (center: THREE.Vector3) => {
        if (
          !globeGroup.current
        ) {
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

        targetRotation.current =
          createFocusQuaternion(
            longitude,
            latitude,
          )
      },
      [],
    )

  /* =======================================================
     Default Focus
  ======================================================= */

  useEffect(() => {
    if (
      selectedCountry
    ) {
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
     Smooth Rotation
  ======================================================= */

  useFrame(() => {
    const globe =
      globeGroup.current

    const target =
      targetRotation.current

    if (
      !globe ||
      !target
    ) {
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

    if (
      angle < 0.0005
    ) {
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

      <group
        ref={globeGroup}
      >
        <GlobeMesh />

        <Atmosphere />

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

        /*
         * Important for mobile:
         *
         * Never render the globe at 2x device
         * pixel ratio. On high-density phones
         * this can multiply the fragment workload
         * dramatically.
         */
        dpr={1}

        gl={{
          /*
           * Antialiasing costs GPU time and is not
           * necessary here because the globe is
           * already rendered at a reasonable
           * resolution.
           */
          antialias: false,

          alpha: true,

          powerPreference:
            'high-performance',

          /*
           * Helps avoid unnecessary depth-buffer
           * overhead from the transparent scene.
           */
          depth: true,

          stencil: false,
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