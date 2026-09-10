import { useEffect, useState } from 'react'
import type { CountryInfo } from '../data/countries'

type CountryInfoPanelProps = {
  country: CountryInfo | null
  onStartGame?: () => void
  completedFame?: readonly boolean[]
}

const FAME_STAGE_COUNT = 5

const FAME_STAGE_MEDALS = [
  '🥉',
  '🥈',
  '🥇',
  '🏅',
  '🏆',
] as const

const PERSIAN_WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const

function getTimezoneOffsetMinutes(
  timeZone?: string,
): number {
  if (!timeZone) {
    return 0
  }

  const value = timeZone
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')

  if (
    value === 'GMT' ||
    value === 'UTC' ||
    value === 'GMT+0' ||
    value === 'GMT+00:00' ||
    value === 'GMT-0' ||
    value === 'GMT-00:00'
  ) {
    return 0
  }

  const match = value.match(
    /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/,
  )

  if (!match) {
    return 0
  }

  const sign = match[1] === '+' ? 1 : -1
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? 0)

  return sign * (hours * 60 + minutes)
}

function getCountryDate(
  timeZone?: string,
): Date {
  const offsetMinutes =
    getTimezoneOffsetMinutes(timeZone)

  const now = new Date()

  const utcMilliseconds =
    now.getTime() +
    now.getTimezoneOffset() * 60 * 1000

  return new Date(
    utcMilliseconds +
      offsetMinutes * 60 * 1000,
  )
}

