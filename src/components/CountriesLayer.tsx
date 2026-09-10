import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useFrame,
} from '@react-three/fiber'

import * as THREE from 'three'

import {
  Line2,
} from 'three/examples/jsm/lines/Line2.js'

import {
  LineGeometry,
} from 'three/examples/jsm/lines/LineGeometry.js'

import {
  LineMaterial,
} from 'three/examples/jsm/lines/LineMaterial.js'

import type {
  CountryInfo,
} from '../data/countries'


/* =========================================================
   Types
========================================================= */

type CountryRing = number[][]

type CountryGeoJSON = {
  type: 'FeatureCollection'

  features: Array<{
    type: 'Feature'

    properties: Record<
      string,
      unknown
    >

    geometry: {
      type: 'Polygon'

      coordinates: CountryRing[]
    }
  }>
}

type CountryObjects = {
  borders: Line2[]
}

type CountriesLayerProps = {
  selectedCountry:
    CountryInfo | null

  onCountryCenter?: (
    center: THREE.Vector3,
  ) => void
}


/* =========================================================
   Settings
========================================================= */

const COUNTRY_RADIUS =
  2.004

const BORDER_RADIUS =
  2.008

const BORDER_WIDTH =
  4

const BORDER_COLOR =
  '#ff076a'


/* =========================================================
   Flag Settings
========================================================= */

const FLAG_NORTH_OFFSET =
  0.16

const FLAG_SURFACE_OFFSET =
  0.035

const FLAG_WIDTH =
  0.34

const FLAG_HEIGHT =
  0.22

const FLAG_BORDER_SIZE =
  0.018

const FLAG_BORDER_OFFSET =
  0.002


/* =========================================================
   Lat/Lon -> Three.js
========================================================= */

function latLonToVector3(
  longitude: number,
  latitude: number,
  radius: number,
): THREE.Vector3 {
  const lat =
    THREE.MathUtils.degToRad(
      latitude,
    )

  const lon =
    THREE.MathUtils.degToRad(
      longitude,
    )

  const cosLat =
    Math.cos(lat)

  return new THREE.Vector3(
    radius *
      cosLat *
      Math.cos(lon),

    radius *
      Math.sin(lat),

    -radius *
      cosLat *
      Math.sin(lon),
  )
}


/* =========================================================
   VarUInt
========================================================= */

function readVarUint(
  bytes: Uint8Array,
  offset: {
    value: number
  },
): number {
  let result = 0

  let shift = 0

  while (true) {
    if (
      offset.value >=
      bytes.length
    ) {
      throw new Error(
        'Unexpected end of CWB file',
      )
    }

    const byte =
      bytes[
        offset.value++
      ]

    if (
      byte === undefined
    ) {
      throw new Error(
        'Invalid CWB byte',
      )
    }

    result |=
      (byte & 0x7f) <<
      shift

    if (
      (byte & 0x80) === 0
    ) {
      break
    }

    shift += 7

    if (
      shift > 35
    ) {
      throw new Error(
        'Invalid CWB VarUInt',
      )
    }
  }

  return result >>> 0
}


/* =========================================================
   ZigZag
========================================================= */

function unzigzag(
  value: number,
): number {
  return (
    (value >>> 1) ^
    -(value & 1)
  )
}


/* =========================================================
   Decode CWB
========================================================= */

