'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import VelisMark from '../VelisMark'
import RewardBadge from '../RewardBadge'
import { getStoredStats, getStoredUser } from '../lib/auth'
import { getCooldownRemainingMs, formatCooldown, canViewJourneyDay, TOTAL_JOURNEY_DAYS, CHAPTER_LENGTH } from '../services/JourneyService'
import { FONT_SANS } from '../lib/typography'
import { useAppNav } from '../contexts/AppNavContext'
import StoryArchive from './StoryArchive'
import { useLocale } from '../contexts/LocaleContext'

// Hesap henüz yoksa (guided registration), Day 1 içeriği kısaca gösterildikten
// sonra bu ekran kararıyor - dikkat aşağıdaki Profile sekmesinin nabzına
// yönleniyor (bkz. BottomNav.tsx ctaPulse).
const DIM_DELAY_MS = 1400

// Journey Overview - "Day 1 Journey" ekranından Continue ile gelinen
// sonraki adım. Aynı tasarım dili: siyah zemin, aynı tipografi, aynı amber
// vurgu, aynı sakin/minimal Apple estetiği. Sekmeler arası geçiş next.config
// içindeki viewTransition ayarı üzerinden otomatik 400ms ease-in-out
// cross-fade ile oluyor (bkz. app/globals.css).
//
// Alt navigasyon artık global (bkz. app/GlobalNav.tsx, app/layout.tsx) -
// bu sayfa kendi BottomNav'ını render etmiyor.
//
// SAYFALAMA: Günler artık 7'lik gruplar halinde, sınırsız sayfa üzerinde
// gösteriliyor (bkz. TOTAL_JOURNEY_DAYS, lib/journeyContent.ts) - burada
// hiçbir yerde "105" sabit yazılı değil. Depo 365 güne çıkarılırsa bu
// dosyada HİÇBİR değişiklik gerekmiyor, sayfalama otomatik genişliyor.
//
// KİLİT: Herhangi bir gün serbestçe gezilebiliyor ama sadece unlocked
// günlerin (day <= journeyDay) kartına dokunmak o günün mesajını açıyor
// (bkz. handleOpenDay). Development modunda kilit tamamen bypass ediliyor -
// geliştirici HERHANGİ bir günü önizleyebiliyor (bkz. Developer Panel'in
// aynı /aftercare?preview=1 mekanizması).

const COOLDOWN_TICK_MS = 1000
const PAGE_TRANSITION_MS = 180

function CheckIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9.5L13 1.5" stroke="#F3CE8E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DottedCircle() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle
        cx="5"
        cy="5"
        r="4"
        stroke="rgba(255, 255, 255, 0.28)"
        strokeWidth="1.2"
        strokeDasharray="1.4 2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M14 5L8 12L14 19' : 'M10 5L16 12L10 19'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="#E3C08C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowButton({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'left' ? 'Previous days' : 'Next days'}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255, 178, 90, 0.3)',
        background: 'rgba(255, 178, 90, 0.04)',
        cursor: 'pointer',
      }}
    >
      <ChevronIcon direction={direction} />
    </button>
  )
}

function DayCard({
  day,
  completed,
  locked,
  onOpen,
  onOpenReward,
}: {
  day: number
  completed: boolean
  locked: boolean
  onOpen?: () => void
  onOpenReward?: () => void
}) {
  const active = completed
  const { t } = useLocale()

  return (
    <div
      onClick={locked ? undefined : onOpen}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        height: '312px',
        borderRadius: '22px',
        border: active ? '1px solid rgba(255, 178, 90, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
        background: active ? 'rgba(255, 178, 90, 0.045)' : 'rgba(255, 255, 255, 0.015)',
        boxShadow: active ? '0 0 16px 1px rgba(255, 178, 90, 0.16)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0 18px',
        cursor: locked ? 'default' : 'pointer',
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '11px',
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
          color: active ? '#E3C08C' : 'rgba(255, 255, 255, 0.32)',
        }}
      >
        {t('journey.day')}
      </div>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '18px',
          marginTop: '2px',
          color: active ? '#F3CE8E' : 'rgba(255, 255, 255, 0.55)',
        }}
      >
        {day}
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '14px',
        }}
      >
        {day % 7 === 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onOpenReward?.()
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              cursor: 'pointer',
            }}
          >
            <RewardBadge size={34} />
          </div>
        )}
        {active ? (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              flexShrink: 0,
              background: 'radial-gradient(circle at 35% 30%, #FFD9A0 0%, #FFB347 45%, #F08A24 100%)',
              boxShadow: '0 0 6px 1px rgba(255, 178, 90, 0.5)',
            }}
          />
        ) : (
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              flexShrink: 0,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          />
        )}
        <div
          style={{
            flex: 1,
            width: active ? '2px' : '1px',
            marginTop: '8px',
            borderRadius: '2px',
            background: active
              ? 'linear-gradient(180deg, rgba(255, 178, 90, 0.9) 0%, rgba(255, 178, 90, 0.25) 100%)'
              : 'rgba(255, 255, 255, 0.12)',
            boxShadow: active ? '0 0 5px rgba(255, 178, 90, 0.35)' : 'none',
          }}
        />
      </div>

      <div style={{ marginTop: '14px', height: '10px', display: 'flex', alignItems: 'center' }}>
        {active ? <CheckIcon /> : <DottedCircle />}
      </div>
    </div>
  )
}

