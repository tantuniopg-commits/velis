// Bildirime tıklanınca ilgili ekranı açma (bkz. talep md.5, AGENTS.md
// "Bildirimler"). Gerçek bir native URL scheme/universal link YOK - sunucu
// her push'un payload'ına `target` koyuyor (bkz. server/src/lib/apn.js
// sendPush, server/src/jobs/pushReminderJob.js), biz de Next.js router'ı ile
// İSTEMCİ TARAFI yönlendirme yapıyoruz.
//
// Üç durum da AYNI listener üzerinden çalışıyor:
//  - Ön planda: olay anında gelir.
//  - Arka planda (process canlı): bildirime dokunulup uygulama öne
//    getirildiğinde olay gelir.
//  - Uygulama kapalıyken (terminated/cold start): Capacitor native tarafı
//    bekleyen eylemi JS tarafı ilk listener'ı kaydedene kadar TUTAR, web
//    view yüklenip bu listener bağlanır bağlanmaz iletir.
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { handleDeviceToken } from './permissions'

// Next.js'in internal router tipine bağımlı olmamak için minimal bir arayüz -
// `useRouter()`'ın döndürdüğü nesne bunu her zaman karşılıyor.
type MinimalRouter = { push: (href: string) => void }

let registered = false

export function initNotificationDeepLinks(router: MinimalRouter) {
  if (registered || !Capacitor.isNativePlatform()) return
  registered = true

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const target = action.notification?.data?.target
    if (typeof target === 'string' && target.length > 0) {
      router.push(target)
    }
  })

  // Cihaz token'ı burada, TEK bir yerde yakalanıyor - ister soft-ask'tan
  // ister Ayarlar'dan tetiklensin, `register()` çağrısı sonunda hep bu
  // event ateşleniyor (bkz. permissions.ts enablePushNotifications).
  PushNotifications.addListener('registration', (token) => {
    handleDeviceToken(token.value)
  })
  PushNotifications.addListener('registrationError', (err) => {
    console.error('[notifications] push registration failed', err)
  })
}
