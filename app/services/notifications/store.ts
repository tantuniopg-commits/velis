// Bildirim tercihleri + küçük runtime durumu (son açılış, günlük sayaç, son
// kullanılan metin varyasyonu) - hepsi localStorage'da, sunucuya hiç
// gitmiyor (Faz 1 tamamen cihaz-yerel, bkz. AGENTS.md "Bildirimler").
import { DEFAULT_NOTIFICATION_PREFS, MAX_NOTIFICATIONS_PER_DAY, type NotificationKind, type NotificationPrefs } from './types'

const PREFS_KEY = 'velis_notification_prefs'
const LAST_OPEN_KEY = 'velis_notification_last_open_at'
const DAILY_COUNT_KEY = 'velis_notification_daily_count' // { date: 'YYYY-MM-DD', count: number }
const LAST_COPY_KEY = 'velis_notification_last_copy' // { [kind]: lastIndex } - art arda aynı metin gelmesin

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // no-op - localStorage dolu/kapalı olabilir, bildirim sistemi sessizce
    // devre dışı kalır, uygulamanın geri kalanını etkilemez.
  }
}

export function getNotificationPrefs(): NotificationPrefs {
  const stored = safeGet<NotificationPrefs>(PREFS_KEY, DEFAULT_NOTIFICATION_PREFS)
  // Eski/eksik bir sürümden geliyorsa iç içe alanlar da eksik olabilir -
  // her seviyeyi ayrı ayrı varsayılanla birleştiriyoruz.
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...stored,
    ritualReminder: { ...DEFAULT_NOTIFICATION_PREFS.ritualReminder, ...stored.ritualReminder },
    hardMoment: { ...DEFAULT_NOTIFICATION_PREFS.hardMoment, ...stored.hardMoment },
    milestone: { ...DEFAULT_NOTIFICATION_PREFS.milestone, ...stored.milestone },
    checkin: { ...DEFAULT_NOTIFICATION_PREFS.checkin, ...stored.checkin },
    quietHours: { ...DEFAULT_NOTIFICATION_PREFS.quietHours, ...stored.quietHours },
  }
}

export function saveNotificationPrefs(next: NotificationPrefs) {
  safeSet(PREFS_KEY, next)
}

export function patchNotificationPrefs(patch: Partial<NotificationPrefs>): NotificationPrefs {
  const next = { ...getNotificationPrefs(), ...patch }
  saveNotificationPrefs(next)
  return next
}

// ---- Nazik check-in için son açılış zamanı ----
export function getLastOpenAt(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LAST_OPEN_KEY)
  return raw ? Number(raw) || null : null
}

export function setLastOpenAt(ts: number) {
  safeSet(LAST_OPEN_KEY, ts) // tek bir sayı - JSON.stringify(number) sorunsuz
}

// ---- Günlük toplam bildirim sınırı (bkz. talep md.4, varsayılan 3) ----
function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function canScheduleOneMoreToday(forDate: Date = new Date()): boolean {
  const key = todayKey(forDate)
  const stored = safeGet<{ date: string; count: number }>(DAILY_COUNT_KEY, { date: key, count: 0 })
  if (stored.date !== key) return true
  return stored.count < MAX_NOTIFICATIONS_PER_DAY
}

export function recordScheduledToday(forDate: Date = new Date()) {
  const key = todayKey(forDate)
  const stored = safeGet<{ date: string; count: number }>(DAILY_COUNT_KEY, { date: key, count: 0 })
  const next = stored.date === key ? { date: key, count: stored.count + 1 } : { date: key, count: 1 }
  safeSet(DAILY_COUNT_KEY, next)
}

// ---- Metin havuzundan rastgele seçim - aynı tür için bir öncekiyle AYNI
// index tekrar seçilmiyor (bkz. talep md.4 "aynı metin art arda gelmesin"). ----
export function pickCopyIndex(kind: NotificationKind, poolSize: number): number {
  const stored = safeGet<Record<string, number>>(LAST_COPY_KEY, {})
  const last = stored[kind]
  let next = Math.floor(Math.random() * poolSize)
  if (poolSize > 1 && next === last) next = (next + 1) % poolSize
  safeSet(LAST_COPY_KEY, { ...stored, [kind]: next })
  return next
}
