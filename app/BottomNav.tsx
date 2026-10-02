'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from './contexts/LocaleContext'

const SANS = '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif'

export type TabKey = 'journey' | 'ritual' | 'leaderboard' | 'profile'

function NavIcon({ kind }: { kind: TabKey }) {
  const common = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none' as const }
  if (kind === 'journey') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      </svg>
    )
  }
  if (kind === 'ritual') {
    return (
      <svg {...common}>
        <rect x="9.2" y="2.5" width="5.6" height="19" rx="2.8" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }
  if (kind === 'leaderboard') {
    return (
      <svg {...common}>
        <path
          d="M4.5 9L8 11.5L12 5L16 11.5L19.5 9L18 18H6L4.5 9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const TABS: { key: TabKey; label: string; href: string | null }[] = [
  { key: 'journey', label: 'Journey', href: '/journey' },
  { key: 'ritual', label: 'Ritual', href: '/' },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' },
  { key: 'profile', label: 'Profile', href: '/profile' },
]

// Hesap oluşturulana kadar (unlocked=false) sadece Profile'a gidilebilir -
// o da amber bir "buraya dokun" halkasıyla vurgulanıyor. Diğer sekmeler
// (üzerinde bulunulan sekme dahil) görünür ama devre dışı/soluk kalıyor.
//
// `active` bilinmeyen bir rota için null olabilir (ör. henüz eşlenmemiş
// gelecekteki bir ekran) - bu durumda hiçbir sekme amber vurgulanmıyor ama
// navigasyon yine de tam işlevsel kalıyor. `resolveHref` verilirse (bkz.
// GlobalNav) her sekmenin kendi son ziyaret edilen alt-yoluna gidiliyor,
// verilmezse sekmenin kök yoluna düşülüyor.
//
// `mounted` KASITLI OLARAK sunucu ve istemcinin İLK render'ında (hydration
// karşılaştırması dahil) `unlocked`/`active` ne olursa olsun HER ZAMAN aynı,
// deterministik "kilitli" durumu üretmesini garanti ediyor - gerçek
// unlocked/active durumu sadece mount SONRASI (useEffect içinde) devreye
// giriyor. Bu, olası herhangi bir zamanlama kaynaklı sunucu/istemci
// farkını kök nedeni ne olursa olsun ortadan kaldırıyor.
export default function BottomNav({
  active,
  unlocked,
  guidedRegistrationActive,
  resolveHref,
}: {
  active: TabKey | null
  unlocked: boolean
  guidedRegistrationActive?: boolean
  resolveHref?: (key: TabKey) => string
}) {
  const router = useRouter()
  const { t } = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveUnlocked = mounted && unlocked
  const effectiveActive = mounted ? active : null
  const effectiveGuidedRegistrationActive = mounted && !!guidedRegistrationActive

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
        background: 'rgba(5, 5, 5, 0.86)',
        backdropFilter: 'blur(20px)',
        zIndex: 10,
      }}
    >
      {/* Sert bir üst çizgi yerine yumuşak geçiş: kayan içerik menünün
          altına girerken kesilmiş gibi değil, yavaşça kararıyormuş gibi görünsün. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '100%',
          height: '28px',
          background: 'linear-gradient(to bottom, rgba(5, 5, 5, 0), rgba(5, 5, 5, 0.86))',
          pointerEvents: 'none',
        }}
      />
      {TABS.map((tab) => {
        const href = mounted && resolveHref ? resolveHref(tab.key) : tab.href
        const gated = !effectiveUnlocked && tab.key !== 'profile'
        const clickable = mounted && !gated && !!href
        const highlighted = effectiveUnlocked ? tab.key === effectiveActive : tab.key === 'profile'
        const ctaRing = !effectiveUnlocked && tab.key === 'profile'
        // Statik halka her zaman (hesap yokken) görünür; nabız SADECE
        // kullanıcı ilk ritüelini tamamlayıp Day 1 Aftercare'de Continue'a
        // bastıktan sonra (bkz. AppNavContext, aftercare/page.tsx) ekleniyor -
        // uygulamayı yeni açan biri için soğuk bir "buraya dokun" değil,
        // tam o an davet eden bir his.
        const ctaPulse = ctaRing && effectiveGuidedRegistrationActive

        return (
          <button
            key={tab.key}
            onClick={clickable ? () => router.push(href as string) : undefined}
            disabled={!clickable}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '3px 10px',
              color: highlighted ? '#E3C08C' : 'rgba(255, 255, 255, 0.28)',
              cursor: clickable ? 'pointer' : 'default',
              opacity: gated ? 0.55 : 1,
              transition: 'opacity 300ms ease-in-out, color 300ms ease-in-out',
            }}
          >
            <div
              className={ctaPulse ? 'velis-nav-cta--pulse' : undefined}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: ctaRing ? '1px solid rgba(255, 178, 90, 0.55)' : '1px solid transparent',
                boxShadow: ctaRing ? '0 0 8px 1px rgba(255, 178, 90, 0.22)' : 'none',
                transition: 'border 300ms ease-in-out, box-shadow 300ms ease-in-out',
              }}
            >
              <NavIcon kind={tab.key} />
            </div>
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: '9.5px', letterSpacing: '0.2px' }}>
              {t(`nav.${tab.key}`)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