function formatCountryTime(
  date: Date,
): string {
  const hours = String(
    date.getUTCHours(),
  ).padStart(2, '0')

  const minutes = String(
    date.getUTCMinutes(),
  ).padStart(2, '0')

  const seconds = String(
    date.getUTCSeconds(),
  ).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

function getCountryWeekday(
  date: Date,
): string {
  return PERSIAN_WEEKDAYS[
    date.getUTCDay()
  ]
}

export default function CountryInfoPanel({
  country,
  onStartGame,
  completedFame = [],
}: CountryInfoPanelProps) {
  const [currentTime, setCurrentTime] =
    useState(() =>
      getCountryDate(
        country?.time_zone,
      ),
    )

  useEffect(() => {
    if (!country) {
      return
    }

    const updateTime = () => {
      setCurrentTime(
        getCountryDate(
          country.time_zone,
        ),
      )
    }

    updateTime()

    const timer = window.setInterval(
      updateTime,
      1000,
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [country])

  if (!country) {
    return null
  }

  const countryTime =
    formatCountryTime(currentTime)

  const countryWeekday =
    getCountryWeekday(currentTime)

  return (
    <>
      <div
        className="crossworld-country-panel"
        style={{
          position: 'absolute',

          left: 2,
          right: 2,
          bottom: 2,
          height: 150,
          boxSizing: 'border-box',
          padding: '4px 6px',
          borderRadius: 8,
          background: 'rgba(5, 15, 25, 0.2)',

          border:
            '1px solid rgba(255,255,255,0.18)',

          boxShadow:
            '0 8px 30px rgba(0,0,0,0.30)',

          backdropFilter:
            'blur(8px)',

          WebkitBackdropFilter:
            'blur(8px)',

          color: '#FFFFFF',

          fontFamily:
            'Tahoma, sans-serif',

          pointerEvents: 'auto',

          zIndex: 20,

          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',

            display: 'grid',

            gridTemplateColumns:
              '35% 20% 45%',

            direction: 'ltr',

            alignItems: 'stretch',

            minWidth: 0,
          }}
        >
          {/* ==================================================
              LEFT
              DAY + TIME + START GAME
              ================================================== */}
          <div
            style={{
              display: 'flex',

              flexDirection: 'column',

              alignItems: 'flex-start',

              justifyContent: 'center',

              paddingRight: 2,

              minWidth: 0,
              transform: 'translateY(-5px)',
            }}
          >
            {/* DAY + TIME */}

{/* DAY + TIME */}
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    width: '100%',
    maxWidth: 238,
    marginBottom: 14,
    direction: 'ltr',
    whiteSpace: 'nowrap',
  }}
>
  {/* TIME - LEFT */}
  <div
    dir="ltr"
    style={{
      fontSize: 20,
      fontWeight: 500,
      color: 'rgba(206, 220, 0, 1)',
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'left',
    }}
  >
    {countryTime}
  </div>

  {/* DAY - RIGHT */}
  <div
    dir="rtl"
    style={{
      fontSize: 15,
      fontWeight: 500,
      color: 'rgba(206, 220, 0, 1)',
      whiteSpace: 'nowrap',
      textAlign: 'right',
    }}
  >
    {countryWeekday}
  </div>
</div>

            {/* START GAME */}
            <button
              type="button"
              onClick={onStartGame}
              style={{
                width: '100%',

                maxWidth: 238,

                height: 70,

                border:
                  '1px solid rgba(255,255,255,0.38)',

                borderRadius: 4,

                background:
                  'rgba(255,255,255,0.035)',

                color: '#FFFFFF',

                fontFamily:
                  'Tahoma, sans-serif',

                fontSize: 25,

                fontWeight: 600,

                cursor: 'pointer',

                outline: 'none',

                transition:
                  'background 0.2s ease, border-color 0.2s ease',

                pointerEvents: 'auto',
              }}
              onMouseEnter={event => {
                event.currentTarget.style.background =
                  'rgba(255,255,255,0.10)'

                event.currentTarget.style.borderColor =
                  'rgba(255,255,255,0.55)'
              }}
              onMouseLeave={event => {
                event.currentTarget.style.background =
                  'rgba(255,255,255,0.035)'

                event.currentTarget.style.borderColor =
                  'rgba(255,255,255,0.38)'
              }}
            >
              شروع بازی
            </button>
          </div>

          {/* ==================================================
              CENTER
              CAPITAL + CURRENCY
              ================================================== */}
          <div
            style={{
              display: 'flex',

              flexDirection: 'column',

              justifyContent: 'center',

              alignItems: 'center',

              paddingLeft: 2,

              paddingRight: 2,

              gap: 18,

              minWidth: 0,

              overflow: 'hidden',
            }}
          >
            {/* CAPITAL */}
            <div
              style={{
                display: 'flex',

                flexDirection: 'column',

                alignItems: 'center',

                gap: 5,

                minWidth: 0,

                width: '100%',
              }}
            >
              {/* Persian capital */}
              <div
                dir="rtl"
                title={country.capital_fa}
                style={{
                  fontSize: 15,

                  fontWeight: 700,

                  color:
                    'rgb(160, 199, 255)',

                  whiteSpace: 'nowrap',

                  overflow: 'hidden',

                  textOverflow: 'ellipsis',

                  maxWidth: '100%',
                }}
              >
                {country.capital_fa}
              </div>

              {/* English capital */}
              <div
                dir="ltr"
                title={country.capital_en}
                style={{
                  fontSize: 13,

                  fontWeight: 500,

                  color:
                    'rgb(160, 199, 255)',

                  whiteSpace: 'nowrap',

                  overflow: 'hidden',

                  textOverflow: 'ellipsis',

                  maxWidth: '100%',
                }}
              >
                {country.capital_en}
              </div>
            </div>

            {/* CURRENCY */}
            <div
              style={{
                display: 'flex',

                flexDirection: 'column',

                alignItems: 'center',

                gap: 5,

                minWidth: 0,

                width: '100%',
              }}
            >
              {/* Persian currency */}
              <div
                dir="rtl"
                title={country.currency_fa}
                style={{
                  fontSize: 15,

                  fontWeight: 700,

                  color:
                    'rgb(160, 199, 255)',

                  whiteSpace: 'nowrap',

                  overflow: 'hidden',

                  textOverflow: 'ellipsis',

                  maxWidth: '100%',
                }}
              >
                {country.currency_fa}
              </div>

              {/* English currency */}
              <div
                dir="ltr"
                title={country.currency_en}
                style={{
                  fontSize: 12,

                  fontWeight: 500,

                  color:
                    'rgb(160, 199, 255)',

                  whiteSpace: 'nowrap',

                  overflow: 'hidden',

                  textOverflow: 'ellipsis',

                  maxWidth: '100%',
                }}
              >
                {country.currency_en}
              </div>
            </div>
          </div>

          {/* ==================================================
              RIGHT
              COUNTRY NAME + FAME MEDALS
              ================================================== */}
          <div
            style={{
              display: 'flex',

              flexDirection: 'column',

              alignItems: 'flex-end',

              justifyContent: 'flex-start',

              paddingTop: 2,

              paddingLeft: 2,

              minWidth: 0,

              overflow: 'visible',
            }}
          >
            {/* PERSIAN COUNTRY NAME */}
            <div
              dir="rtl"
              title={country.name}
              style={{
                width: '100%',

                fontSize: 20,

                fontWeight: 800,

                lineHeight: 1.35,

                color: '#FFFFFF',

                textAlign: 'right',

                whiteSpace: 'nowrap',

                overflow: 'visible',

                textOverflow: 'clip',

                flexShrink: 0,
              }}
            >
              {country.name}
            </div>

            {/* ENGLISH COUNTRY NAME */}
            <div
              dir="ltr"
              title={country.nameEn}
              style={{
                width: '100%',

                marginTop: 3,

                fontSize: 15,

                fontWeight: 500,

                lineHeight: 1.3,

                color:
                  'rgba(255,255,255,0.8)',

                textAlign: 'right',

                whiteSpace: 'nowrap',

                overflow: 'visible',

                textOverflow: 'clip',

                flexShrink: 0,
              }}
            >
              {country.nameEn}
            </div>

            {/* FAME MEDALS */}
            <div
              className="crossworld-medals"
              style={{
                display: 'flex',

                alignItems: 'center',

                justifyContent: 'flex-end',

                gap: 8,

                direction: 'ltr',

                flexWrap: 'nowrap',

                whiteSpace: 'nowrap',

                width: '100%',

                marginTop: 10,

                overflow: 'visible',

                minWidth: 0,
              }}
            >
              {Array.from(
                {
                  length:
                    FAME_STAGE_COUNT,
                },
                (_, index) => {
                  const completed = completedFame[index] === true

                  return (
                    <div
                      key={index}
                      title={`مرحله ${index + 1}`}
                      style={{
                        width: 42,

                        height: 42,

                        minWidth: 42,

                        flexShrink: 0,

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        borderRadius: '50%',

                        boxSizing:
                          'border-box',

                        background:
                          completed
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(255,255,255,0.035)',

                        border:
                          completed
                            ? '1px solid rgba(255,255,255,0.30)'
                            : '1px solid rgba(255,255,255,0.10)',

                        filter:
                          completed
                            ? 'none'
                            : 'grayscale(1)',

                        opacity:
                          completed
                            ? 1
                            : 0.35,

                        fontSize: 23,

                        lineHeight: 1,

                        transition:
                          'all 0.2s ease',

                        userSelect:
                          'none',

                        position:
                          'relative',

                        zIndex: 2,
                      }}
                    >
                      {
                        FAME_STAGE_MEDALS[
                          index
                        ]
                      }
                    </div>
                  )
                },
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          RESPONSIVE
          ==================================================== */}
      <style>
        {`
          .crossworld-country-panel {
            transition:
              left 0.2s ease,
              right 0.2s ease,
              bottom 0.2s ease,
              width 0.2s ease,
              height 0.2s ease;
          }

          @media (min-width: 700px) {
            .crossworld-country-panel {
              left: 14px !important;
              right: 14px !important;
              bottom: 1px !important;
              height: 150px !important;
            }
          }

          @media (max-width: 700px) {
            .crossworld-country-panel {
              left: 8px !important;
              right: 8px !important;
              bottom: 8px !important;

              height: 132px !important;

              padding: 8px 8px !important;
            }

            .crossworld-country-panel button {
              height: 58px !important;
              font-size: 12px !important;
            }

            .crossworld-medals {
              gap: 5px !important;
              margin-top: 8px !important;
            }
          }

          @media (max-width: 560px) {
            .crossworld-country-panel {
              height: 122px !important;
              padding: 8px 9px !important;
            }

            .crossworld-country-panel button {
              height: 52px !important;
              font-size: 11px !important;
            }

            .crossworld-medals {
              gap: 3px !important;
              margin-top: 6px !important;
            }

            .crossworld-country-panel
              div[title^="مرحله"] {
              width: 37px !important;
              height: 37px !important;
              min-width: 37px !important;
              font-size: 20px !important;
            }
          }

          @media (max-width: 460px) {
            .crossworld-country-panel {
              height: 116px !important;
              padding: 7px 8px !important;
            }

            .crossworld-country-panel button {
              height: 48px !important;
              font-size: 10px !important;
            }

            .crossworld-medals {
              gap: 3px !important;
              margin-top: 5px !important;
            }

            .crossworld-country-panel
              div[title^="مرحله"] {
              width: 33px !important;
              height: 33px !important;
              min-width: 33px !important;
              font-size: 18px !important;
            }
          }
        `}
      </style>
    </>
  )
}