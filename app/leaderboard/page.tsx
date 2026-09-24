'use client'

import { useEffect, useState } from 'react'
import { getStoredUser, reportUser, blockUser } from '../services/AuthService'
import { getStoredStats, getStoredToken } from '../lib/auth'
import ModerationSheet from '../ModerationSheet'
import { getLeaderboardRequest, avatarUrl } from '../lib/authApi'
import AvatarPhoto from '../AvatarPhoto'
import { buildRanking, getRankOf, formatMetricValue } from '../services/LeaderboardService'
import type { LBUser, Metric } from '../services/LeaderboardService'
import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'

// Leaderboard - "topluluk" listesi SADECE gerçek backend'e (bkz.
// lib/authApi.ts, GET /api/auth/leaderboard) kayıt olmuş kullanıcılardan
// geliyor, sahte/mock veri yok. Giriş yapmış kullanıcının kendi satırı
// ("you") listeden email/id eşleşmesiyle çıkarılıp gerçek localStorage
// istatistikleriyle ayrı ve sabitlenmiş olarak gösteriliyor - Streak/Total
// XP arasında geçiş sadece 400ms'lik bir fade ile oluyor (kayma/yaylanma
// yok), aynı VELIS geçiş dili.

const formatValue = formatMetricValue

function labelStyle(color: string) {
  return {
    fontFamily: FONT_SANS,
    fontWeight: 600 as const,
    fontSize: '11px',
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    color,
  }
}

function primaryButtonStyle() {
  return {
    width: '100%',
    padding: '15px 0',
    borderRadius: '999px',
    border: '1px solid rgba(255, 178, 90, 0.5)',
    background: 'transparent',
    color: '#E3C08C',
    fontFamily: FONT_SANS,
    fontWeight: 600 as const,
    fontSize: '16px',
    letterSpacing: '0.3px',
    cursor: 'pointer' as const,
  }
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M15 5L8 12L15 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg
      width="24"
      height="17"
      viewBox="0 0 24 18"
      fill="none"
      style={{ position: 'absolute', top: '-23px', left: '50%', transform: 'translateX(-50%)' }}
    >
      <path
        d="M2 15L4 5L9 10L12 3L15 10L20 5L22 15H2Z"
        stroke="#E3C08C"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="rgba(227, 192, 140, 0.12)"
      />
    </svg>
  )
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '21px',
        height: '21px',
        borderRadius: '50%',
        background: '#0b0b0b',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_SANS,
        fontWeight: 600,
        fontSize: '11px',
        color: '#D9D3CB',
      }}
    >
      {rank}
    </div>
  )
}

function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2c1 3-2 4-2 7a4 4 0 1 0 8 0c0-1-.4-2-1-2 .6 2-.6 3-1.5 3C17 8 15 5.5 12 2Z"
        stroke="#E3C08C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 14a3 3 0 1 0 6 0c0-1.3-1-2-3-5-2 3-3 3.7-3 5Z" stroke="#E3C08C" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function XPBadge() {
  return (
    <span
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 600,
        fontSize: '10px',
        letterSpacing: '0.6px',
        color: '#E3C08C',
        border: '1px solid rgba(255, 178, 90, 0.35)',
        borderRadius: '999px',
        padding: '3px 8px',
      }}
    >
      XP
    </span>
  )
}

function QuoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
      <path
        d="M7 11c0-3 2-5 5-5v2c-1.7 0-3 1.3-3 3h3v6H6v-4a2 2 0 0 1 1-2Zm9 0c0-3 2-5 5-5v2c-1.7 0-3 1.3-3 3h3v6h-6v-4a2 2 0 0 1 1-2Z"
        fill="#E3C08C"
        opacity="0.8"
      />
    </svg>
  )
}

function Avatar({ name, size, ring, photoUrl }: { name: string; size: number; ring: 'amber' | 'thin' | 'none'; photoUrl?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          ring === 'amber'
            ? 'radial-gradient(circle, rgba(255, 178, 90, 0.14) 0%, rgba(255, 178, 90, 0.03) 70%)'
            : 'rgba(255, 255, 255, 0.04)',
        border:
          ring === 'amber'
            ? '1.5px solid rgba(255, 178, 90, 0.6)'
            : ring === 'thin'
            ? '1px solid rgba(255, 255, 255, 0.15)'
            : 'none',
        boxShadow: ring === 'amber' ? '0 0 12px 1px rgba(255, 178, 90, 0.2)' : 'none',
        overflow: 'hidden',
      }}
    >
      <AvatarPhoto
        src={photoUrl}
        fallback={
          <span
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: `${Math.round(size * 0.34)}px`,
              color: ring === 'amber' ? '#F3CE8E' : '#D9D3CB',
            }}
          >
            {initials}
          </span>
        }
      />
    </div>
  )
}

