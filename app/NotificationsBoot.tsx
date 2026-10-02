'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initScheduler, initNotificationDeepLinks, rearmCheckin, rearmRitualReminders } from './services/notifications'

// Bildirim sisteminin tek mount noktası - RootLayout içinde GlobalNav'ın
// yanında, görünmez (bkz. AGENTS.md "Bildirimler"). Burada hiçbir UI yok,
// sadece:
//  1. İlk açılışta zamanlayıcıyı kurar (ritüel hatırlatma/zor an/check-in
//     re-arm, bkz. scheduler.ts initScheduler).
//  2. Bildirime tıklanınca doğru ekrana yönlendiren listener'ı bağlar - üç
//     durumda da (ön plan/arka plan/kapalı) ÇALIŞIR, bkz. deepLink.ts.
//  3. Uygulama arka plandan öne her döndüğünde check-in sayacını ve ritüel
//     hatırlatmasını tazeler ("app açılışı" = visibilitychange 'visible',
//     Capacitor WKWebView'de süreç canlı kaldığı için mount sadece BİR KEZ
//     çalışır - asıl "yeniden kurulum" sinyali bu).
export default function NotificationsBoot() {
  const router = useRouter()

  useEffect(() => {
    initNotificationDeepLinks(router)
    initScheduler()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        rearmCheckin()
        rearmRitualReminders()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
