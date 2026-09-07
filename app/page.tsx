'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import RitualObject, { ACTIVATING_MS } from './RitualObject'
import { isGuideCompleted, setGuideCompleted } from './lib/guide'
import { getGuideScript } from './guide/guideScript'
import GuideOverlay from './guide/GuideOverlay'
import useTargetRect from './guide/useTargetRect'
import IntroSplash from './IntroSplash'
import LanguageSelectScreen from './LanguageSelectScreen'
import WhoAreYouScreen from './WhoAreYouScreen'
import WelcomeScreen from './WelcomeScreen'
import { useAppNav } from './contexts/AppNavContext'
import { useLocale } from './contexts/LocaleContext'
import { completeRitual } from './lib/journey'
import { getStoredStats } from './lib/auth'
import { playSound, startAmbient, stopAmbient } from './lib/sound'
import {
  loadRitualSession,
  saveRitualSession,
  patchRitualSession,
  clearRitualSession,
} from './lib/ritualSession'
import {
  hasSeenWelcome,
  markWelcomeSeen,
  getUserType,
  saveUserType,
  hasSelectedLanguage,
  markLanguageSelected,
} from './lib/onboarding'
import type { UserType } from './lib/onboarding'
import { getRitualDurationSec, PRODUCTION_RITUAL_DURATION_SEC } from './lib/ritualConfig'
import { FONT_SANS } from './lib/typography'
import { isDev } from './constants/env'
import { factoryReset } from './services/DeveloperService'
import { setAppState } from './services/AppStateManager'

// Ritüel süresi artık merkezi bir yapılandırma servisinden geliyor (bkz.
// lib/ritualConfig.ts) - burada hiç sabitlenmiyor. Ekran her ritüel
// başlangıcında taze bir değer okuyor, böylece Developer Panel'deki bir
// değişiklik yeniden başlatma/yenileme olmadan bir sonraki ritüele
// yansıyor.

type Phase = 'idle' | 'activating' | 'ready' | 'ritual' | 'complete'

function triggerHaptic() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(12)
    } catch {
      // desteklenmiyorsa sessizce geç
    }
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Basit, minimal "dokun" ikonu - parmak + hafif dokunuş dalgası çizgileri.
function TapIcon({ size = 40, color = '#D9C9AE' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 26V12a3 3 0 0 1 6 0v10" />
      <path d="M24 22V10a3 3 0 0 1 6 0v13" />
      <path d="M30 23V14a3 3 0 0 1 6 0v14c0 6-4 10-10 10h-2c-3.5 0-5.5-1-8-4l-4.5-5.5a2.3 2.3 0 0 1 3.3-3.2L18 27" />
      <path d="M34 8c1.6 1 2.6 2.6 2.6 4.6" opacity="0.6" />
      <path d="M37 5c2.4 1.6 3.8 4 3.8 6.8" opacity="0.4" />
    </svg>
  )
}

// Aktivasyon tamamlandı onay kutusundaki amber onay işareti.
function CheckIcon({ size = 26, color = '#E3B96B' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<main style={{ height: '100dvh', background: '#050505' }} />}>
      <HomeInner />
    </Suspense>
  )
}