export default function Journey() {
  const router = useRouter()
  const { unlocked, setJourneyRevealPending } = useAppNav()
  const { t } = useLocale()
  const [dimmed, setDimmed] = useState(false)
  const [journeyDay, setJourneyDay] = useState(0)
  const [cooldownMs, setCooldownMs] = useState<number | null>(null)
  const journeyTimestampRef = useRef<number | null>(null)
  // Hikaye Arşivi sadece hesabı olan kullanıcıya (arşiv kullanıcı kimliğine
  // bağlı, bkz. lib/storyArchive.ts). Mount sonrası okunuyor - hydration güvenli.
  const [hasArchive, setHasArchive] = useState(false)
  const archiveRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(TOTAL_JOURNEY_DAYS / CHAPTER_LENGTH)
  const [page, setPage] = useState(0)
  const [displayPage, setDisplayPage] = useState<number | null>(null)
  const [fadeVisible, setFadeVisible] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)

  useEffect(() => {
    const stats = getStoredStats()
    setHasArchive(!!getStoredUser()?.id)
    setJourneyDay(stats.journeyDay)
    journeyTimestampRef.current = stats.journeyTimestamp
    setCooldownMs(getCooldownRemainingMs(stats.journeyTimestamp))
    // Sayfa, kullanıcının GERÇEK Journey Day'ini içeren grupla açılıyor -
    // "current day her zaman öne çıkmalı" isteği, aramaya gerek kalmadan.
    const initialPage = stats.journeyDay > 0 ? Math.floor((stats.journeyDay - 1) / CHAPTER_LENGTH) : 0
    setPage(Math.min(totalPages - 1, initialPage))

    const interval = setInterval(() => {
      setCooldownMs(getCooldownRemainingMs(journeyTimestampRef.current))
    }, COOLDOWN_TICK_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sayfa geçişi: 180ms çıkış + 180ms giriş (~360ms toplam) - solma + çok
  // hafif yatay kayma, agresif bir slayt değil.
  useEffect(() => {
    if (displayPage === null) {
      setDisplayPage(page)
      return
    }
    if (displayPage === page) return
    setFadeVisible(false)
    const t = setTimeout(() => setDisplayPage(page), PAGE_TRANSITION_MS)
    return () => clearTimeout(t)
  }, [page, displayPage])

  useEffect(() => {
    if (displayPage === null) return
    const raf = requestAnimationFrame(() => setFadeVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [displayPage])

  const goToPage = (next: number, dir: 1 | -1) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, next))
    if (clamped === page) return
    setDirection(dir)
    setPage(clamped)
  }

  useEffect(() => {
    if (unlocked) {
      setDimmed(false)
      setJourneyRevealPending(false)
      return
    }
    // Ekran kararana kadar nav'ı tamamen gizli tutuyor - kararınca (aşağıdaki
    // effect) normal akış (Profile nabzı vb.) devam ediyor.
    setJourneyRevealPending(true)
    const t = setTimeout(() => setDimmed(true), DIM_DELAY_MS)
    return () => {
      clearTimeout(t)
      setJourneyRevealPending(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked])

  useEffect(() => {
    if (dimmed) setJourneyRevealPending(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimmed])

  const activePage = displayPage ?? page
  const pageStart = activePage * CHAPTER_LENGTH + 1
  const pageDays = Array.from({ length: CHAPTER_LENGTH }, (_, i) => pageStart + i).filter((d) => d <= TOTAL_JOURNEY_DAYS)

  const hasPrev = activePage > 0
  const hasNext = activePage < totalPages - 1

  // Kilit kontrolü: preview bypass'ı kaldırıldı - artık dev'de de sadece
  // gerçekten unlocked günler açılabiliyor, kimse günü gelmeden ritüel
  // mesajını göremiyor.
  const canOpen = (day: number) => canViewJourneyDay(day, journeyDay)
  const handleOpenDay = (day: number) => {
    if (canViewJourneyDay(day, journeyDay)) {
      router.push(`/aftercare?viewDay=${day}`)
    }
  }
  // Ödül rozeti (Gün 7 ve katları) - kilitli olsa bile HER ZAMAN
  // tıklanabilir, böylece kullanıcı ödülü önceden görüp motive olabilir.
  const handleOpenReward = (day: number) => router.push(`/reward?day=${day}`)

  return (
    <main
      style={{
        // Hikaye Arşivi ekranın altına eklendi - sayfa artık aşağı kayıyor.
        minHeight: '100dvh',
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'calc(28px + env(safe-area-inset-top)) 20px 0',
        opacity: dimmed ? 0.25 : 1,
        pointerEvents: unlocked ? 'auto' : 'none',
        transition: 'opacity 900ms ease-in-out',
        overflowX: 'hidden',
      }}
    >
      {/* İlk ekran: alt menünün üstüne kadar uzanıyor, arşive inen ok EN
          ALTTA - menünün arkasında kesilmeden her zaman tam görünüyor. İçerik
          küçük ekranda daha uzunsa ok da onunla birlikte aşağı kayıyor. */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 'calc(100dvh - 28px - env(safe-area-inset-top) - 72px - env(safe-area-inset-bottom))',
        }}
      >
        <VelisMark />

        <h1
          style={{
            margin: '14px 0 0',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: '26px',
            color: '#F5F0EA',
          }}
        >
          {t('journey.title')}<span style={{ color: '#E3C08C' }}>.</span>
        </h1>
        <p
          style={{
            margin: '10px 0 0',
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: '14px',
            letterSpacing: '0.1px',
            color: '#D2CCC5',
          }}
        >
          {t('journey.subtitle')}
        </p>

        <div
          style={{
            marginTop: '28px',
            width: '100%',
            maxWidth: '632px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ width: '36px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            {hasPrev && <ArrowButton direction="left" onClick={() => goToPage(activePage - 1, -1)} />}
          </div>

          <div
            style={{
              flex: 1,
              maxWidth: '560px',
              margin: '0 auto',
              display: 'flex',
              gap: '8px',
              opacity: fadeVisible ? 1 : 0,
              transform: fadeVisible ? 'translateX(0px)' : `translateX(${direction * 8}px)`,
              transition: `opacity ${PAGE_TRANSITION_MS}ms ease-in-out, transform ${PAGE_TRANSITION_MS}ms ease-in-out`,
            }}
          >
            {pageDays.map((day) => (
              <DayCard
                key={day}
                day={day}
                completed={day <= journeyDay}
                locked={!canOpen(day)}
                onOpen={() => handleOpenDay(day)}
                onOpenReward={() => handleOpenReward(day)}
              />
            ))}
          </div>

          <div style={{ width: '36px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            {hasNext && <ArrowButton direction="right" onClick={() => goToPage(activePage + 1, 1)} />}
          </div>
        </div>

        {journeyTimestampRef.current !== null && (
          <div
            className={cooldownMs === null ? 'journey-ready--pulse' : undefined}
            style={{
              marginTop: '18px',
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '18px',
              border: '1px solid rgba(255, 178, 90, 0.22)',
              background: 'rgba(255, 178, 90, 0.03)',
              padding: '16px 20px',
              transition: 'border-color 300ms ease-in-out, box-shadow 300ms ease-in-out',
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: '11px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#9A948C',
              }}
            >
              {t('journey.nextDay.label')}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', color: '#D2CCC5' }}>
              {t('journey.nextDay.availableIn')}
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: '22px',
                letterSpacing: '0.5px',
                color: '#E3C08C',
              }}
            >
              {formatCooldown(cooldownMs ?? 0)}
            </div>
          </div>
        )}

        {hasArchive && <div style={{ height: '16px', flexShrink: 0 }} />}
        {hasArchive && (
          <button
            onClick={() => archiveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label={t('journey.toArchive')}
            style={{
              marginTop: 'auto',
              marginBottom: '6px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#F5F0EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {hasArchive && (
        <div ref={archiveRef} style={{ marginTop: '56px', width: '100%', display: 'flex', justifyContent: 'center', scrollMarginTop: 'calc(24px + env(safe-area-inset-top))' }}>
          <StoryArchive />
        </div>
      )}

      <div style={{ height: 'calc(108px + env(safe-area-inset-bottom))', flexShrink: 0 }} />
    </main>
  )
}
