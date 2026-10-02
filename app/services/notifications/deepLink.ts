// Bildirime tıklanınca ilgili ekranı açma (bkz. talep md.5). Gerçek bir
// native URL scheme/universal link YOK - Capacitor'ın
// `localNotificationActionPerformed` olayı `extra.target` alanını taşıyor,
// biz de Next.js router'ı ile İSTEMCİ TARAFI yönlendirme yapıyoruz.
//
// Üç durum da AYNI listener üzerinden çalışıyor:
//  - Ön planda: olay anında gelir.
//  - Arka planda (process canlı): bildirime dokunulup uygulama öne
//    getirildiğinde olay gelir.
//  - Uygulama kapalıyken (terminated/cold start): Capacitor native tarafı
//    bekleyen eylemi JS tarafı ilk listener'ı kaydedene kadar TUTAR, web
//    view yüklenip bu listener bağlanır bağlanmaz iletir - yani cold start
//    da aynı kod yoluyla, ekstra bir "getLaunchNotification" çağrısına
//    gerek kalmadan çalışır.
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// Next.js'in internal router tipine bağımlı olmamak için minimal bir arayüz -
// `useRouter()`'ın döndürdüğü nesne bunu her zaman karşılıyor.
type MinimalRouter = { push: (href: string) => void }

let registered = false

export function initNotificationDeepLinks(router: MinimalRouter) {
  if (registered || !Capacitor.isNativePlatform()) return
  registered = true
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const target = action.notification?.extra?.target
    if (typeof target === 'string' && target.length > 0) {
      router.push(target)
    }
  })
}
