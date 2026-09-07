'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { describeArcSegment } from '../utils/geometry'
import { getStoredStats } from '../lib/auth'
import { getUserType } from '../lib/onboarding'
import { getJourneyDayContent, canViewJourneyDay } from '../services/JourneyService'
import type { JourneyDayContent } from '../lib/journeyContent'
import { FONT_SANS } from '../lib/typography'
import { isDev } from '../constants/env'
import { useAppNav } from '../contexts/AppNavContext'
import { setAppState } from '../services/AppStateManager'
import { isGuideCompleted, setGuideCompleted } from '../lib/guide'
import { getGuideScript } from '../guide/guideScript'
import GuideOverlay from '../guide/GuideOverlay'
import { useLocale } from '../contexts/LocaleContext'

function triggerHaptic() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8)
    } catch {
      // no-op
    }
  }
}

// Journey ekranı - Ritual Complete'in doğal devamı. Aynı tasarım dili:
// siyah zemin, aynı tipografi sistemi, aynı amber vurgu, aynı sakin/minimal
// Apple estetiği. Ödül (+10 XP) kasıtlı olarak ikincil - önce mesaj, sonra
// ödül hissedilsin diye en son ve en sessiz beliriyor.
//
// Sıralama: 0ms ekran belirir, 400ms logo+DAY 1, 700ms başlık+alt metin,
// 1200ms Continue, 1800-2000ms +10 XP (yukarı doğru 6-8px kayarak, çok
// hafif bir amber parlamayla, sonra hızla sakinleşerek).

const LOGO_MS = 400
const HEADLINE_MS = 700
const BUTTON_MS = 1200
const XP_MS = 1900
const XP_SETTLE_MS = XP_MS + 400

const RING_R = 32
const RING_GAP_HALF_DEG = 6
const OBJECT_WIDTH = 4
const OBJECT_HEIGHT = 78
const CORE_SIZE = 6

const topRightD = describeArcSegment(RING_R, 270 + RING_GAP_HALF_DEG, 360)
const bottomRightD = describeArcSegment(RING_R, 90 - RING_GAP_HALF_DEG, 0)
const topLeftD = describeArcSegment(RING_R, 270 - RING_GAP_HALF_DEG, 180)
const bottomLeftD = describeArcSegment(RING_R, 90 + RING_GAP_HALF_DEG, 180)

const ringPathStyle = {
  fill: 'none',
  stroke: '#F6F2EB',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
}

export default function Aftercare() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: '#050505' }} />}>
      <AftercareContent />
    </Suspense>
  )
}

