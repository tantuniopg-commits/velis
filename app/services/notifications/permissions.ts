// İzin akışı - bkz. talep md.2. Sistem izin penceresi SADECE kullanıcı
// bizim kendi "soft-ask" ekranımızda açıkça "evet" dedikten SONRA tetiklenir
// (bkz. app/aftercare/NotificationSoftAsk.tsx). iOS bir uygulamaya izni
// tekrar tekrar SORMA hakkı tanımıyor - bu yüzden soft-ask'ı "tüketmeden"
// asla requestPermissions() çağrılmıyor.
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { getNotificationPrefs, patchNotificationPrefs } from './store'
import { rescheduleAllFromSettings } from './scheduler'

export function shouldShowSoftAsk(): boolean {
  return !getNotificationPrefs().softAskShown
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) return 'unsupported'
  try {
    const { display } = await LocalNotifications.checkPermissions()
    // 'prompt-with-rationale' (Android - kullanıcı daha önce reddetmiş ama
    // tekrar sorulabilir) basitlik için 'prompt' ile aynı muamele görüyor.
    return display === 'prompt-with-rationale' ? 'prompt' : display
  } catch {
    return 'unsupported'
  }
}

// Soft-ask ekranında "Evet, hatırlat" seçilince çağrılır. Gerçek sistem
// iznini tetikler VE kabul edilirse makul varsayılanları (ritüel
// hatırlatması 20:00, kilometre taşı, check-in açık) devreye alır - "zor an"
// kullanıcıdan saat istediği için varsayılan AÇIK değil, ayarlardan saat
// eklenince kendisi açılır (bkz. app/profile/settings/notifications).
export async function acceptSoftAsk(): Promise<boolean> {
  patchNotificationPrefs({ softAskShown: true })
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { display } = await LocalNotifications.requestPermissions()
    if (display !== 'granted') return false
    patchNotificationPrefs({
      ritualReminder: { enabled: true, times: ['20:00'] },
      milestone: { enabled: true },
      checkin: { enabled: true },
    })
    await rescheduleAllFromSettings()
    return true
  } catch {
    return false
  }
}

// "Şimdi değil" seçilince - sistem izni HİÇ tetiklenmedi, sadece soft-ask'ın
// bir daha otomatik gösterilmemesi işaretleniyor (ayarlardan istediği zaman
// manuel açabilir, o noktada tekrar requestPermissions() denenir).
export function declineSoftAsk() {
  patchNotificationPrefs({ softAskShown: true })
}

// Ayarlar ekranında kullanıcı bir türü AÇMAYA çalışırken izin daha önce hiç
// istenmediyse veya 'prompt' durumundaysa gerçek sistem iznini burada
// tetikleriz (soft-ask'ı hiç görmemiş/reddetmiş bir kullanıcı ayarlardan
// doğrudan açmak isteyebilir).
export async function requestPermissionFromSettings(): Promise<'granted' | 'denied'> {
  if (!Capacitor.isNativePlatform()) return 'denied'
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

// İzin sistem düzeyinde kalıcı REDDEDİLMİŞSE (iOS bir daha sormuyor) -
// kullanıcıyı doğrudan iOS Ayarlar uygulamasına yönlendiriyoruz. Bunun için
// özel bir Capacitor eklentisi gerekmiyor - WKWebView'de `app-settings:`
// şemasına yönlendirme iOS tarafından native olarak yakalanıp Ayarlar
// uygulamasını açıyor.
export function openSystemSettings() {
  if (typeof window === 'undefined') return
  window.location.href = 'app-settings:'
}