function PodiumSlot({
  user,
  rank,
  size,
  metric,
  youLabel,
  onOpen,
}: {
  user: LBUser
  rank: number
  size: number
  metric: Metric
  youLabel: string
  onOpen: () => void
}) {
  const displayName = user.isYou ? youLabel : user.firstName
  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: `${size + 24}px`,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <div style={{ position: 'relative' }}>
        {rank === 1 ? <CrownIcon /> : <RankBadge rank={rank} />}
        <Avatar name={user.firstName} size={size} ring={rank === 1 ? 'amber' : 'thin'} photoUrl={user.avatarUrl} />
      </div>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: rank === 1 ? '15px' : '13px',
          color: '#F5F0EA',
          maxWidth: `${size + 30}px`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName}
      </div>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: rank === 1 ? '15px' : '13px',
          color: '#E3C08C',
        }}
      >
        {formatValue(user, metric)}
      </div>
    </button>
  )
}

// "You" satırı artık listenin ayrı, sabit bir parçası değil - rest.map
// içinde diğer herkesle aynı yerde render ediliyor, sadece isYou ile
// vurgulanıyor (amber halka/metin, "You" etiketi kendi adı yerine).
function ListRow({ user, rank, metric, youLabel, onOpen }: { user: LBUser; rank: number; metric: Metric; youLabel: string; onOpen: () => void }) {
  const highlighted = !!user.isYou
  return (
    <button className="lb-row" onClick={onOpen} style={rowStyle(highlighted)}>
      <div style={{ width: '22px', fontFamily: FONT_SANS, fontWeight: 600, fontSize: '13px', color: highlighted ? '#E3C08C' : 'rgba(255, 255, 255, 0.4)' }}>
        {rank}
      </div>
      <Avatar name={user.firstName} size={38} ring={highlighted ? 'amber' : 'thin'} photoUrl={user.avatarUrl} />
      <div style={{ flex: 1, fontFamily: FONT_SANS, fontWeight: highlighted ? 600 : 500, fontSize: '14px', color: '#F5F0EA', textAlign: 'left' }}>
        {highlighted ? youLabel : user.firstName}
      </div>
      <div style={{ fontFamily: FONT_SANS, fontWeight: highlighted ? 600 : 500, fontSize: '14px', color: highlighted ? '#E3C08C' : '#D2CCC5' }}>
        {formatValue(user, metric)}
      </div>
    </button>
  )
}

function rowStyle(highlighted: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '100%',
    padding: '12px 16px',
    borderRadius: '16px',
    border: highlighted ? '1px solid rgba(255, 178, 90, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
    background: highlighted ? 'rgba(255, 178, 90, 0.04)' : 'rgba(255, 255, 255, 0.015)',
    marginBottom: '10px',
    textAlign: 'left' as const,
    cursor: 'pointer' as const,
  }
}

