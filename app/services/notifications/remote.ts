// FAZ 2 İSKELETİ - henüz AKTİF DEĞİL, hiçbir yerden çağrılmıyor. Remote push
// (APNs/FCM) etkinleştirilmek istendiğinde:
//   1. iOS: Xcode'da "Push Notifications" + "Background Modes > Remote
//      notifications" capability'lerini aç, provisioning profile'ı yenile
//      (bkz. AGENTS.md "Altyapı ve secrets" - Apple Developer hesabı).
//   2. Bu dosyadaki `registerForRemotePush()`'u uygulama başlangıcında
//      (bkz. index.ts initNotifications) çağır.
//   3. `onTokenReceived` içindeki TODO'yu gerçek bir backend endpoint'ine
//      bağla (server/src/controllers/... yeni bir `pushToken` alanı,
//      bkz. User modeli) - token'ı sunucuya göndermeden FCM/APNs üzerinden
//      gerçek push ATILAMAZ, Faz 1'de bu adım hiç yok.
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'

export async function registerForRemotePush(onTokenReceived: (token: string) => void) {
  if (!Capacitor.isNativePlatform()) return
  const { receive } = await PushNotifications.checkPermissions()
  let granted = receive === 'granted'
  if (!granted) {
    const req = await PushNotifications.requestPermissions()
    granted = req.receive === 'granted'
  }
  if (!granted) return

  await PushNotifications.register()
  PushNotifications.addListener('registration', (token) => {
    onTokenReceived(token.value)
    // TODO (Faz 2): token'ı sunucuya gönder - bkz. authApi.ts deseni
    // (updatePreferencesRequest gibi best-effort bir PATCH /api/auth/...).
  })
  PushNotifications.addListener('registrationError', (err) => {
    console.error('[notifications] remote push registration failed', err)
  })
}
