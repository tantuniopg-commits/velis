// Bildirim tercihinin (sadece aç/kapa + soft-ask gösterildi mi) yerel kopyası
// - gerçek kaynak sunucudaki User.notificationsEnabled (bkz. authController.js
// updatePreferences), burası sadece UI'ın anında tepki vermesi için.
//
// `pendingPushToken`: soft-ask TAM OLARAK kullanıcının ilk ritüelinden hemen
// sonra, henüz bir hesap oluşturulmadan (Guided Registration Mode daha
// sonra) gösterildiği için, cihaz push token'ı alındığı anda göndereceğimiz
// bir hesap/JWT HENÜZ olmayabilir. Token'ı burada bekletip, bir JWT ortaya
// çıktığı ilk fırsatta (bkz. permissions.ts syncPushTokenToServer, her app
// açılışında çağrılıyor) sunucuya yolluyoruz.
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from './types'

const PREFS_KEY = 'velis_notification_prefs'
const PENDING_TOKEN_KEY = 'velis_pending_push_token'

function safeGet(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    return raw ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) } : DEFAULT_NOTIFICATION_PREFS
  } catch {
    return DEFAULT_NOTIFICATION_PREFS
  }
}

function safeSet(value: NotificationPrefs) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(value))
  } catch {
    // localStorage dolu/kapalı olabilir - sessizce geç.
  }
}

export function getNotificationPrefs(): NotificationPrefs {
  return safeGet()
}

export function patchNotificationPrefs(patch: Partial<NotificationPrefs>): NotificationPrefs {
  const next = { ...safeGet(), ...patch }
  safeSet(next)
  return next
}

export function getPendingPushToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(PENDING_TOKEN_KEY)
}

export function setPendingPushToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PENDING_TOKEN_KEY, token)
}

export function clearPendingPushToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PENDING_TOKEN_KEY)
}
