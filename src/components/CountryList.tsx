
import {
  useRef,
} from 'react'

import {
  countries,
  type CountryInfo,
} from '../data/countries'


type CountryListProps = {
  selectedCountry: CountryInfo | null

  onCountrySelect: (
    country: CountryInfo,
  ) => void
}


export default function CountryList({
  selectedCountry,
  onCountrySelect,
}: CountryListProps) {

  /* =====================================================
     Refs
  ===================================================== */

  const scrollRef =
    useRef<HTMLDivElement | null>(null)

  const isDragging =
    useRef(false)

  const hasDragged =
    useRef(false)

  const startX =
    useRef(0)

  const startScrollLeft =
    useRef(0)

  const pressedCountry =
    useRef<CountryInfo | null>(null)


  /* =====================================================
     Pointer Down
  ===================================================== */

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const container =
      scrollRef.current

    if (!container) {
      return
    }

    const target =
      event.target as HTMLElement

    const button =
      target.closest(
        '[data-country-button="true"]',
      )

    if (button) {
      const isoA3 =
        button.getAttribute(
          'data-iso-a3',
        )

      const country =
        countries.find(
          (item) =>
            (
              isoA3 &&
              item.isoA3 === isoA3
            ),
        )

      pressedCountry.current =
        country ?? null
    } else {
      pressedCountry.current =
        null
    }


    isDragging.current =
      true

    hasDragged.current =
      false

    startX.current =
      event.clientX

    startScrollLeft.current =
      container.scrollLeft


    container.setPointerCapture(
      event.pointerId,
    )

    container.style.cursor =
      'grabbing'

    container.style.userSelect =
      'none'
  }


  /* =====================================================
     Pointer Move
  ===================================================== */

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const container =
      scrollRef.current

    if (
      !container ||
      !isDragging.current
    ) {
      return
    }

    const distance =
      event.clientX -
      startX.current


    if (
      Math.abs(distance) > 6
    ) {
      hasDragged.current =
        true
    }


    if (hasDragged.current) {
      container.scrollLeft =
        startScrollLeft.current -
        distance
    }
  }


  /* =====================================================
     Pointer Up
  ===================================================== */

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const container =
      scrollRef.current

    const wasDragged =
      hasDragged.current

    const country =
      pressedCountry.current


    isDragging.current =
      false


    if (
      !wasDragged &&
      country
    ) {
      onCountrySelect(
        country,
      )
    }


    hasDragged.current =
      false

    pressedCountry.current =
      null


    if (container) {
      if (
        container.hasPointerCapture(
          event.pointerId,
        )
      ) {
        container.releasePointerCapture(
          event.pointerId,
        )
      }

      container.style.cursor =
        'grab'

      container.style.userSelect =
        'none'
    }
  }


  /* =====================================================
     Pointer Cancel
  ===================================================== */

  const handlePointerCancel = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const container =
      scrollRef.current


    isDragging.current =
      false

    hasDragged.current =
      false

    pressedCountry.current =
      null


    if (container) {
      if (
        container.hasPointerCapture(
          event.pointerId,
        )
      ) {
        container.releasePointerCapture(
          event.pointerId,
        )
      }

      container.style.cursor =
        'grab'

      container.style.userSelect =
        'none'
    }
  }


  /* =====================================================
     Render
  ===================================================== */

  return (
    <div
      dir="rtl"
      style={{
        position: 'relative',

        width: '100%',

        height: 64,

        boxSizing: 'border-box',

        padding: '4px 4px',

        background:
          'linear-gradient(' +
          '180deg, ' +
          'rgba(3, 12, 22, 0.98) 0%, ' +
          'rgba(3, 12, 22, 0.90) 100%' +
          ')',

        color: '#FFFFFF',

        zIndex: 100,

        pointerEvents: 'auto',

        display: 'flex',

        alignItems: 'center',

        boxShadow:
          '0 4px 14px rgba(0,0,0,0.28)',

        borderBottom:
          '1px solid rgba(255,255,255,0.06)',
      }}
    >

      {/* =================================================
          Horizontal Country List
      ================================================= */}

      <div
        ref={scrollRef}

        onPointerDown={
          handlePointerDown
        }

        onPointerMove={
          handlePointerMove
        }

        onPointerUp={
          handlePointerUp
        }

        onPointerCancel={
          handlePointerCancel
        }

        style={{
          width: '100%',

          height: 60,

          overflowX: 'auto',

          overflowY: 'hidden',

          WebkitOverflowScrolling:
            'touch',

          scrollbarWidth: 'none',

          msOverflowStyle:
            'none',

          boxSizing: 'border-box',

          cursor: 'grab',

          userSelect: 'none',

          touchAction: 'pan-x',

          overscrollBehaviorX:
            'contain',

          display: 'flex',

          alignItems: 'center',
        }}

        className="country-list-scroll"
      >

        <div
          style={{
            display: 'flex',

            flexDirection: 'row',

            alignItems: 'center',

            gap: 4,

            width: 'max-content',

            minWidth: '100%',

            padding:
              '0 2px',

            direction: 'rtl',
          }}
        >

          {countries.map(
            (country, index) => {

              const isSelected =
                selectedCountry?.isoA3 ===
                country.isoA3


              return (
                <button
                  key={
                    country.isoA3 ??
                    country.nameEn
                  }

                  type="button"

                  data-country-button="true"

                  data-iso-a3={
                    country.isoA3 ?? ''
                  }

                  aria-pressed={
                    isSelected
                  }

                  style={{
                    position:
                      'relative',

                    flex:
                      '0 0 auto',

                    width:
                      isSelected
                        ? 62
                        : 54,

                    height:
                      isSelected
                        ? 46
                        : 42,

                    boxSizing:
                      'border-box',

                    display: 'flex',

                    alignItems:
                      'center',

                    justifyContent:
                      'center',

                    padding:
                      0,

                    borderRadius:
                      isSelected
                        ? 12
                        : 10,

                    border:
                      isSelected
                        ? '1px solid rgba(85,217,255,0.95)'
                        : '1px solid rgba(255,255,255,0.10)',

                    background:
                      isSelected
                        ? 'linear-gradient(' +
                          '180deg, ' +
                          'rgba(35,134,168,0.65), ' +
                          'rgba(19,76,103,0.62)' +
                          ')'
                        : 'linear-gradient(' +
                          '180deg, ' +
                          'rgba(15,38,53,0.92), ' +
                          'rgba(5,20,32,0.88)' +
                          ')',

                    color:
                      isSelected
                        ? '#FFFFFF'
                        : '#C9DCE5',

                    cursor: 'pointer',

                    outline: 'none',

                    transition:
                      'all 0.18s ease',

                    boxShadow:
                      isSelected
                        ? '0 0 16px rgba(85,217,255,0.32), ' +
                          'inset 0 1px 0 rgba(255,255,255,0.18)'
                        : '0 3px 8px rgba(0,0,0,0.22), ' +
                          'inset 0 1px 0 rgba(255,255,255,0.06)',

                    backdropFilter:
                      'blur(8px)',

                    WebkitBackdropFilter:
                      'blur(8px)',

                    userSelect:
                      'none',

                    direction:
                      'ltr',

                    transform:
                      isSelected
                        ? 'translateY(-1px)'
                        : 'translateY(0)',
                  }}
                >

                  {/* =====================================
                      شماره کشور
                  ===================================== */}

                  <span
                    style={{
                      position:
                        'relative',

                      zIndex: 2,

                      display:
                        'flex',

                      alignItems:
                        'center',

                      justifyContent:
                        'center',

                      width:
                        isSelected
                          ? 32
                          : 28,

                      height:
                        isSelected
                          ? 32
                          : 28,

                      borderRadius:
                        '50%',

                      background:
                        isSelected
                          ? 'rgba(85,217,255,0.16)'
                          : 'rgba(255,255,255,0.045)',

                      border:
                        isSelected
                          ? '1px solid rgba(85,217,255,0.35)'
                          : '1px solid rgba(255,255,255,0.06)',

                      fontSize:
                        isSelected
                          ? 16
                          : 14,

                      lineHeight:
                        1,

                      fontWeight:
                        isSelected
                          ? 800
                          : 600,

                      letterSpacing:
                        '0.2px',

                      color:
                        isSelected
                          ? '#FFFFFF'
                          : '#C9DCE5',

                      pointerEvents:
                        'none',

                      textShadow:
                        isSelected
                          ? '0 0 8px rgba(85,217,255,0.55)'
                          : 'none',
                    }}
                  >
                    {index + 1}
                  </span>


                  {/* =====================================
                      Selected Indicator
                  ===================================== */}

                  {isSelected && (
                    <>
                      <span
                        style={{
                          position:
                            'absolute',

                          top: 2,

                          left: '50%',

                          width: 18,

                          height: 2,

                          transform:
                            'translateX(-50%)',

                          borderRadius:
                            999,

                          background:
                            '#55D9FF',

                          boxShadow:
                            '0 0 8px rgba(85,217,255,0.95)',

                          pointerEvents:
                            'none',
                        }}
                      />

                      <span
                        style={{
                          position:
                            'absolute',

                          bottom: 2,

                          left: '50%',

                          width: 22,

                          height: 2,

                          transform:
                            'translateX(-50%)',

                          borderRadius:
                            999,

                          background:
                            '#55D9FF',

                          boxShadow:
                            '0 0 8px rgba(85,217,255,0.95)',

                          pointerEvents:
                            'none',
                        }}
                      />
                    </>
                  )}

                </button>
              )
            },
          )}

        </div>

      </div>


      {/* =================================================
          Hide Scrollbar
      ================================================= */}

      <style>
        {`
          .country-list-scroll::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }

          .country-list-scroll button:active {
            transform: scale(0.94);
          }
        `}
      </style>

    </div>
  )
}
