// Yerel, tarayıcı-tabanlı kimlik/istatistik saklama. Backend yok -
// hesap tek seferlik oluşturuluyor ve localStorage'da kalıcılaşıyor,
// bir sonraki açılışta hesap oluşturma akışı bir daha gösterilmiyor.

export type VelisUser = {
  firstName: string
  lastName: string
  email: string
  // Gerçek backend'in (bkz. lib/authApi.ts) verdiği Mongo _id - Leaderboard'ın
  // gerçek kullanıcı listesinde "you" satırını tekilleştirmek için kullanılıyor
  // (bkz. app/leaderboard/page.tsx). Backend olmadan/misafir modunda yok.
  id?: string
  // Sunucu, e-posta admin listesindeyse (bkz. server/src/lib/admins.js) login/
  // register yanıtında true dönüyor. Üretimde Developer Panel'i açan kilit
  // (bkz. isDev || isAdmin). Admin listesinin kendisi client'a hiç inmiyor.
  isAdmin?: boolean
  // Sunucudaki profil fotoğrafının sürümü (yok/0 = fotoğraf yok). Fotoğraf
  // URL'sini kurmak ve tarayıcı önbelleğini kırmak için (bkz. lib/authApi.ts
  // avatarUrl). Fotoğrafın kendisi cihazda saklanmıyor.
  avatarVersion?: number
  // Engellediği kullanıcıların kimlikleri - liderlik tablosunda gizleniyor
  // (bkz. app/leaderboard/page.tsx). Sunucudaki liste login'de gelir ve
  // engelle/kaldır işlemlerinde güncellenir.
  blockedUsers?: string[]
}

// Journey (gün/seri) ve XP (ödül) sistemleri KASITLI OLARAK birbirinden
// bağımsız - XP her tamamlanan ritüelde artar, Journey Day/Streak ise
// SADECE 24 saatlik bir soğuma sonrasında tamamlanan bir ritüelle ilerler
// (bkz. lib/journey.ts, completeRitual - bu değerleri değiştiren TEK yer).
// journeyTimestamp `null` = kullanıcı henüz hiç ritüel tamamlamadı.
export type VelisStats = {
  journeyDay: number
  currentStreak: number
  journeyTimestamp: number | null
  totalXP: number
  totalRitualCount: number
  totalRitualTimeSec: number
}

const USER_KEY = 'velis_user'
const STATS_KEY = 'velis_stats'
const TOKEN_KEY = 'velis_token'

// Gerçek backend'in (bkz. /server, lib/authApi.ts) verdiği JWT - sadece
// saklanıyor, bugün hiçbir isteğe eklenmiyor (henüz korumalı bir uç nokta
// çağrılmıyor) ama oturumun "gerçekten" doğrulanmış olduğunu temsil ediyor.
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser(): VelisUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as VelisUser) : null
  } catch {
    return null
  }
}

export function saveUser(user: VelisUser) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

// Developer Panel'in Reset bölümü için (bkz. devpanel/sections/Reset).
export function clearUser() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(USER_KEY)
}

// Hiç ritüel tamamlanmamış haldeki gerçek sıfır durum - Journey Day ancak
// ilk ritüel tamamlandığında 1'e çıkıyor (bkz. journey.ts).
export const ZERO_STATS: VelisStats = {
  journeyDay: 0,
  currentStreak: 0,
  journeyTimestamp: null,
  totalXP: 0,
  totalRitualCount: 0,
  totalRitualTimeSec: 0,
}

export function getStoredStats(): VelisStats {
  if (typeof window === 'undefined') return ZERO_STATS
  try {
    const raw = window.localStorage.getItem(STATS_KEY)
    return raw ? { ...ZERO_STATS, ...JSON.parse(raw) } : ZERO_STATS
  } catch {
    return ZERO_STATS
  }
}

export function saveStats(stats: VelisStats) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

// AYNI hesaba giriş yaparken, cihazdaki ilerlemeyi sunucununkiyle KÖRÜ
// KÖRÜNE değiştirmemek için (bkz. app/profile/page.tsx handleSignIn).
// Token süresi dolup arka plan senkronları sessizce başarısız olduysa
// (bkz. lib/journey.ts syncStatsToServer - best-effort, hatayı yutuyor),
// cihaz sunucudan daha ileride olabilir; o zaman girişte sunucunun eski
// verisiyle üzerine yazmak, kullanıcının günlerce fark etmediği ilerlemesini
// SİLERDİ. Birikimli sayaçlarda ikisinin büyüğü alınıyor; seri/zaman damgası
// gibi "sıfırlanabilir" alanlarda ise hangi taraf genel olarak daha ileride
// görünüyorsa (totalXP'si büyük olan) onunki kullanılıyor.
//
// FARKLI bir hesaba giriş yapılıyorsa bu fonksiyon HİÇ çağrılmamalı - o
// zaman cihazdaki veri önceki (başka) hesaba ait, doğrudan sunucununkiyle
// değiştirilmeli (bkz. çağıran taraftaki e-posta/id karşılaştırması).
export function mergeStatsPreferringMoreAdvanced(local: VelisStats, server: VelisStats): VelisStats {
  const localIsFurtherAlong = local.totalXP >= server.totalXP
  return {
    journeyDay: Math.max(local.journeyDay, server.journeyDay),
    totalXP: Math.max(local.totalXP, server.totalXP),
    totalRitualCount: Math.max(local.totalRitualCount, server.totalRitualCount),
    totalRitualTimeSec: Math.max(local.totalRitualTimeSec, server.totalRitualTimeSec),
    currentStreak: localIsFurtherAlong ? local.currentStreak : server.currentStreak,
    journeyTimestamp:
      (local.journeyTimestamp ?? -1) >= (server.journeyTimestamp ?? -1) ? local.journeyTimestamp : server.journeyTimestamp,
  }
}

// Developer Panel'in Reset bölümü için (bkz. devpanel/sections/Reset).
export function clearStats() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STATS_KEY)
}

export const STORAGE_KEYS = { USER_KEY, STATS_KEY }
