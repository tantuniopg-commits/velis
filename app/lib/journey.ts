import { now } from './time'
import { getStoredStats, saveStats, getStoredToken } from './auth'
import type { VelisStats } from './auth'
import { getDevCooldownOverrideMs } from './devCooldown'
import { updateStatsRequest } from './authApi'

// Gerçek bir hesapla giriş yapılmışsa (bkz. lib/authApi.ts, token varlığı),
// en güncel ilerlemeyi sunucuya da yazıyoruz - başka bir cihaz/tarayıcıdan
// bu hesaba girildiğinde "kaldığı yerden devam" bunun sayesinde çalışıyor.
// Best-effort: başarısız olursa sessizce yutuluyor, yerel ilerleme buna
// bağlı değil (bkz. updateStatsRequest'in kendi yorumu).
// Login sonrası (bkz. app/profile/page.tsx handleSignIn) cihaz-sunucu
// birleştirmesi cihazı öne çıkarırsa, sunucuyu hemen güncellemek için de
// dışa açılıyor - kullanıcı bir ritüel daha yapana kadar beklemesin.
export function syncStatsToServer(stats: VelisStats) {
  const token = getStoredToken()
  if (!token) return
  updateStatsRequest(token, stats).catch(() => {})
}

// VELIS Journey İlerleme Sistemi.
//
// Journey ve XP KASITLI OLARAK bağımsız iki sistem:
// - XP (totalXP/totalRitualCount/totalRitualTimeSec): her tamamlanan
//   ritüelde artar, günlük limit yok, soğuma yok.
// - Journey (journeyDay/currentStreak/journeyTimestamp): sadece 24 saatlik
//   bir soğuma sonrasında tamamlanan bir ritüelle ilerler. Soğumanın
//   dolması TEK BAŞINA günü ilerletmiyor - kullanıcının soğuma bittikten
//   SONRA yeni bir ritüel tamamlaması gerekiyor. Bu yüzden uygulamayı
//   yeniden açmak, arka arkaya ritüel yapmak veya çıkış yapıp tekrar
//   girmek Journey Day'i asla artıramıyor.
//
// journeyDay basit, sınırsız artan bir sayaç - Day 105'in ötesinde
// ölçeklenmesi için özel bir üst sınır yok.

export const XP_PER_RITUAL = 10
export const JOURNEY_COOLDOWN_MS = 24 * 60 * 60 * 1000

// Ödül günü (7, 14, 21...) - kullanıcı o gün "Ödülünü al"a bastığında tek
// seferlik kazandığı XP. Eskiden ortaklık kampanyası (ücretsiz kahve) vardı,
// artık sadece +500 XP.
export const REWARD_XP = 500

// Alınan ödül günleri - hesabın/istatistiğin bir parçası DEĞİL (sunucu
// modelini değiştirmemek için), sadece bu cihazda "aynı ödül iki kez
// alınmasın" guard'ı. XP'nin kendisi zaten stats üzerinden sunucuya
// sync ediliyor (bkz. syncStatsToServer).
const CLAIMED_REWARDS_KEY = 'velis_claimed_rewards'

function getClaimedRewardDays(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLAIMED_REWARDS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

export function isRewardClaimed(day: number): boolean {
  return getClaimedRewardDays().includes(day)
}

// Ödül ekranındaki "Ödülünü al" - tek seferlik +500 XP. Aynı gün ikinci kez
// çağrılırsa hiçbir şey yapmıyor (idempotent), alreadyClaimed=true döner.
export function claimRewardXP(day: number): { stats: VelisStats; alreadyClaimed: boolean } {
  const current = getStoredStats()
  if (isRewardClaimed(day)) return { stats: current, alreadyClaimed: true }
  const next: VelisStats = { ...current, totalXP: current.totalXP + REWARD_XP }
  saveStats(next)
  syncStatsToServer(next)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CLAIMED_REWARDS_KEY, JSON.stringify([...getClaimedRewardDays(), day]))
    } catch {
      // yoksay - guard best-effort, XP yine de yazıldı
    }
  }
  return { stats: next, alreadyClaimed: false }
}
// Ritüel süresi artık lib/ritualConfig.ts'teki merkezi yapılandırma
// servisinden geliyor (getRitualDurationSec()) - burada sabitlenmiyor,
// böylece Developer Panel'in "Ritual Configuration" bölümü değeri
// değiştirebiliyor.

// Gerçek soğuma süresi - Developer Panel development modunda bunu geçici
// olarak değiştirebiliyor (bkz. devCooldown.ts), üretimde her zaman
// JOURNEY_COOLDOWN_MS.
function getActiveCooldownMs(): number {
  return getDevCooldownOverrideMs() ?? JOURNEY_COOLDOWN_MS
}