// `?reset=1` (bkz. useSearchParams() - Suspense sınırı gerektiriyor, yukarıdaki
// sarmalayıcıya bkz.) - telefondan/tarayıcıdan tek bağlantıyla, Dev Panel'e
// girmeden, sanki hiç girilmemiş gibi taze bir duruma dönmek için (dev-only).
function HomeInner() {
  const searchParams = useSearchParams()
  const { setIntroActive, introPlayed, markIntroPlayed } = useAppNav()
  // Intro bu oturumda zaten oynadıysa (ör. kullanıcı Ritual sekmesine
  // tekrar dokundu) tekrar oynatmıyoruz - sadece uygulama gerçekten yeni
  // açıldığında bir kez oynuyor.
  const [introDone, setIntroDone] = useState(introPlayed)
  // Varsayılan: true (hiçbir şey gösterme) - introPlayed gibi oturum bazlı
  // bir değere DEĞİL, kalıcı gerçek bayrağa bağlı (bkz. lib/onboarding.ts).
  // Hydration-safe: gerçek değer mount SONRASI aşağıdaki effect'te okunuyor
  // (introPlayed'e bağlı olsaydı, intro bu oturumda daha önce oynadıysa -
  // ör. hot-reload/sekme geçişi - Welcome/WhoAreYou hiç kontrol edilmeden
  // atlanırdı).
  const [languageDone, setLanguageDone] = useState(true)
  const [userTypeDone, setUserTypeDone] = useState(true)
  const [welcomeDone, setWelcomeDone] = useState(true)

  // introPlayed (sessionStorage'dan) mount SONRASI (bir effect içinde) true
  // olabilir - introDone'un başlangıç değeri bunu kaçırmışsa burada
  // yakalıyoruz. SADECE ileri yönde (false -> true) senkronluyor, ASLA
  // introDone'u zaten true iken false'a döndürmüyor.
  useEffect(() => {
    if (introPlayed) setIntroDone(true)
  }, [introPlayed])

  useEffect(() => {
    if (isDev && searchParams.get('reset') === '1') {
      factoryReset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLanguageDone(hasSelectedLanguage())
    setUserTypeDone(getUserType() !== null)
    setWelcomeDone(hasSeenWelcome())
  }, [])

  // Splash + WhoAreYou + Welcome boyunca alt navigasyonu global olarak gizli
  // tutuyor (bkz. GlobalNav) - Ritual Home gerçekten göründüğü an tekrar
  // görünür oluyor (bkz. handleIntroFinish/handleUserTypeChosen/
  // handleWelcomeContinue).
  useEffect(() => {
    if (introPlayed) return
    setIntroActive(true)
    return () => setIntroActive(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleIntroFinish = () => {
    setIntroDone(true)
    markIntroPlayed()
    if (hasSelectedLanguage() && getUserType() !== null && hasSeenWelcome()) setIntroActive(false)
  }

  const handleLanguageChosen = () => {
    markLanguageSelected()
    setLanguageDone(true)
    if (getUserType() !== null && hasSeenWelcome()) setIntroActive(false)
  }

  const handleUserTypeChosen = (type: UserType) => {
    saveUserType(type)
    setUserTypeDone(true)
    if (hasSeenWelcome()) setIntroActive(false)
  }

  const handleWelcomeContinue = () => {
    markWelcomeSeen()
    setWelcomeDone(true)
    setIntroActive(false)
  }

  return (
    <>
      <Landing />
      {introDone && userTypeDone && !welcomeDone && (
        <WelcomeScreen onContinue={handleWelcomeContinue} userType={getUserType() ?? 'Smoker'} />
      )}
      {introDone && languageDone && !userTypeDone && <WhoAreYouScreen onChoose={handleUserTypeChosen} />}
      {introDone && !languageDone && <LanguageSelectScreen onChoose={handleLanguageChosen} />}
      {!introDone && <IntroSplash onFinish={handleIntroFinish} />}
    </>
  )
}

function Landing() {
  const router = useRouter()
  const { setRitualLockActive, introActive } = useAppNav()
  const { t, locale } = useLocale()
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  // Sunucu/istemcinin ilk render'ında AYNI deterministik varsayılanla
  // başlıyor (bkz. lib/ritualConfig.ts) - Developer Panel'in geçersiz
  // kıldığı gerçek süre sadece mount SONRASI (aşağıdaki effect) okunuyor,
  // hydration uyuşmazlığı riskini tamamen ortadan kaldırıyor.
  const [secondsLeft, setSecondsLeft] = useState(PRODUCTION_RITUAL_DURATION_SEC)
  // O an SÜREN ritüelin gerçekte hangi süreyle başladığı - ritüel bitince
  // completeRitual() burayı okuyor, config ritüel ORTASINDA değişse bile
  // XP/toplam süre kaydı gerçekte yaşanan süreyi yansıtıyor.
  const activeDurationRef = useRef(PRODUCTION_RITUAL_DURATION_SEC)
  // Ritüel sırasında basılı tutma - timer'ı ASLA etkilemez, sadece
  // duygusal/dokunsal bir katman (isteğe bağlı, tekrar tekrar yapılabilir).
  const [isHoldingRitual, setIsHoldingRitual] = useState(false)
  // Her basışta artan sayaç - CSS "press pulse" (1.0 -> 1.08 -> 1.0, 220ms)
  // animasyonunu her dokunuşta baştan oynatmak için key olarak kullanılıyor.
  const [pressPulse, setPressPulse] = useState(0)

  // Ritüel bitince: bitiş ekranındaki satırların (başlık/alt satır/ödül/buton)
  // kaçının göründüğü - aynı sıralı/yumuşak fade-in deseni.
  const [completeVisible, setCompleteVisible] = useState(0)
  // RitualObject'e verilen key - "Continue" ile yeni bir tura başlanınca
  // component'i tamamen sıfırdan yeniden monte edip uyanış animasyonunun
  // tekrar oynayabilmesini sağlıyor.
  const [round] = useState(0)

  // VELIS Guide - sadece gerçek ilk ritüelde, "tamamlandı" bayrağı set
  // edilene kadar. RITUAL adımı idle'da gösteriliyor. Gerçek değer sadece
  // mount SONRASI okunuyor (localStorage/getStoredStats SSR'da güvenli
  // varsayılana düşüyor) - hydration uyuşmazlığı riskini ortadan kaldırıyor
  // (bkz. dosya başındaki secondsLeft/ritualConfig deseni).
  const isFirstEverRitualRef = useRef(false)
  const [showRitualGuide, setShowRitualGuide] = useState(false)
  // idle'daki RITUAL adımı, satırları biten rehber figürünü FAZ DEĞİŞMEDEN
  // kaldırabilsin diye ayrı bayrak - showRitualGuide, ilk ritüel SIRASINDAki
  // ORB_XP adımı için hâlâ true kalmalı, o yüzden onu kapatamıyoruz.
  const [idleGuideDone, setIdleGuideDone] = useState(false)
  const objectRef = useRef<HTMLDivElement>(null)
  // Rehber hem idle'da (RITUAL adımı) hem de ilk ritüel SIRASINDA (ORB_XP adımı -
  // "toplara dokun, ekstra XP") objeyi spotlight'lıyor.
  const objectRect = useTargetRect(objectRef, showRitualGuide && (phase === 'idle' || phase === 'ritual'))

  useEffect(() => {
    isFirstEverRitualRef.current = getStoredStats().journeyTimestamp === null
    setShowRitualGuide(!isGuideCompleted() && isFirstEverRitualRef.current)
  }, [])

  // ---- Amber çekirdek toplama mekaniği: ritüel sırasında rastgele
  // konumlarda beliren, büyütülmüş amber toplar. Dokununca yavaşça kaybolup
  // +XP veriyor, ~1sn sonra yeni bir top başka bir yerde beliriyor. 3sn
  // içinde art arda dokunursa ödül +5 artarak birikiyor (5, 10, 15...);
  // 3sn'den uzun ara verilirse +5'e sıfırlanıyor. Toplanan XP ritüel
  // bitince gerçek toplam XP'ye ekleniyor (bkz. completeRitual bonusXP).
  const [orb, setOrb] = useState<{ x: number; y: number; fading: boolean } | null>(null)
  const [orbPopups, setOrbPopups] = useState<{ id: number; x: number; y: number; text: string }[]>([])
  const comboStepRef = useRef(5)
  const lastOrbTapRef = useRef<number | null>(null)
  const orbXPRef = useRef(0)
  const [orbBonusXP, setOrbBonusXP] = useState(0)
  const orbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popupIdRef = useRef(0)

  // Objenin gerçek ekran konumuna göre - toplar objeye ASLA değmiyor (min
  // boşluk) ve ondan çok da uzaklaşmıyor (max mesafe), sağında/solunda
  // rastgele, dikeyde objenin boyu içinde bir yere yerleşiyor.
  const ORB_MIN_GAP = 46
  const ORB_MAX_DIST = 120
  const ORB_SIZE = 18
  const spawnOrb = () => {
    const rect = objectRef.current?.getBoundingClientRect()
    if (!rect) return
    const side = Math.random() < 0.5 ? -1 : 1
    // `x` topun MERKEZİ olacak (transform: translate(-50%,-50%)) - gerçek
    // boşluk objenin kenarından topun kenarına kadar olsun diye yarıçapı
    // (ORB_SIZE/2) mesafeye ekliyoruz.
    const dist = ORB_SIZE / 2 + ORB_MIN_GAP + Math.random() * (ORB_MAX_DIST - ORB_MIN_GAP)
    let x = side === -1 ? rect.left - dist : rect.right + dist
    x = Math.max(ORB_SIZE, Math.min(window.innerWidth - ORB_SIZE, x))
    const y = Math.max(
      ORB_SIZE + 60,
      Math.min(window.innerHeight - ORB_SIZE - 60, rect.top + rect.height * 0.15 + Math.random() * rect.height * 0.7)
    )
    setOrb({ x, y, fading: false })
  }

  useEffect(() => {
    if (phase === 'ritual') {
      // Başka sekmeden geri dönülüp ritüel geri yüklendiyse o ana kadar
      // toplanmış bonus XP korunuyor; taze başlangıçta oturum orbXP:0 ile
      // yazıldığı için yine 0 (bkz. handleStartRitual, ritualSession.ts).
      const session = loadRitualSession()
      orbXPRef.current = session?.phase === 'ritual' ? session.orbXP : 0
      comboStepRef.current = 5
      lastOrbTapRef.current = null
      // Süre ekran dışındayken dolduysa top yaratma - completion effect'i
      // hemen devralıp ritüeli tamamlayacak.
      if (secondsLeft > 0) spawnOrb()
    } else {
      setOrb(null)
      setOrbPopups([])
      if (orbTimerRef.current) clearTimeout(orbTimerRef.current)
      // 'complete' zaten yumuşak fade ile durdurdu - burası idle'a/başka
      // faza atlanan diğer tüm yolları güvenceye alıyor (no-op'sa zararsız).
      if (phase !== 'complete') stopAmbient()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const handleOrbTap = () => {
    if (!orb || orb.fading) return
    triggerHaptic()
    playSound('orb')
    const now = Date.now()
    const withinCombo = lastOrbTapRef.current !== null && now - lastOrbTapRef.current <= 3000
    // 30'a ulaşınca (üst sınır) bir sonraki dokunuşta süre içinde olsa bile
    // döngü baştan başlıyor - 5, 10, 15, 20, 25, 30, 5, 10...
    comboStepRef.current = withinCombo && comboStepRef.current < 30 ? comboStepRef.current + 5 : 5
    const award = comboStepRef.current
    lastOrbTapRef.current = now
    orbXPRef.current += award
    // Her dokunuşta kalıcılaştır - ritüel ortasında sekme değişse bile
    // toplanan bonus XP geri dönüşte korunuyor.
    patchRitualSession({ orbXP: orbXPRef.current })

    const id = ++popupIdRef.current
    const { x, y } = orb
    setOrbPopups((p) => [...p, { id, x, y, text: `+${award}` }])
    setTimeout(() => setOrbPopups((p) => p.filter((pp) => pp.id !== id)), 750)

    setOrb((o) => (o ? { ...o, fading: true } : o))
    if (orbTimerRef.current) clearTimeout(orbTimerRef.current)
    orbTimerRef.current = setTimeout(() => {
      setOrb(null)
      orbTimerRef.current = setTimeout(spawnOrb, 450)
    }, 500)
  }

  const activatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // completeRitual() çağrılmadan HEMEN önceki durumu yakalıyor - bu, "gerçek
  // ilk ritüel mi" sorusunun cevaplanabildiği TEK an (journeyTimestamp
  // completeRitual içinde senkron olarak null'dan çıkıyor). Aftercare
  // ekranına Guided Registration Mode'u tetikleyip tetiklememesi gerektiğini
  // söylemek için bir query param olarak taşınıyor (bkz. handleContinue).
  const isFirstRitualRef = useRef(false)
  // Bu ritüel Journey Day'i GERÇEKTEN ilerletti mi (ilk ritüel VEYA 24
  // saatlik soğuma dolmuştu) - yoksa soğuma dolmadan tekrar yapılan bir
  // "erken" ritüeldi (XP yine arttı ama Day/Streak aynı kaldı). Aftercare
  // ekranına query param olarak taşınıyor, erken tekrarlarda başlık/alt
  // metni gizlemesi için (bkz. handleContinue).
  const dayAdvancedRef = useRef(true)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Mount sonrası gerçek yapılandırmayı okuyor (bkz. lib/ritualConfig.ts) -
  // Developer Panel'de değiştirilmiş bir süre varsa, henüz ritüel
  // başlamadan önceki gösterim bunu yansıtıyor.
  useEffect(() => {
    const configured = getRitualDurationSec()
    activeDurationRef.current = configured
    setSecondsLeft(configured)
  }, [])

  // ---- YARIM KALMIŞ RİTÜELİ GERİ YÜKLE ----
  // Ritüel sırasında başka sekmeye geçip dönünce ('/' unmount oluyordu),
  // React state'i sıfırdan başlıyordu. Oturum (bkz. lib/ritualSession.ts)
  // varsa aktivasyon/hazır/ritüel fazına DUVAR SAATİNE göre geri dönüyoruz -
  // ekran dışında geçen süre de sayılıyor. Sadece mount'ta bir kez.
  useEffect(() => {
    const s = loadRitualSession()
    const now = Date.now()

    if (s?.phase === 'activating') {
      const remainingMs = ACTIVATING_MS - (now - s.phaseStartedAt)
      activeDurationRef.current = s.durationSec
      setSecondsLeft(s.durationSec)
      if (remainingMs <= 0) {
        patchRitualSession({ phase: 'ready', phaseStartedAt: now })
        setPhase('ready')
      } else {
        setPhase('activating')
        activatingTimerRef.current = setTimeout(() => {
          triggerHaptic()
          playSound('ready')
          patchRitualSession({ phase: 'ready', phaseStartedAt: Date.now() })
          setPhase('ready')
        }, remainingMs)
      }
    } else if (s?.phase === 'ready') {
      activeDurationRef.current = s.durationSec
      setSecondsLeft(s.durationSec)
      setPhase('ready')
    } else if (s?.phase === 'ritual') {
      const elapsedSec = Math.floor((now - s.phaseStartedAt) / 1000)
      const remaining = s.durationSec - elapsedSec
      activeDurationRef.current = s.durationSec
      orbXPRef.current = s.orbXP
      if (remaining <= 0) {
        // Süre ekran dışındayken doldu - phase+secondsLeft:0 ile completion
        // effect'ini tetikliyoruz (ritüeli tam olarak bir kez tamamlıyor).
        setSecondsLeft(0)
      } else {
        setSecondsLeft(remaining)
        startAmbient()
      }
      setPhase('ritual')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- GERİ SAYIM ---- phase 'ritual' olduğu sürece saniye başı azalıyor.
  // Effect'e taşındı ki hem handleStartRitual hem de geri yüklenen ritüel
  // aynı yolu kullansın. secondsLeft'i bağımlılığa KOYMUYORUZ - her tik'te
  // interval'ı yeniden kurardı; fonksiyonel güncelleme yeterli.
  useEffect(() => {
    if (phase !== 'ritual' || secondsLeft <= 0) return
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ---- RİTÜEL DİSİPLİNİ ---- Ritüel BOYUNCA uygulamada kalınmalı. Uygulama
  // arka plana atılır / telefon kilitlenir / başka uygulamaya geçilirse
  // (visibilitychange -> hidden) o anki ritüel İPTAL olur: yapılmış
  // sayılmaz, geri dönünce kaldığı yerden DEVAM ETMEZ, sıfırdan başlar.
  //
  // Uygulama İÇİ gezinme (Profile sekmesi vb.) sayfa görünür kaldığı için
  // visibilitychange tetiklemez - orada oturum korunur, ritüel devam eder
  // (bkz. yukarıdaki geri-yükle effect'i). Hesaptan çıkış zaten oturumu
  // ayrıca siliyor (bkz. AuthService.resetDeviceToFirstLaunch).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return
      if (phase !== 'activating' && phase !== 'ready' && phase !== 'ritual') return
      clearRitualSession()
      stopAmbient()
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      if (activatingTimerRef.current) clearTimeout(activatingTimerRef.current)
      orbXPRef.current = 0
      setOrb(null)
      setOrbPopups([])
      setIsHoldingRitual(false)
      setSecondsLeft(getRitualDurationSec())
      setPhase('idle')
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [phase])

  // İlk kullanıcının İLK ritüeli - Ritual Home'a daha ilk vardığı andan
  // (idle) "Ritual complete." ekranına kadar alt navigasyonu tamamen
  // gizleyip Profile'a kaçarak hiç dokunmadan atlamayı engelliyor. Zaten
  // hesabı olan/daha önce ritüel tamamlamış kullanıcılar için hiçbir etkisi
  // yok - günlük ritüeller her zamanki gibi serbest.
  //
  // NOT: 'complete' fazında getStoredStats().journeyTimestamp artık null
  // DEĞİL (completeRitual() zaten çalıştı) - o yüzden bu fazda canlı okuma
  // yerine completeRitual'dan HEMEN önce yakalanmış isFirstRitualRef
  // kullanılıyor (bkz. yukarısı).
  useEffect(() => {
    const isFirstEverRitual = phase === 'complete' ? isFirstRitualRef.current : getStoredStats().journeyTimestamp === null
    setRitualLockActive(isFirstEverRitual)
    return () => setRitualLockActive(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Ritüel sırasında ekranı uyanık tutuyor (Wake Lock API) - tamamlanınca
  // veya ekrandan ayrılınca otomatik serbest bırakılıyor.
  useEffect(() => {
    if (phase !== 'ritual') return
    let sentinel: WakeLockSentinel | null = null
    navigator.wakeLock
      ?.request('screen')
      .then((s) => {
        sentinel = s
      })
      .catch(() => {
        // Desteklenmiyor/reddedildi - sessizce yok say, ritüel yine de çalışır.
      })
    return () => {
      sentinel?.release().catch(() => {})
    }
  }, [phase])

  const clearAllTimers = () => {
    if (activatingTimerRef.current) clearTimeout(activatingTimerRef.current)
    completeTimersRef.current.forEach(clearTimeout)
    completeTimersRef.current = []
  }

  useEffect(() => {
    return () => {
      clearAllTimers()
      if (countdownRef.current) clearInterval(countdownRef.current)
      stopAmbient()
    }
  }, [])

  // ---- 6. RİTÜEL BİTTİ: 90sn dolunca "complete" durumuna geç ----
  // Ritüelin "tamamlandı" sayıldığı TEK an burası - XP/toplam sayaçlar her
  // zaman artıyor, Journey Day/Streak ise sadece 24 saatlik soğuma
  // dolduysa ilerliyor (bkz. lib/journey.ts).
  useEffect(() => {
    if (phase !== 'ritual' || secondsLeft !== 0) return
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setIsHoldingRitual(false)
    clearRitualSession()
    const beforeTimestamp = getStoredStats().journeyTimestamp
    isFirstRitualRef.current = beforeTimestamp === null
    setOrbBonusXP(orbXPRef.current)
    const after = completeRitual(activeDurationRef.current, orbXPRef.current)
    // journeyTimestamp SADECE Journey Day gerçekten ilerlediğinde değişiyor
    // (bkz. lib/journey.ts) - değişmediyse bu erken/tekrar bir ritüeldi.
    dayAdvancedRef.current = after.journeyTimestamp !== beforeTimestamp
    if (isFirstRitualRef.current) setAppState('FIRST_RITUAL_COMPLETED')
    triggerHaptic()
    stopAmbient()
    playSound('complete')
    setPhase('complete')
  }, [phase, secondsLeft])

  // Bitiş ekranı satırları - obje sessizce uykuya dönerken teker teker,
  // yumuşakça beliriyor (kutlama yok, sadece sakin bir kapanış).
  useEffect(() => {
    if (phase !== 'complete') return
    setCompleteVisible(0)
    const delays = [500, 950, 1400]
    delays.forEach((delay, i) => {
      const t = setTimeout(() => setCompleteVisible(i + 1), delay)
      completeTimersRef.current.push(t)
    })
    return () => {
      completeTimersRef.current.forEach(clearTimeout)
      completeTimersRef.current = []
    }
  }, [phase])

  // ---- 2. FIRST TAP: otomatik ~10sn aktivasyon başlar. Sonunda ritüel
  // kendiliğinden BAŞLAMAZ - "Activation complete" onay kutusu çıkar,
  // ritüel ancak kullanıcı "Continue"a basınca başlar. ----
  const handleTap = () => {
    if (phase !== 'idle') return
    triggerHaptic()
    playSound('activate')
    saveRitualSession({
      phase: 'activating',
      phaseStartedAt: Date.now(),
      durationSec: getRitualDurationSec(),
      orbXP: 0,
    })
    setPhase('activating')

    activatingTimerRef.current = setTimeout(() => {
      // ---- 3. AKTİVASYON TAMAMLANDI - onay bekleniyor ----
      triggerHaptic()
      playSound('ready')
      patchRitualSession({ phase: 'ready', phaseStartedAt: Date.now() })
      setPhase('ready')
    }, ACTIVATING_MS)
  }

  // ---- 4. Onay kutusundaki "Continue": ritüeli başlatır - sayaç otomatik
  // işliyor (bkz. spec: hold-to-charge fonksiyonu iptal edildi, asıl
  // etkileşim artık amber toplar - bkz. handleOrbTap). ----
  const handleStartRitual = () => {
    if (phase !== 'ready') return
    triggerHaptic()
    playSound('ritualStart')
    startAmbient()
    // Her ritüel başlangıcında TAZE bir değer okunuyor - Developer Panel'de
    // yapılan bir değişiklik yeniden başlatma/yenileme olmadan bir sonraki
    // ritüele hemen yansıyor (bkz. lib/ritualConfig.ts).
    const duration = getRitualDurationSec()
    activeDurationRef.current = duration
    setSecondsLeft(duration)
    // Oturumu setPhase'den ÖNCE yaz - phase → 'ritual' effect'i orbXP'yi
    // buradan okuyor, taze başlangıçta 0 görmeli. Geri sayım artık bir
    // effect'te (bkz. aşağıdaki countdown effect) - buradan imperatif
    // setInterval kaldırıldı ki geri yüklenen ritüelde de aynı yol çalışsın.
    saveRitualSession({ phase: 'ritual', phaseStartedAt: Date.now(), durationSec: duration, orbXP: 0 })
    setPhase('ritual')
  }

  // ---- RİTÜEL SIRASINDA objeyi basılı tutma: timer'ı ASLA etkilemez,
  // sadece duygusal/dokunsal bir katman (isteğe bağlı, tekrar tekrar
  // yapılabilir). ----
  const handlePressStart = () => {
    if (phase !== 'ritual') return
    setIsHoldingRitual(true)
    setPressPulse((n) => n + 1)
  }

  const handlePressEnd = () => {
    if (phase !== 'ritual') return
    setIsHoldingRitual(false)
  }

  // ---- 7. CONTINUE: bitiş ekranından ana sayfaya DÖNMÜYOR - bir sonraki
  // tam ekran sayfaya geçiyor (yumuşak cross-fade ile, next.config.ts'teki
  // viewTransition ayarı üzerinden). ----
  const handleContinue = () => {
    triggerHaptic()
    if (isFirstRitualRef.current) {
      router.push('/aftercare?firstRitual=1')
      return
    }
    router.push(dayAdvancedRef.current ? '/aftercare' : '/aftercare?earlyRepeat=1')
  }

  return (
    <main
      style={{
        height: '100dvh',
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // Alt boşluk sabit tab bar'ı (BottomNav: ~72px + safe-area-inset-bottom)
        // TAM olarak geçmeli - aksi halde ortalanan içeriğin en alttaki butonu
        // (Başlat / Devam et) tab bar'ın arkasında kalıp kesiliyordu.
        padding: 'calc(20px + env(safe-area-inset-top)) 32px calc(env(safe-area-inset-bottom) + 104px)',
        fontFamily: FONT_SANS,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Sayfa arkasındaki hafif radial gradient - değişmedi */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '900px',
          height: '900px',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(255,179,106,0.05) 0%, rgba(255,179,106,0.02) 35%, rgba(5,5,5,0) 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '640px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0px)' : 'translateY(8px)',
          transition: 'opacity 700ms ease-out, transform 700ms ease-out',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Başlık - idle'da "The ritual." markası, aktivasyon sırasında
            "Activating your ritual..." ile crossfade yapıyor. Sabit bir
            min-height ile yer ayrılıyor ki geçişte layout zıplamasın. */}
        <div style={{ position: 'relative', width: '100%', minHeight: '130px' }}>
          <h1
            style={{
              position: 'absolute',
              top: '30px',
              left: 0,
              right: 0,
              fontFamily: FONT_SANS,
              fontSize: '26px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              color: '#F5F0EA',
              textAlign: 'center',
              opacity: phase === 'activating' ? 0 : 1,
              transition: 'opacity 500ms ease-in-out',
            }}
          >
            {t('ritual.title')}
            <br />
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: '22px',
                color: '#9A948C',
                fontWeight: 400,
                opacity: phase === 'idle' || phase === 'ready' ? 1 : 0,
                transition: 'opacity 500ms ease-in-out',
              }}
            >
              {phase === 'ready' ? t('ritual.ready.subtitle') : t('ritual.subtitle')}
            </span>
          </h1>

          <div
            style={{
              position: 'absolute',
              top: '30px',
              left: 0,
              right: 0,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: '26px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
                color: '#FFFFFF',
                textAlign: 'center',
                opacity: phase === 'activating' ? 1 : 0,
                transition: 'opacity 400ms ease-in-out',
              }}
            >
              {t('ritual.activating.title')}
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: '22px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                marginTop: '20px',
                opacity: phase === 'activating' ? 1 : 0,
                transition: 'opacity 400ms ease-in-out',
                transitionDelay: phase === 'activating' ? '150ms' : '0ms',
              }}
            >
              {t('ritual.activating.subtitle')}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '28px',
            marginBottom: '28px',
          }}
        >
          <div
            ref={objectRef}
            onClick={handleTap}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className="ritual-object--float"
            style={{
              position: 'relative',
              display: 'inline-flex',
              cursor: phase === 'idle' || phase === 'ritual' ? 'pointer' : 'default',
            }}
          >
            {/* Objenin ARKASINDA - çok hafif sıcak glow + neredeyse görünmez
                halkalar. Objenin kendisine hiçbir şekilde dokunmuyor, sadece
                arkasında dekoratif bir katman (bkz. spec: "no visual clutter"). */}
            <div
              aria-hidden
              // "infinite" CSS animasyonu (bkz. globals.css ritualGlowPulse)
              // inline opacity:0'ı GEÇERSİZ KILIYOR - complete fazında
              // class'ı tamamen kaldırmadan glow asla gerçekten sönmüyordu.
              className={phase === 'complete' ? undefined : 'ritual-glow--pulse'}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '260px',
                height: '260px',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(216,174,108,0.16) 0%, rgba(216,174,108,0.05) 45%, rgba(5,5,5,0) 70%)',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: phase === 'complete' ? 0 : 1,
                transition: 'opacity 500ms ease-in-out',
              }}
            />
            <svg
              aria-hidden
              className={phase === 'complete' || phase === 'ready' ? undefined : 'ritual-rings--pulse'}
              viewBox="0 0 240 240"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '240px',
                height: '240px',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: phase === 'complete' || phase === 'ready' ? 0 : 1,
                transition: 'opacity 500ms ease-in-out',
              }}
            >
              <circle cx="120" cy="120" r="70" stroke="#D8AE6C" strokeWidth="1" fill="none" opacity="0.12" />
              <circle cx="120" cy="120" r="95" stroke="#D8AE6C" strokeWidth="1" fill="none" opacity="0.08" />
              <circle cx="120" cy="120" r="118" stroke="#D8AE6C" strokeWidth="1" fill="none" opacity="0.05" />
            </svg>

            {/* Basışta anlık "press pulse" (1.0 -> 1.08 -> 1.0, 220ms) -
                objenin kendisine dokunmadan, sadece dıştan bir katman
                olarak; pressPulse her basışta değiştiği için key ile
                animasyon baştan oynatılıyor. */}
            <div key={pressPulse} className={pressPulse > 0 && isHoldingRitual ? 'ritual-press-pulse' : undefined}>
              <RitualObject
                key={round}
                activating={phase === 'activating' || phase === 'ready'}
                alive={phase === 'ritual'}
                holding={phase === 'ritual' && isHoldingRitual}
                completed={phase === 'complete'}
              />
            </div>
          </div>
        </div>

        {/* ---- METİN KATMANLARI ---- */}
        {/* Tümü aynı konumda üst üste, sadece opacity ile geçiş yapıyor ki
            layout zıplamasın. Sabit bir min-height ile yer ayrılıyor. */}
        <div style={{ position: 'relative', minHeight: '138px', width: '100%', display: 'flex', justifyContent: 'center' }}>
          {/* IDLE: dokun ikonu + "Touch to begin" + alt talimat + "touch and
              hold" bilgi kartı - referans görsele göre yeniden tasarlandı. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              opacity: phase === 'idle' ? 1 : 0,
              transition: 'opacity 500ms ease-in-out',
              pointerEvents: 'none',
            }}
          >
            <div className="ritual-hand--pulse">
              <TapIcon size={38} color="#D9C9AE" />
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: '32px',
                letterSpacing: '0.2px',
                color: '#D8AE6C',
                textAlign: 'center',
              }}
            >
              {t('ritual.idle.cta')}
            </div>
          </div>

          {/* READY: aktivasyon tamamlandı - artık karanlık bir kart değil,
              sinematik bir geçiş; obje hiç örtülmüyor, bu blok onun ALTINDA. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              opacity: phase === 'ready' ? 1 : 0,
              transition: 'opacity 400ms ease-in-out',
              pointerEvents: phase === 'ready' ? 'auto' : 'none',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid rgba(216, 174, 108, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckIcon size={16} color="#D8AE6C" />
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 400,
                fontSize: '14px',
                color: '#9A948C',
                textAlign: 'center',
              }}
            >
              {t('ritual.ready.presence', { seconds: secondsLeft })}
            </div>
            <button
              className="start-ritual-btn"
              onClick={handleStartRitual}
              style={{
                marginTop: '12px',
                width: '220px',
                maxWidth: '78vw',
                padding: '13px 0',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(180deg, #F3CE8E 0%, #D9A254 100%)',
                boxShadow: '0 0 24px 4px rgba(216, 174, 108, 0.35)',
                color: '#171410',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: '15px',
                letterSpacing: '0.2px',
                cursor: 'pointer',
              }}
            >
              {t('ritual.ready.cta')}
            </button>
          </div>

          {/* RITUAL: sayaç */}
          <div
            style={{
              position: 'absolute',
              top: '36px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: phase === 'ritual' ? 1 : 0,
              transition: 'opacity 500ms ease-in-out',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 300,
                fontSize: '48px',
                color: '#F5F0EA',
                textAlign: 'center',
                lineHeight: 1,
              }}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>

          {/* COMPLETE: ritüel bitti - obje sessizce uykuya dönerken, satırlar
              teker teker yumuşakça beliriyor. Kutlama yok, sadece sakin bir
              kapanış. */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              opacity: phase === 'complete' ? 1 : 0,
              transition: 'opacity 600ms ease-in-out',
              pointerEvents: 'none',
            }}
          >
            {orbBonusXP > 0 && (
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  fontSize: '12px',
                  letterSpacing: '0.4px',
                  color: '#E3C08C',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 178, 90, 0.3)',
                  background: 'rgba(255, 178, 90, 0.04)',
                  opacity: completeVisible >= 1 ? 1 : 0,
                  transform: completeVisible >= 1 ? 'translateY(0px)' : 'translateY(8px)',
                  transition: 'opacity 900ms ease-out, transform 900ms ease-out',
                }}
              >
                {t('ritual.complete.bonusXP', { xp: orbBonusXP })}
              </div>
            )}
            <button
              className="continue-btn"
              onClick={handleContinue}
              style={{
                marginTop: '4px',
                padding: '12px 36px',
                borderRadius: '999px',
                border: 'none',
                background: '#ECE8E3',
                color: '#171410',
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: '15px',
                letterSpacing: '0.3px',
                cursor: 'pointer',
                opacity: completeVisible >= 2 ? 1 : 0,
                transform: completeVisible >= 2 ? 'translateY(0px)' : 'translateY(8px)',
                transition: 'opacity 900ms ease-out, transform 900ms ease-out, background 200ms ease-out',
                pointerEvents: completeVisible >= 2 ? 'auto' : 'none',
              }}
            >
              {t('ritual.complete.continue')}
            </button>
          </div>
        </div>
      </div>

      {!introActive && showRitualGuide && !idleGuideDone && phase === 'idle' && (
        <GuideOverlay
          targetRect={objectRect}
          lines={getGuideScript(locale).RITUAL}
          guidePlacement="bottom"
          onDialogueDone={() => setIdleGuideDone(true)}
          onSkip={() => {
            setGuideCompleted()
            setShowRitualGuide(false)
          }}
        />
      )}

      {/* İlk ritüel SIRASINDA - amber toplara dokunup ekstra XP kazanma
          ipucu. Spotlight objede (pointer-events:none) kaldığı için alttaki
          toplar dokunulabilir kalıyor. Kullanıcı satırları geçince ya da
          Atla deyince kapanıyor - COMPLETION rehberi aftercare'de ayrı. */}
      {!introActive && showRitualGuide && phase === 'ritual' && (
        <GuideOverlay
          targetRect={objectRect}
          lines={getGuideScript(locale).ORB_XP}
          guidePlacement="bottom"
          onDialogueDone={() => setShowRitualGuide(false)}
          onSkip={() => setShowRitualGuide(false)}
        />
      )}

      {/* Amber çekirdek toplama katmanı - SADECE ritüel sırasında. Konum
          objenin gerçek piksel konumuna göre (bkz. spawnOrb) - objeye ASLA
          değmiyor, ondan çok da uzaklaşmıyor. */}
      {phase === 'ritual' && (
        <div aria-hidden={false} style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
          {orb && (
            <div
              onClick={handleOrbTap}
              style={{
                position: 'fixed',
                top: `${orb.y}px`,
                left: `${orb.x}px`,
                transform: 'translate(-50%, -50%)',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 34% 28%, #FFFBF0 0%, #FFE3B4 26%, #FFC172 52%, #F0921F 80%, #D9701A 100%)',
                boxShadow:
                  'inset 0 0 3px rgba(255, 245, 220, 0.9), 0 0 8px 2px rgba(255, 196, 120, 0.55), 0 0 18px 5px rgba(240, 138, 36, 0.2)',
                opacity: orb.fading ? 0 : 1,
                transition: 'opacity 480ms ease-in-out',
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
            />
          )}
          {orbPopups.map((p) => (
            <div
              key={p.id}
              className="orb-popup-rise"
              style={{
                position: 'fixed',
                top: `${p.y}px`,
                left: `${p.x}px`,
                transform: 'translate(-50%, -50%)',
                fontFamily: FONT_SANS,
                fontWeight: 700,
                fontSize: '14px',
                color: '#F3CE8E',
                textShadow: '0 0 9px rgba(255, 178, 90, 0.6)',
                pointerEvents: 'none',
              }}
            >
              {p.text}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