function decodeCwb(
  buffer: ArrayBuffer,
): CountryGeoJSON {
  const bytes =
    new Uint8Array(
      buffer,
    )

  if (
    bytes.length < 10
  ) {
    throw new Error(
      'CWB file is too small',
    )
  }

  const magic =
    new TextDecoder(
      'ascii',
    ).decode(
      bytes.slice(
        0,
        4,
      ),
    )

  if (
    magic !== 'CWB1'
  ) {
    throw new Error(
      `Invalid CWB magic: ${magic}`,
    )
  }

  const view =
    new DataView(
      buffer,
    )

  const version =
    view.getUint16(
      4,
      true,
    )

  if (
    version !== 1
  ) {
    throw new Error(
      `Unsupported CWB version: ${version}`,
    )
  }

  const ringCount =
    view.getUint32(
      6,
      true,
    )

  const offset = {
    value: 10,
  }

  const rings:
    CountryRing[] = []

  const SCALE =
    10000

  for (
    let ringIndex = 0;
    ringIndex < ringCount;
    ringIndex++
  ) {
    if (
      offset.value + 4 >
      bytes.length
    ) {
      throw new Error(
        'Invalid CWB ring header',
      )
    }

    const encodedLength =
      view.getUint32(
        offset.value,
        true,
      )

    offset.value += 4

    const ringEnd =
      offset.value +
      encodedLength

    if (
      ringEnd >
      bytes.length
    ) {
      throw new Error(
        'Invalid CWB ring length',
      )
    }

    const ring:
      CountryRing = []

    let previousX = 0

    let previousY = 0

    while (
      offset.value <
      ringEnd
    ) {
      const rawDx =
        readVarUint(
          bytes,
          offset,
        )

      const rawDy =
        readVarUint(
          bytes,
          offset,
        )

      const dx =
        unzigzag(
          rawDx,
        )

      const dy =
        unzigzag(
          rawDy,
        )

      const x =
        previousX + dx

      const y =
        previousY + dy

      previousX = x
      previousY = y

      const longitude =
        x / SCALE

      const latitude =
        y / SCALE

      if (
        Number.isFinite(
          longitude,
        ) &&
        Number.isFinite(
          latitude,
        )
      ) {
        ring.push([
          longitude,
          latitude,
        ])
      }
    }

    if (
      ring.length >= 2
    ) {
      rings.push(
        ring,
      )
    }
  }

  if (
    rings.length === 0
  ) {
    throw new Error(
      'CWB contains no rings',
    )
  }

  return {
    type:
      'FeatureCollection',

    features: [
      {
        type:
          'Feature',

        properties: {},

        geometry: {
          type:
            'Polygon',

          coordinates:
            rings,
        },
      },
    ],
  }
}


/* =========================================================
   Clean Ring
========================================================= */

function cleanRing(
  ring: CountryRing,
): CountryRing {
  if (
    !Array.isArray(
      ring,
    ) ||
    ring.length < 2
  ) {
    return []
  }

  const result =
    ring.filter(
      (
        point,
      ) =>
        Array.isArray(
          point,
        ) &&
        point.length >= 2 &&
        Number.isFinite(
          point[0],
        ) &&
        Number.isFinite(
          point[1],
        ),
    )

  if (
    result.length < 2
  ) {
    return []
  }

  const first =
    result[0]

  const last =
    result[
      result.length - 1
    ]

  if (
    first &&
    last &&
    first[0] === last[0] &&
    first[1] === last[1]
  ) {
    result.pop()
  }

  return result
}

/* =========================================================
   Main Land Helpers
========================================================= */

/*
 * بررسی می‌کند آیا یک نقطه داخل محدوده مشخص است یا نه.
 */
function isInsideBounds(
  longitude: number,
  latitude: number,
  bounds: {
    minLongitude: number
    maxLongitude: number
    minLatitude: number
    maxLatitude: number
  },
): boolean {
  return (
    longitude >=
      bounds.minLongitude &&
    longitude <=
      bounds.maxLongitude &&
    latitude >=
      bounds.minLatitude &&
    latitude <=
      bounds.maxLatitude
  )
}


/*
 * برای یک کشور، شمالی‌ترین نقطه‌ای را پیدا می‌کند
 * که داخل محدوده mainland آن کشور باشد.
 */
function findNorthernmostPointInBounds(
  data: CountryGeoJSON,
  bounds: {
    minLongitude: number
    maxLongitude: number
    minLatitude: number
    maxLatitude: number
  },
): {
  longitude: number
  latitude: number
} | null {
  let northernmost:
    {
      longitude: number
      latitude: number
    } | null = null

  for (
    const feature of
    data.features
  ) {
    for (
      const ring of
      feature.geometry.coordinates
    ) {
      const clean =
        cleanRing(
          ring,
        )

      for (
        const point of clean
      ) {
        const longitude =
          Number(
            point[0],
          )

        const latitude =
          Number(
            point[1],
          )

        if (
          !Number.isFinite(
            longitude,
          ) ||
          !Number.isFinite(
            latitude,
          )
        ) {
          continue
        }

        if (
          !isInsideBounds(
            longitude,
            latitude,
            bounds,
          )
        ) {
          continue
        }

        if (
          northernmost === null ||
          latitude >
            northernmost.latitude
        ) {
          northernmost = {
            longitude,
            latitude,
          }
        }
      }
    }
  }

  return northernmost
}


