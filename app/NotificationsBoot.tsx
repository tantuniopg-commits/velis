'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initNotificationDeepLinks, syncPushTokenToServer } from './services/notifications'

// Bildirim sisteminin tek mount noktası - RootLayout içinde GlobalNav'ın
// yanında, görünmez (bkz. AGENTS.md "Bildirimler"). Faz 2'de zamanlama/
// içerik sunucuda olduğu için burası artık sadece:
//  1. Bildirime tıklanınca doğru ekrana yönlendiren + cihaz push token'ını
//     yakalayan listener'ları bağlar (bkz. deepLink.ts) - üç durumda da
//     (ön plan/arka plan/kapalı) ÇALIŞIR.
//  2. Her app açılışında, bekleyen bir push token varsa ve o sırada bir
//     hesap (JWT) varsa sunucuya gönderir (bkz. permissions.ts
//     syncPushTokenToServer - soft-ask hesap oluşmadan ÖNCE gösterildiği
//     için token'ın hesaba bağlanması bir sonraki açılışa kalabiliyor).
export default function NotificationsBoot() {
  const router = useRouter()

  useEffect(() => {
    initNotificationDeepLinks(router)
    syncPushTokenToServer()

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncPushTokenToServer()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
