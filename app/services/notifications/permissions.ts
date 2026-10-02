// İzin + push token kayıt akışı - Faz 2 (bkz. AGENTS.md "Bildirimler").
// Sistem izin penceresi SADECE kullanıcı bizim kendi "soft-ask" ekranımızda
// açıkça "evet" dedikten SONRA tetikleniyor (bkz. aftercare/
// NotificationSoftAsk.tsx). iOS bir uygulamaya izni tekrar tekrar SORMA
// hakkı tanımıyor - bu yüzden soft-ask'ı "tüketmeden" asla
// requestPermissions() çağrılmıyor.
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { getStoredToken } from '../../lib/auth'
import { updatePreferencesRequest } from '../../lib/authApi'
import { getNotificationPrefs, patchNotificationPrefs, getPendingPushToken, setPendingPushToken, clearPendingPushToken } from './store'

export function shouldShowSoftAsk(): boolean {
  return !getNotificationPrefs().softAskShown
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) return 'unsupported'
  try {
    const { receive } = await PushNotifications.checkPermissions()
    return receive === 'prompt-with-rationale' ? 'prompt' : receive
  } catch {
    return 'unsupported'
  }
}

// Soft-ask ekranındaki "Evet, hatırlat" seçilince HEM aç/kapa ayarlar
// sayfasındaki "Bildirimler" toggle'ı açılınca çağrılıyor - gerçek sistem
// iznini tetikleyip push token'ı alıp sunucuya (mümkünse) gönderen TEK yer.
export async function enablePushNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    patchNotificationPrefs({ enabled: false })
    return false
  }
  try {
    const current = await PushNotifications.checkPermissions()
    let granted = current.receive === 'granted'
    if (!granted) {
      const req = await PushNotifications.requestPermissions()
      granted = req.receive === 'granted'
    }
    if (!granted) {
      patchNotificationPrefs({ enabled: false })
      return false
    }

    patchNotificationPrefs({ enabled: true })

    // `register()` asenkron - gerçek token 'registration' event'inde gelir.
    // Dinleyiciyi HER ZAMAN (NotificationsBoot mount'unda) bağlı tutuyoruz,
    // burada SADECE register() çağrısını tetikliyoruz.
    await PushNotifications.register()
    return true
  } catch (err) {
    console.error('[notifications] enable failed', err)
    patchNotificationPrefs({ enabled: false })
    return false
  }
}

export function disablePushNotifications() {
  patchNotificationPrefs({ enabled: false })
  const token = getStoredToken()
  if (token) {
    // Token'ı SİLMİYORUZ (tekrar açınca anında çalışsın diye) - sadece
    // sunucudaki job'ın bu kullanıcıyı atlamasını sağlıyoruz.
    updatePreferencesRequest(token, { notificationsEnabled: false }).catch(() => {})
  }
}

// `registration` event'inde (bkz. deepLink.ts'in yanına kurulan dinleyici,
// NotificationsBoot.tsx) çağrılıyor - token'ı bekletip (bkz. store.ts
// pendingPushToken) hesap henüz yoksa daha sonra senkronluyor.
export function handleDeviceToken(deviceToken: string) {
  setPendingPushToken(deviceToken)
  syncPushTokenToServer()
}

// Her app açılışında (bkz. NotificationsBoot) çağrılıyor - bekleyen bir
// push token VE bir hesap (JWT) varsa sunucuya gönderip bekleyeni temizler.
// İkisi de yoksa no-op, hata fırlatmaz.
export function syncPushTokenToServer() {
  const pending = getPendingPushToken()
  const jwt = getStoredToken()
  const prefs = getNotificationPrefs()
  if (!pending || !jwt) return
  updatePreferencesRequest(jwt, { pushToken: pending, notificationsEnabled: prefs.enabled })
    .then(() => clearPendingPushToken())
    .catch(() => {
      // Token henüz gönderilemedi (ağ yok / JWT süresi dolmuş) - bir
      // sonraki app açılışında tekrar denenecek, pending'i SİLMİYORUZ.
    })
}

// Soft-ask'ta "Şimdi değil" - sistem izni HİÇ tetiklenmedi, sadece bir daha
// otomatik gösterilmemesi işaretleniyor.
export function declineSoftAsk() {
  patchNotificationPrefs({ softAskShown: true })
}

export async function acceptSoftAsk(): Promise<boolean> {
  patchNotificationPrefs({ softAskShown: true })
  return enablePushNotifications()
}

// İzin sistem düzeyinde kalıcı REDDEDİLMİŞSE (iOS bir daha sormuyor) -
// kullanıcıyı doğrudan iOS Ayarlar uygulamasına yönlendiriyoruz.
export function openSystemSettings() {
  if (typeof window === 'undefined') return
  window.location.href = 'app-settings:'
}