// useSearchParams() (Developer Panel'in Journey Preview'i için) Next.js'te
// bir Suspense sınırı gerektiriyor - bkz. yukarıdaki sarmalayıcı.
function AftercareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshAppState, setRitualLockActive } = useAppNav()
  const { t, locale } = useLocale()
  // app/page.tsx'in ritüel tamamlanır tamamlanmaz (journeyTimestamp henüz
  // null'dan çıkmadan HEMEN önce) yakaladığı "bu gerçekten ilk ritüel mi"
  // sinyali - bkz. handleContinue. Bu ekran bu bilgiyi SADECE Continue
  // tıklanınca Guided Registration Mode'u tetiklemek için kullanıyor.
  const isFirstRitual = searchParams.get('firstRitual') === '1'
  // Soğuma (24h) dolmadan tekrar tamamlanan bir ritüel - Journey Day/Streak
  // değişmedi (bkz. app/page.tsx dayAdvancedRef, lib/journey.ts). Bu durumda
  // günün başlık/alt metnini göstermiyoruz (o gün için zaten gösterildi),
  // sadece Day X + kazanılan XP kalıyor.
  const isEarlyRepeat = searchParams.get('earlyRepeat') === '1'
  // VELIS Guide - COMPLETION adımı, sadece gerçek ilk ritüelden sonra.
  // Bu turun SON adımı - dialog bitince "tamamlandı" bayrağı set ediliyor,
  // rehber bir daha HİÇBİR yerde görünmüyor.
  const [showGuide, setShowGuide] = useState(false)
  useEffect(() => setShowGuide(isFirstRitual && !isGuideCompleted()), [isFirstRitual])

  // İlk kullanıcının Day 1 Aftercare ekranı - Continue'a basana kadar alt
  // navigasyon tamamen gizli (bkz. app/page.tsx'teki aynı mantık, Ritual
  // Home'un idle'dan complete'e kadarki tüm fazlarını kapsıyor - bu ekran
  // akışın devamı).
  useEffect(() => {
    setRitualLockActive(isFirstRitual)
    return () => setRitualLockActive(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstRitual])
  // Developer Panel'in "Journey Preview" bölümünden gelen istek (bkz.
  // devpanel/sections/JourneyPreview.tsx) - SADECE development modunda
  // işleniyor, gerçek kullanıcının ilerlemesini asla değiştirmiyor, sadece
  // o günün içeriğini önizlemek için gösteriyor. Kilit kontrolünü tamamen
  // atlıyor - geliştiricinin HERHANGİ bir günü (kilitli olsa bile) görmesi
  // için.
  const isPreview = isDev && searchParams.get('preview') === '1'
  const previewDay = isPreview ? Number(searchParams.get('previewDay')) || 1 : null

  // Journey Overview'da kilidi AÇIK bir günün kartına dokununca gelinen,
  // ÜRETİMDE de çalışan gerçek "geçmiş günü görüntüleme" modu (bkz.
  // app/journey/page.tsx). Kilit kontrolü burada da tekrar yapılıyor
  // (savunma katmanı) - istenen gün gerçekten unlocked değilse bu mod
  // sessizce devre dışı kalıyor ve normal (bugünkü) içerik gösteriliyor.
  const requestedViewDay = Number(searchParams.get('viewDay'))
  const [viewDay, setViewDay] = useState<number | null>(null)
  const isViewingPastDay = viewDay !== null && previewDay === null

  const [mounted, setMounted] = useState(false)
  const [logoVisible, setLogoVisible] = useState(false)
  const [headlineVisible, setHeadlineVisible] = useState(false)
  const [buttonVisible, setButtonVisible] = useState(false)
  const [xpVisible, setXpVisible] = useState(false)
  const [xpSettled, setXpSettled] = useState(false)
  // Bu ekranın içeriği artık sabit değil - Journey İçerik Deposu'ndan
  // (bkz. lib/journeyContent.ts) o an tamamlanmış olan Journey Day'e göre
  // yükleniyor. Yarın Day 16 tamamlanınca burası otomatik olarak Day 16'nın
  // kendi mesajını gösterecek.
  const [content, setContent] = useState<JourneyDayContent | null>(null)

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const userType = getUserType() ?? 'Smoker'
    if (previewDay !== null) {
      setContent(getJourneyDayContent(previewDay, userType, locale))
      return
    }
    const stats = getStoredStats()
    if (Number.isFinite(requestedViewDay) && canViewJourneyDay(requestedViewDay, stats.journeyDay)) {
      // Gerçekten unlocked bir gün - kilit kontrolü burada da yapıldı,
      // URL elle değiştirilse bile kilitli bir güne erişilemiyor.
      setViewDay(requestedViewDay)
      setContent(getJourneyDayContent(requestedViewDay, userType, locale))
      return
    }
    // journeyDay 0 = henüz hiç ritüel tamamlanmamış (beklenmeyen bir durum
    // burada, çünkü bu ekrana ancak bir ritüel tamamlandıktan sonra
    // gelinir) - yine de kırılmaması için Day 1'e düşüyor.
    setContent(getJourneyDayContent(stats.journeyDay || 1, userType, locale))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  useEffect(() => {
    const timers = timersRef.current
    const schedule = (fn: () => void, delay: number) => {
      timers.push(setTimeout(fn, delay))
    }
    setMounted(true)
    schedule(() => setLogoVisible(true), LOGO_MS)
    schedule(() => setHeadlineVisible(true), HEADLINE_MS)
    schedule(() => setButtonVisible(true), BUTTON_MS)
    schedule(() => setXpVisible(true), XP_MS)
    schedule(() => setXpSettled(true), XP_SETTLE_MS)
    // Son çare: reveal zamanlayıcıları WKWebView throttling'de kaybolursa
    // Continue butonu asla tıklanabilir hale gelmez ve ekran takılır. Bu
    // tek zamanlayıcı her şeyi açığa çıkarır.
    schedule(() => {
      setLogoVisible(true)
      setHeadlineVisible(true)
      setButtonVisible(true)
      setXpVisible(true)
      setXpSettled(true)
    }, XP_SETTLE_MS + 3000)
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px 96px',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 500ms ease-in-out',
      }}
    >
      {isPreview && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            color: '#E39C8C',
            border: '1px solid rgba(227, 156, 140, 0.35)',
            background: 'rgba(227, 156, 140, 0.06)',
            borderRadius: '999px',
            padding: '5px 14px',
            zIndex: 20,
          }}
        >
          Preview Mode — Day {previewDay}
        </div>
      )}

      {/* Logo + DAY 1 + alt nokta - küçültülmüş VELIS işareti, sabit
          (büyüme yok), sadece opacity ile beliriyor. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? 'translateY(0px)' : 'translateY(8px)',
          transition: 'opacity 700ms ease-in-out, transform 700ms ease-in-out',
        }}
      >
        <div style={{ position: 'relative', width: `${OBJECT_WIDTH}px`, height: `${OBJECT_HEIGHT}px` }}>
          <svg
            viewBox="-38 -46 76 92"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '76px',
              height: '92px',
              transform: 'translate(-50%, -50%)',
              filter: 'drop-shadow(0 0 4px rgba(255, 178, 90, 0.28)) drop-shadow(0 0 8px rgba(255, 178, 90, 0.14))',
            }}
          >
            <path d={topRightD} style={ringPathStyle} />
            <path d={bottomRightD} style={ringPathStyle} />
            <path d={topLeftD} style={ringPathStyle} />
            <path d={bottomLeftD} style={ringPathStyle} />
          </svg>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #DAD5CE 0%, #F1EEE9 20%, #ECE8E3 50%, #F1EEE9 80%, #DAD5CE 100%)',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${CORE_SIZE}px`,
              height: `${CORE_SIZE}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #FFD9A0 0%, #FFB347 40%, #F08A24 75%, #D9701A 100%)',
              boxShadow: '0 0 5px 1px rgba(255, 178, 90, 0.35), 0 0 10px 3px rgba(240, 138, 36, 0.15)',
            }}
          />
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '2.4px',
            textTransform: 'uppercase',
            color: '#E3C08C',
          }}
        >
          Day {content?.day ?? 1}
        </div>

        <div
          aria-hidden
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#E3C08C',
            boxShadow: '0 0 4px 1px rgba(227, 192, 140, 0.4)',
          }}
        />
      </div>

      {/* Başlık + alt metin - duygusal odak burada, ödülden önce. Soğuma
          dolmadan yapılan erken bir tekrar ritüelinde bu blok hiç
          gösterilmiyor (o günün mesajı zaten gösterildi) - sadece Day X ve
          kazanılan XP kalıyor. */}
      {!isEarlyRepeat && (
        <div
          style={{
            marginTop: '56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            textAlign: 'center',
            opacity: headlineVisible ? 1 : 0,
            transform: headlineVisible ? 'translateY(0px)' : 'translateY(10px)',
            transition: 'opacity 800ms ease-in-out, transform 800ms ease-in-out',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: '26px',
              lineHeight: 1.25,
              color: '#F5F0EA',
            }}
          >
            {(content?.title ?? t('aftercare.welcomeTitle')).split('\n').map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p
            style={{
              margin: 0,
              fontFamily: FONT_SANS,
              fontWeight: 400,
              fontSize: '16px',
              letterSpacing: '0.1px',
              color: '#D2CCC5',
            }}
          >
            {content?.subtitle ?? t('aftercare.welcomeSubtitle')}
          </p>
          {isViewingPastDay && content?.quote && (
            <p
              style={{
                margin: 0,
                fontFamily: FONT_SANS,
                fontWeight: 400,
                fontStyle: 'italic',
                fontSize: '14px',
                color: '#9A948C',
              }}
            >
              &ldquo;{content.quote}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* XP (ikincil, sessiz) + Continue (birincil). XP, Continue'dan SONRA
          beliriyor - kullanıcı önce duygusal ödülü, sonra XP'yi fark etsin. */}
      <div
        style={{
          marginTop: '68px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '26px',
        }}
      >
        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 500,
            fontSize: '12px',
            letterSpacing: '1.4px',
            color: '#E3C08C',
            padding: '11px 26px',
            borderRadius: '999px',
            border: '1px solid rgba(255, 178, 90, 0.3)',
            background: 'rgba(255, 178, 90, 0.03)',
            opacity: xpVisible ? 1 : 0,
            transform: xpVisible ? 'translateY(0px)' : 'translateY(7px)',
            boxShadow: xpSettled
              ? '0 0 6px 0px rgba(255, 178, 90, 0.12)'
              : '0 0 10px 2px rgba(255, 178, 90, 0.28)',
            transition: 'opacity 900ms ease-in-out, transform 900ms ease-in-out, box-shadow 600ms ease-out',
          }}
        >
          +{content?.xp ?? 10} {t('aftercare.xp')}
        </div>

        <button
          className="journey-continue-btn"
          onClick={() => {
            triggerHaptic()
            if (isFirstRitual) {
              setAppState('GUEST')
              refreshAppState()
            }
            const day = content?.day ?? 1
            router.push(day % 7 === 0 ? `/reward?day=${day}` : '/journey')
          }}
          style={{
            padding: '13px 38px',
            borderRadius: '999px',
            border: '1px solid rgba(255, 178, 90, 0.45)',
            background: 'transparent',
            color: '#E3C08C',
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: '16px',
            letterSpacing: '0.3px',
            cursor: 'pointer',
            opacity: buttonVisible ? 1 : 0,
            transform: buttonVisible ? 'translateY(0px)' : 'translateY(8px)',
            transition: 'opacity 700ms ease-in-out, transform 700ms ease-in-out, background 200ms ease-out',
          }}
        >
          {t('common.continue')}
        </button>
      </div>

      {showGuide && (
        <GuideOverlay
          targetRect={null}
          guidePlacement="center"
          lines={getGuideScript(locale).COMPLETION}
          pointing
          onDialogueDone={() => {
            setGuideCompleted()
            setShowGuide(false)
          }}
          onSkip={() => {
            setGuideCompleted()
            setShowGuide(false)
          }}
        />
      )}
    </main>
  )
}