/* =========================================================
   Northernmost Country Point
========================================================= */

/*
 * کشورهای خاص:
 *
 * NZL = نیوزلند
 * USA = ایالات متحده
 * RUS = روسیه
 *
 * برای این کشورها نقاط دورافتاده یا جزایر
 * نباید محل پرچم را تعیین کنند.
 */

function findNorthernmostPoint(
  data: CountryGeoJSON,
  isoA3: string | null,
): {
  longitude: number
  latitude: number
} | null {

  /* =======================================================
     NEW ZEALAND
  ======================================================= */

  if (
    isoA3 === 'NZL'
  ) {
    /*
     * دو جزیره اصلی نیوزلند تقریباً در این محدوده قرار دارند.
     *
     * عمداً جزایر بسیار کوچک شمالی/جنوبی حذف می‌شوند.
     */
    const result =
      findNorthernmostPointInBounds(
        data,
        {
          minLongitude:
            165,
          maxLongitude:
            179,
          minLatitude:
            -48,
          maxLatitude:
            -34,
        },
      )

    if (
      result
    ) {
      return result
    }
  }


  /* =======================================================
     UNITED STATES
  ======================================================= */

  if (
    isoA3 === 'USA'
  ) {
    /*
     * mainland USA:
     *
     * حدود:
     * longitude: -125 تا -66
     * latitude : 24 تا 50
     *
     * بنابراین:
     *
     * Alaska
     * Hawaii
     * Aleutian Islands
     * Puerto Rico
     * و سایر جزایر
     *
     * روی محل پرچم اثر نمی‌گذارند.
     */
    const result =
      findNorthernmostPointInBounds(
        data,
        {
          minLongitude:
            -125,
          maxLongitude:
            -66,
          minLatitude:
            24,
          maxLatitude:
            50,
        },
      )

    if (
      result
    ) {
      return result
    }
  }


  /* =======================================================
     RUSSIA
  ======================================================= */

  if (
    isoA3 === 'RUS'
  ) {
    /*
     * روسیه از نظر طول جغرافیایی بسیار گسترده است.
     *
     * برای محل پرچم، جزایر قطبی و جزایر دورافتاده
     * نباید انتخاب شوند.
     *
     * این محدوده توده اصلی روسیه را نگه می‌دارد.
     */
  const result = findNorthernmostPointInBounds(
    data,
    {
      minLongitude: 27,
      maxLongitude: 180,
      minLatitude: 41,
      maxLatitude: 72,
    },
  )

   if (result) {
    result.latitude += 5
    result.longitude -= 48
    return result
  }
  }


  /* =======================================================
     OTHER COUNTRIES
  ======================================================= */

  let northernmost:
    {
      longitude: number
      latitude: number
    } | null = null

  for (
    const feature of
    data.features
  ) {
    for (
      const ring of
      feature.geometry.coordinates
    ) {
      const clean =
        cleanRing(
          ring,
        )

      for (
        const point of clean
      ) {
        const longitude =
          Number(
            point[0],
          )

        const latitude =
          Number(
            point[1],
          )

        if (
          !Number.isFinite(
            longitude,
          ) ||
          !Number.isFinite(
            latitude,
          )
        ) {
          continue
        }

        if (
          northernmost === null ||
          latitude >
            northernmost.latitude
        ) {
          northernmost = {
            longitude,
            latitude,
          }
        }
      }
    }
  }

  return northernmost
}


/* =========================================================
   Create Thick Border
========================================================= */