// Uygulamada bir ritüelin "tamamlandı" sayıldığı TEK giriş noktası -
// bkz. app/page.tsx, ritüel süresi dolup "complete" fazına geçildiği an.
export function completeRitual(durationSec: number, bonusXP: number = 0): VelisStats {
  const current = getStoredStats()
  const t = now()

  const totalXP = current.totalXP + XP_PER_RITUAL + Math.max(0, bonusXP)
  const totalRitualCount = current.totalRitualCount + 1
  const totalRitualTimeSec = current.totalRitualTimeSec + durationSec

  let { journeyDay, currentStreak, journeyTimestamp } = current

  if (journeyTimestamp === null) {
    // İlk ritüel: Journey burada başlıyor.
    journeyDay = 1
    currentStreak = 1
    journeyTimestamp = t
  } else if (t - journeyTimestamp >= getActiveCooldownMs()) {
    // Soğuma dolmuş VE kullanıcı şimdi yeni bir ritüel tamamladı - Journey
    // ancak bu ikisi birlikte gerçekleştiğinde ilerliyor.
    journeyDay += 1
    currentStreak += 1
    journeyTimestamp = t
  }
  // Aksi halde: soğuma hâlâ sürüyor - "erken ritüel". XP/toplam sayaçlar
  // yine de arttı (yukarıda), ama Journey Day/Streak/Timestamp AYNEN kalıyor.

  const next: VelisStats = { journeyDay, currentStreak, journeyTimestamp, totalXP, totalRitualCount, totalRitualTimeSec }
  saveStats(next)
  syncStatsToServer(next)
  return next
}

// Journey ekranındaki geri sayım için: soğuma bitene kadar kalan ms.
// Soğuma yoksa (hiç ritüel yok ya da süre zaten dolmuşsa) null döner -
// ekran bu durumda geri sayımı tamamen gizliyor (Journey Day otomatik
// ilerlemiyor, sadece geri sayım kayboluyor).
export function getCooldownRemainingMs(journeyTimestamp: number | null): number | null {
  if (journeyTimestamp === null) return null
  const remaining = journeyTimestamp + getActiveCooldownMs() - now()
  return remaining > 0 ? remaining : null
}

export function formatCooldown(remainingMs: number): string {
  const totalMinutes = Math.ceil(remainingMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

// ---------------------------------------------------------------------
// Developer Panel'in Journey Controls / XP bölümleri için servis
// fonksiyonları - hepsi AYNI getStoredStats/saveStats üzerinden çalışıyor,
// yani gerçek uygulamanın kullandığı depolamayı ve veri şeklini birebir
// paylaşıyor. İş kuralını (24 saatlik soğuma) kasıtlı olarak atlıyorlar -
// bu doğrudan istenen "test amaçlı" davranış, ama sadece bu dosyadaki
// açıkça isimlendirilmiş dev fonksiyonlarından çağrılabiliyorlar.
// ---------------------------------------------------------------------

export function devSetJourneyDay(day: number): VelisStats {
  const current = getStoredStats()
  const clamped = Math.max(0, Math.round(day))
  const next: VelisStats = {
    ...current,
    journeyDay: clamped,
    currentStreak: clamped,
    journeyTimestamp: clamped > 0 ? now() : null,
  }
  saveStats(next)
  return next
}

export function devResetJourney(): VelisStats {
  const current = getStoredStats()
  const next: VelisStats = { ...current, journeyDay: 0, currentStreak: 0, journeyTimestamp: null }
  saveStats(next)
  return next
}

export function devAddXP(amount: number): VelisStats {
  const current = getStoredStats()
  const next: VelisStats = { ...current, totalXP: Math.max(0, current.totalXP + amount) }
  saveStats(next)
  return next
}

export function devResetXP(): VelisStats {
  const current = getStoredStats()
  const next: VelisStats = { ...current, totalXP: 0, totalRitualCount: 0, totalRitualTimeSec: 0 }
  saveStats(next)
  return next
}

// Journey Day'den KASITLI OLARAK bağımsız - Developer Panel'in hızlı Streak
// kontrolü için, gerçek "streak <= day" ilişkisini test amaçlı bypass ediyor.
export function devAdjustStreak(delta: number): VelisStats {
  const current = getStoredStats()
  const next: VelisStats = { ...current, currentStreak: Math.max(0, current.currentStreak + delta) }
  saveStats(next)
  return next
}

// Geri sayımı şimdiden itibaren tam (24 saatlik) olarak yeniden başlatıyor.
export function devRestartCooldown(): VelisStats {
  const current = getStoredStats()
  const next: VelisStats = { ...current, journeyTimestamp: now() }
  saveStats(next)
  return next
}

// Geri sayımı anında bitiriyor - bir sonraki ritüel hemen Journey Day'i
// ilerletebilir hale geliyor.
export function devSkipCooldown(): VelisStats {
  const current = getStoredStats()
  if (current.journeyTimestamp === null) return current
  const next: VelisStats = { ...current, journeyTimestamp: now() - getActiveCooldownMs() - 1000 }
  saveStats(next)
  return next
}