export default function Leaderboard() {
  const { t } = useLocale()
  const [metric, setMetric] = useState<Metric>('streak')
  const [displayMetric, setDisplayMetric] = useState<Metric>('streak')
  const [fadeVisible, setFadeVisible] = useState(true)

  const [you, setYou] = useState<LBUser | null>(null)
  // Sunucu/istemcinin ilk render'ında boş listeyle başlıyor - gerçek kayıtlı
  // kullanıcılar sadece mount SONRASI backend'den çekiliyor (bkz.
  // lib/authApi.ts, GET /api/auth/leaderboard).
  const [community, setCommunity] = useState<LBUser[]>([])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  // Bildirme/engelleme (App Store 1.2) sadece giriş yapmış kullanıcıya - sunucu
  // token istiyor. Menü ModerationSheet'te.
  const [canModerate, setCanModerate] = useState(false)
  const [moderationOpen, setModerationOpen] = useState(false)

  // Canlı sıralama: mount'ta bir kere, sonra her LIVE_REFRESH_MS'de bir sessizce
  // yeniden çekiliyor - kullanıcı ekranda dururken başka birinin ilerlemesi
  // (streak/XP/fotoğraf) sayfayı yenilemeden görünür oluyor. "you" da her
  // yenilemede localStorage'dan taze okunuyor (kendi ritüelin anında yansısın).
  // Sekme/uygulama arka plandayken (bkz. document.visibilityState) istek
  // atılmıyor - pil ve veri boşa gitmesin. Backend tarafı zaten ucuz: okuma
  // istekleri genel hız limitinin dışında tutuluyor (bkz. server/src/index.js
  // isAvatarRead'e benzer şekilde leaderboard herkese açık, token gerekmiyor).
  const LIVE_REFRESH_MS = 12000

  useEffect(() => {
    let cancelled = false
    // İlk yüklemede başarısız olursa liste boş gösterilir (eski davranış);
    // sonraki periyodik/görünürlük tetiklemeli denemelerde başarısızlık
    // sessizce yutulur - mevcut liste olduğu gibi kalır, boşaltılmaz.
    let firstLoad = true

    const refresh = () => {
      const storedUser = getStoredUser()
      // Engellediği kişiler listede/podyumda hiç görünmüyor.
      const blocked = storedUser?.blockedUsers ?? []
      setCanModerate(!!storedUser && !!getStoredToken())

      getLeaderboardRequest()
        .then((res) => {
          if (cancelled) return
          const users: LBUser[] = res.users
            // Kendi satırımız aşağıda "you" olarak ayrı gösteriliyor - listede
            // iki kere görünmesin diye backend id'siyle eşleşeni çıkarıyoruz.
            .filter((u) => u.id !== storedUser?.id && !blocked.includes(u.id))
            .map((u) => ({
              id: u.id,
              firstName: u.name,
              streakDays: u.stats?.currentStreak ?? 0,
              totalXP: u.stats?.totalXP ?? 0,
              quote: 'Keeping the streak alive.',
              avatarUrl: avatarUrl(u.id, u.avatarVersion),
            }))
          setCommunity(users)
        })
        .catch(() => {
          if (!cancelled && firstLoad) setCommunity([])
        })
        .finally(() => {
          firstLoad = false
        })

      if (storedUser) {
        const stats = getStoredStats()
        setYou({
          id: storedUser.id ?? 'you',
          firstName: `${storedUser.firstName} ${storedUser.lastName}`.trim(),
          streakDays: stats.currentStreak,
          totalXP: stats.totalXP,
          quote: 'This is your streak. Keep it going.',
          isYou: true,
          avatarUrl: avatarUrl(storedUser.id, storedUser.avatarVersion),
        })
      }
    }

    refresh()
    // Canlı sıralama: kullanıcı ekranda dururken başka birinin ilerlemesi
    // (streak/XP/fotoğraf) sayfayı yenilemeden görünür olsun diye periyodik
    // olarak (ve sekme/uygulama arka plandan öne dönünce anında) tekrar
    // çekiliyor. Arka planda İSTEK ATILMIYOR (bkz. document.visibilityState) -
    // pil/veri boşa gitmesin. Sunucu ucuz: leaderboard herkese açık, token
    // gerekmiyor, ayrı ve bol bir okuma limiti var (bkz. server/src/index.js).
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, LIVE_REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Streak/Total XP geçişi: 150ms çıkış + 150ms giriş - kayma/yaylanma yok.
  useEffect(() => {
    if (displayMetric === metric) return
    setFadeVisible(false)
    const t = setTimeout(() => setDisplayMetric(metric), 150)
    return () => clearTimeout(t)
  }, [metric, displayMetric])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFadeVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [displayMetric])

  const { top3, rest } = buildRanking(community, you, displayMetric)

  const allUsers = you ? [...community, you] : community
  const selectedUser = selectedId ? allUsers.find((u) => u.id === selectedId) ?? null : null
  const selectedRank = selectedUser ? getRankOf(selectedUser.id, community, you, displayMetric) : null

  const openProfile = (id: string) => {
    setSelectedId(id)
    requestAnimationFrame(() => setOverlayVisible(true))
  }
  const closeProfile = () => {
    setModerationOpen(false)
    setOverlayVisible(false)
    setTimeout(() => setSelectedId(null), 220)
  }

  // Engelle: kişi listeden çıkıyor ve ekran HEMEN kapanıyor - kapanış senkron,
  // zamanlayıcı yok (bkz. AGENTS.md: WKWebView zamanlayıcıları erteliyor).
  const handleBlock = async (): Promise<boolean | 'expired'> => {
    const stored = getStoredUser()
    const target = selectedId
    if (!stored || !target) return false
    const next = await blockUser(stored, target)
    if (next === 'expired') return 'expired'
    if (!next) return false
    setCommunity((prev) => prev.filter((u) => u.id !== target))
    setModerationOpen(false)
    setSelectedId(null)
    setOverlayVisible(false)
    return true
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '56px 20px 0',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '26px',
          color: '#F5F0EA',
          textAlign: 'center',
        }}
      >
        {t('leaderboard.title')}
      </h1>
      <p
        style={{
          margin: '10px 0 0',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: 1.5,
          color: '#D2CCC5',
          textAlign: 'center',
        }}
      >
        {t('leaderboard.subtitle1')}
        <br />
        {t('leaderboard.subtitle2')}
      </p>

      <div style={{ marginTop: '28px', width: '100%', maxWidth: '400px', display: 'flex', gap: '10px' }}>
        {(['streak', 'xp'] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '999px',
              border: metric === m ? '1px solid rgba(255, 178, 90, 0.5)' : '1px solid transparent',
              background: metric === m ? 'rgba(255, 178, 90, 0.06)' : 'transparent',
              color: metric === m ? '#E3C08C' : 'rgba(255, 255, 255, 0.4)',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'border 250ms ease-in-out, background 250ms ease-in-out, color 250ms ease-in-out',
            }}
          >
            {m === 'streak' ? t('leaderboard.tab.streak') : t('leaderboard.tab.xp')}
          </button>
        ))}
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          opacity: fadeVisible ? 1 : 0,
          transition: 'opacity 150ms ease-in-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '18px', marginTop: '40px' }}>
          {top3[1] && (
            <PodiumSlot user={top3[1]} rank={2} size={62} metric={displayMetric} youLabel={t('leaderboard.you')} onOpen={() => openProfile(top3[1].id)} />
          )}
          {top3[0] && (
            <PodiumSlot user={top3[0]} rank={1} size={84} metric={displayMetric} youLabel={t('leaderboard.you')} onOpen={() => openProfile(top3[0].id)} />
          )}
          {top3[2] && (
            <PodiumSlot user={top3[2]} rank={3} size={62} metric={displayMetric} youLabel={t('leaderboard.you')} onOpen={() => openProfile(top3[2].id)} />
          )}
        </div>

        <div style={{ marginTop: '40px' }}>
          {rest.map((u, i) => (
            <ListRow key={u.id} user={u} rank={i + 4} metric={displayMetric} youLabel={t('leaderboard.you')} onOpen={() => openProfile(u.id)} />
          ))}
        </div>
      </div>

      <div style={{ height: '108px', flexShrink: 0 }} />

      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#050505',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            opacity: overlayVisible ? 1 : 0,
            transition: 'opacity 220ms ease-in-out',
            pointerEvents: overlayVisible ? 'auto' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
            <button
              onClick={closeProfile}
              aria-label="Back"
              style={{ background: 'none', border: 'none', color: '#D9D3CB', cursor: 'pointer', display: 'flex' }}
            >
              <ChevronLeftIcon />
            </button>
            {/* Üç nokta artık gerçek bir menü: bildir / engelle. Kendi ekranında ve
                giriş yapmamış kullanıcıda gösterilmiyor (yapacak bir şey yok). */}
            {canModerate && !selectedUser.isYou ? (
              <button
                onClick={() => setModerationOpen(true)}
                aria-label={t('mod.aria.more')}
                style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.55)', fontSize: '18px', letterSpacing: '2px', cursor: 'pointer', padding: '4px 2px' }}
              >
                &#8226;&#8226;&#8226;
              </button>
            ) : (
              <span />
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={selectedUser.firstName} size={104} ring={selectedRank === 1 ? 'amber' : 'thin'} photoUrl={selectedUser.avatarUrl} />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0b0b0b',
                  border: '1px solid rgba(255, 178, 90, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  fontSize: '12px',
                  color: '#E3C08C',
                }}
              >
                {selectedRank}
              </div>
            </div>
            <h2 style={{ marginTop: '18px', fontFamily: FONT_SANS, fontWeight: 600, fontSize: '26px', color: '#F5F0EA' }}>
              {selectedUser.firstName}
            </h2>
            <p style={{ marginTop: '4px', fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', color: '#9A948C' }}>
              Keep showing up.
            </p>

            <div
              style={{
                marginTop: '32px',
                width: '100%',
                maxWidth: '340px',
                display: 'flex',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '20px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={labelStyle('#9A948C')}>Current Streak</div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: '24px', color: '#F5F0EA' }}>
                    {selectedUser.streakDays}
                  </span>
                  <span style={{ fontFamily: FONT_SANS, fontSize: '13px', color: '#9A948C' }}>days</span>
                  <FlameIcon />
                </div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0 16px' }} />
              <div style={{ flex: 1 }}>
                <div style={labelStyle('#9A948C')}>Total XP</div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: '24px', color: '#F3CE8E' }}>
                    {selectedUser.totalXP.toLocaleString()}
                  </span>
                  <XPBadge />
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '20px',
                width: '100%',
                maxWidth: '340px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '18px 20px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <QuoteIcon />
              <p style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', lineHeight: 1.5, color: '#D2CCC5', margin: 0 }}>
                {selectedUser.quote}
              </p>
            </div>
          </div>

          <div style={{ padding: '0 24px 40px' }}>
            <button onClick={closeProfile} style={primaryButtonStyle()}>
              Close
            </button>
          </div>

          {moderationOpen && getStoredUser() && (
            <ModerationSheet
              name={selectedUser.firstName}
              user={getStoredUser()!}
              onClose={() => setModerationOpen(false)}
              onReport={() => reportUser(selectedUser.id)}
              onBlock={handleBlock}
              onUserChange={() => {}}
            />
          )}
        </div>
      )}
    </main>
  )
}