function createBorder(
  ring: CountryRing,
): Line2 | null {
  const clean =
    cleanRing(
      ring,
    )

  if (
    clean.length < 2
  ) {
    return null
  }

  const positions:
    number[] = []

  for (
    const point of clean
  ) {
    const longitude =
      point[0]

    const latitude =
      point[1]

    if (
      longitude === undefined ||
      latitude === undefined
    ) {
      continue
    }

    const vector =
      latLonToVector3(
        longitude,
        latitude,
        BORDER_RADIUS,
      )

    positions.push(
      vector.x,
      vector.y,
      vector.z,
    )
  }

  const first =
    clean[0]

  if (
    first &&
    first[0] !== undefined &&
    first[1] !== undefined
  ) {
    const vector =
      latLonToVector3(
        first[0],
        first[1],
        BORDER_RADIUS,
      )

    positions.push(
      vector.x,
      vector.y,
      vector.z,
    )
  }

  if (
    positions.length < 6
  ) {
    return null
  }

  const geometry =
    new LineGeometry()

  geometry.setPositions(
    positions,
  )

  const material =
    new LineMaterial({
      color:
        BORDER_COLOR,

      linewidth:
        BORDER_WIDTH,

      transparent:
        true,

      opacity:
        1,

      depthWrite:
        false,

      depthTest:
        true,

      dashed:
        false,

      resolution:
        new THREE.Vector2(
          window.innerWidth,
          window.innerHeight,
        ),
    })

  const line =
    new Line2(
      geometry,
      material,
    )

  line.computeLineDistances()

  line.renderOrder =
    50

  return line
}


/* =========================================================
   Country Objects
========================================================= */

function createCountryObjects(
  data: CountryGeoJSON,
): CountryObjects {
  const borders:
    Line2[] = []

  for (
    const feature of
    data.features
  ) {
    const rings =
      feature.geometry
        .coordinates

    for (
      const ring of rings
    ) {
      const border =
        createBorder(
          ring,
        )

      if (
        border
      ) {
        borders.push(
          border,
        )
      }
    }
  }

  return {
    borders,
  }
}


/* =========================================================
   Country Center
========================================================= */

function calculateCountryCenter(
  data: CountryGeoJSON,
): THREE.Vector3 | null {
  let longitudeSum = 0

  let latitudeSum = 0

  let count = 0

  for (
    const feature of
    data.features
  ) {
    for (
      const ring of
      feature.geometry.coordinates
    ) {
      for (
        const point of ring
      ) {
        const longitude =
          Number(
            point[0],
          )

        const latitude =
          Number(
            point[1],
          )

        if (
          !Number.isFinite(
            longitude,
          ) ||
          !Number.isFinite(
            latitude,
          )
        ) {
          continue
        }

        longitudeSum +=
          longitude

        latitudeSum +=
          latitude

        count++
      }
    }
  }

  if (
    count === 0
  ) {
    return null
  }

  const longitude =
    longitudeSum /
    count

  const latitude =
    latitudeSum /
    count

  return latLonToVector3(
    longitude,
    latitude,
    COUNTRY_RADIUS,
  )
}


/* =========================================================
   Flag Marker
========================================================= */

type FlagMarkerProps = {
  isoA3:
    string | null

  geoJson:
    CountryGeoJSON | null
}

function FlagMarker({
  isoA3,
  geoJson,
}: FlagMarkerProps) {
  const [
    flagTexture,
    setFlagTexture,
  ] =
    useState<
      THREE.Texture | null
    >(null)


  /* =======================================================
     Load Flag
  ======================================================= */

  useEffect(() => {
    if (
      !isoA3
    ) {
      setFlagTexture(
        null,
      )

      return
    }

    let cancelled =
      false

    const loader =
      new THREE.TextureLoader()

    const url =
      `/data/flags/${isoA3}.png`

    loader.load(
      url,

      texture => {
        if (
          cancelled
        ) {
          texture.dispose()

          return
        }

        texture.colorSpace =
          THREE.SRGBColorSpace

        texture.anisotropy = 4

        texture.needsUpdate =
          true

        setFlagTexture(
          texture,
        )
      },

      undefined,

      error => {
        console.error(
          '[CountriesLayer] Flag load error:',
          url,
          error,
        )

        if (
          !cancelled
        ) {
          setFlagTexture(
            null,
          )
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [
    isoA3,
  ])


  /* =======================================================
     Northernmost Point
  ======================================================= */

  const northernmost =
    useMemo(
      () => {
        if (
          !geoJson
        ) {
          return null
        }

        return findNorthernmostPoint(
          geoJson,
          isoA3,
        )
      },
      [
        geoJson,
        isoA3,
      ],
    )


  /* =======================================================
     Create Flag + Border
  ======================================================= */

  const flagGroup =
    useMemo(
      () => {
        if (
          !flagTexture ||
          !northernmost
        ) {
          return null
        }

        const borderPoint =
          latLonToVector3(
            northernmost.longitude,
            northernmost.latitude,
            COUNTRY_RADIUS,
          )

        const northLatitude =
          Math.min(
            northernmost.latitude +
              THREE.MathUtils.radToDeg(
                FLAG_NORTH_OFFSET /
                  COUNTRY_RADIUS,
              ),

            89,
          )

        const flagSurface =
          latLonToVector3(
            northernmost.longitude,
            northLatitude,
            COUNTRY_RADIUS +
              FLAG_SURFACE_OFFSET,
          )

        const normal =
          flagSurface
            .clone()
            .normalize()

        const worldUp =
          new THREE.Vector3(
            0,
            1,
            0,
          )

        let right =
          new THREE.Vector3()
            .crossVectors(
              worldUp,
              normal,
            )

        if (
          right.lengthSq() <
          0.000001
        ) {
          right =
            new THREE.Vector3(
              1,
              0,
              0,
            ).cross(
              normal,
            )
        }

        right.normalize()

        const up =
          new THREE.Vector3()
            .crossVectors(
              normal,
              right,
            )
            .normalize()

        const basis =
          new THREE.Matrix4()

        basis.makeBasis(
          right,
          up,
          normal,
        )


        /* =================================================
           BORDER
        ================================================= */

        const borderGeometry =
          new THREE.PlaneGeometry(
            FLAG_WIDTH +
              FLAG_BORDER_SIZE,

            FLAG_HEIGHT +
              FLAG_BORDER_SIZE,
          )

        borderGeometry.applyMatrix4(
          basis,
        )

        const borderMaterial =
          new THREE.MeshBasicMaterial({
            color:
              '#2b005a',

            transparent:
              true,

            opacity:
              1,

            side:
              THREE.DoubleSide,

            depthWrite:
              false,

            depthTest:
              true,
          })

        const flagBorder =
          new THREE.Mesh(
            borderGeometry,
            borderMaterial,
          )

        flagBorder.position.copy(
          flagSurface,
        )

        flagBorder.position.add(
          normal
            .clone()
            .multiplyScalar(
              -FLAG_BORDER_OFFSET,
            ),
        )

        flagBorder.renderOrder =
          59


        /* =================================================
           FLAG
        ================================================= */

        const flagGeometry =
          new THREE.PlaneGeometry(
            FLAG_WIDTH,
            FLAG_HEIGHT,
          )

        flagGeometry.applyMatrix4(
          basis,
        )

        const flagMaterial =
          new THREE.MeshBasicMaterial({
            map:
              flagTexture,

            transparent:
              true,

            side:
              THREE.DoubleSide,

            depthWrite:
              false,

            depthTest:
              true,
          })

        const flag =
          new THREE.Mesh(
            flagGeometry,
            flagMaterial,
          )

        flag.position.copy(
          flagSurface,
        )

        flag.renderOrder =
          60


        /* =================================================
           GROUP
        ================================================= */

        const group =
          new THREE.Group()

        group.add(
          flagBorder,
        )

        group.add(
          flag,
        )

        group.userData.borderPoint =
          borderPoint

        group.userData.flagSurface =
          flagSurface

        group.userData.normal =
          normal

        group.userData.dispose =
          () => {
            flagGeometry.dispose()

            flagMaterial.dispose()

            borderGeometry.dispose()

            borderMaterial.dispose()
          }

        return group
      },
      [
        flagTexture,
        northernmost,
      ],
    )


  /* =======================================================
     Cleanup Flag
  ======================================================= */

  useEffect(() => {
    return () => {
      if (
        !flagGroup
      ) {
        return
      }

      const dispose =
        flagGroup.userData
          .dispose

      if (
        typeof dispose ===
        'function'
      ) {
        dispose()
      }
    }
  }, [
    flagGroup,
  ])


  /* =======================================================
     Render
  ======================================================= */

  if (
    !flagGroup
  ) {
    return null
  }

  return (
    <primitive
      object={
        flagGroup
      }
    />
  )
}


/* =========================================================
   Main Component
========================================================= */

export default function CountriesLayer({
  selectedCountry,
  onCountryCenter,
}: CountriesLayerProps) {
  const [
    geoJson,
    setGeoJson,
  ] =
    useState<
      CountryGeoJSON | null
    >(null)


  /* =======================================================
     ISO A3
  ======================================================= */

  const isoA3:
    string | null =
    selectedCountry?.isoA3
      ?.trim()
      .toUpperCase() ||
    null


  /* =======================================================
     Cache
  ======================================================= */

  const cache =
    useRef<
      Record<
        string,
        CountryGeoJSON
      >
    >({})


  /* =======================================================
     Load CWB
  ======================================================= */

  useEffect(() => {
    if (
      !isoA3
    ) {
      setGeoJson(
        null,
      )

      return
    }

    const countryCode =
      isoA3

    const cached =
      cache.current[
        countryCode
      ]

    if (
      cached
    ) {
      setGeoJson(
        cached,
      )

      const center =
        calculateCountryCenter(
          cached,
        )

      if (
        center &&
        onCountryCenter
      ) {
        onCountryCenter(
          center,
        )
      }

      return
    }

    let cancelled =
      false

    setGeoJson(
      null,
    )

    const url =
      `/data/countries/${countryCode}.cwb`


    async function loadCountry() {
      try {
        console.log(
          '[CountriesLayer] Loading:',
          url,
        )

        const response =
          await fetch(
            url,
            {
              cache:
                'force-cache',
            },
          )

        if (
          !response.ok
        ) {
          throw new Error(
            `HTTP ${response.status}`,
          )
        }

        const buffer =
          await response.arrayBuffer()

        console.log(
          '[CountriesLayer] Bytes:',
          buffer.byteLength,
        )

        const data =
          decodeCwb(
            buffer,
          )

        if (
          cancelled
        ) {
          return
        }

        cache.current[
          countryCode
        ] = data

        setGeoJson(
          data,
        )

        const center =
          calculateCountryCenter(
            data,
          )

        if (
          center &&
          onCountryCenter
        ) {
          onCountryCenter(
            center,
          )
        }

        console.log(
          '[CountriesLayer] Loaded:',
          countryCode,
        )
      } catch (
        error
      ) {
        if (
          cancelled
        ) {
          return
        }

        console.error(
          '[CountriesLayer] Load error:',
          url,
          error,
        )
      }
    }

    void loadCountry()

    return () => {
      cancelled = true
    }
  }, [
    isoA3,
    onCountryCenter,
  ])


  /* =======================================================
     Create Country Objects
  ======================================================= */

  const objects =
    useMemo<
      CountryObjects | null
    >(
      () => {
        if (
          !geoJson
        ) {
          return null
        }

        return createCountryObjects(
          geoJson,
        )
      },
      [
        geoJson,
      ],
    )


  /* =======================================================
     Objects Ref
  ======================================================= */

  const objectsRef =
    useRef<
      CountryObjects | null
    >(null)


  useEffect(() => {
    objectsRef.current =
      objects

    return () => {
      if (
        !objects
      ) {
        return
      }

      for (
        const border of
        objects.borders
      ) {
        border.geometry.dispose()

        const material =
          border.material

        if (
          material instanceof
          LineMaterial
        ) {
          material.dispose()
        }
      }

      if (
        objectsRef.current ===
        objects
      ) {
        objectsRef.current =
          null
      }
    }
  }, [
    objects,
  ])


  /* =======================================================
     Pulse Border
  ======================================================= */

  useFrame(
    state => {
      const current =
        objectsRef.current

      if (
        !current
      ) {
        return
      }

      const wave =
        (
          Math.sin(
            state.clock.elapsedTime *
              3.5,
          ) +
          1
        ) / 2

      const opacity =
        0.85 +
        wave * 0.15

      for (
        const border of
        current.borders
      ) {
        const material =
          border.material

        if (
          material instanceof
          LineMaterial
        ) {
          material.opacity =
            opacity
        }
      }
    },
  )


  /* =======================================================
     Render
  ======================================================= */

  if (
    !objects
  ) {
    return null
  }

  return (
    <group>
      {
        objects.borders.map(
          (
            border,
            index,
          ) => (
            <primitive
              key={
                `country-border-${isoA3 ?? 'none'}-${index}`
              }
              object={
                border
              }
            />
          ),
        )
      }

      <FlagMarker
        isoA3={
          isoA3
        }
        geoJson={
          geoJson
        }
      />
    </group>
  )
}