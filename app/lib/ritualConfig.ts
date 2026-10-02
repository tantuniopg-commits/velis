// Ritüel süresi için merkezi yapılandırma servisi. Ritual ekranı (app/page.tsx)
// süreyi ASLA kendi içinde sabitlemiyor - her zaman getRitualDurationSec()
// çağırıyor.
//
// Bu süre artık kullanıcının KENDİSİNİN ayarladığı bir EŞİK (bkz. Ayarlar >
// Ritüel Süresi, app/profile/settings/ritual-duration/page.tsx): süre
// dolunca ritüel OTOMATİK bitmiyor, "Ritüeli Bitir" butonu beliriyor (bkz.
// app/page.tsx) - kullanıcı basmadığı sürece ritüel sınırsız devam ediyor,
// XP toplamaya (amber top mekaniği) devam edebiliyor. Yani "min 30sn, max
// sonsuz": kullanıcı sadece bu alt eşiği (30-240sn arası) seçiyor.
//
// Developer Panel'in "Ritual Configuration" bölümü development modunda BU
// AYARIN DA ÜSTÜNDE geçerli bir geçici override sağlıyor (test için 1-600sn
// arası herhangi bir değer, üretimde hiçbir etkisi yok).
import { isDev } from '../constants/env'
import { getStoredSettings, saveSettings } from './settings'

export const PRODUCTION_RITUAL_DURATION_SEC = 30
export const MIN_RITUAL_DURATION_SEC = 1
export const MAX_RITUAL_DURATION_SEC = 600

// Kullanıcının Ayarlar'dan seçebileceği aralık - dev override'ın (yukarıdaki
// MIN/MAX_RITUAL_DURATION_SEC, test amaçlı) aralığından KASITLI OLARAK dar.
export const USER_MIN_RITUAL_DURATION_SEC = 30
export const USER_MAX_RITUAL_DURATION_SEC = 240
export const USER_RITUAL_DURATION_STEP_SEC = 10

const DEV_STORAGE_KEY = 'velis_dev_ritual_duration_sec'

function getDevOverrideSec(): number | null {
  if (!isDev || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEV_STORAGE_KEY)
    if (!raw) return null
    const n = Number(raw)
    if (!Number.isFinite(n) || n < MIN_RITUAL_DURATION_SEC || n > MAX_RITUAL_DURATION_SEC) return null
    return n
  } catch {
    return null
  }
}

// Öncelik: dev override (varsa) > kullanıcının Ayarlar'daki seçimi (varsa) >
// üretim varsayılanı (30sn).
export function getRitualDurationSec(): number {
  const devOverride = getDevOverrideSec()
  if (devOverride !== null) return devOverride
  if (typeof window === 'undefined') return PRODUCTION_RITUAL_DURATION_SEC
  const configured = getStoredSettings().ritual?.durationSec
  if (
    typeof configured === 'number' &&
    Number.isFinite(configured) &&
    configured >= USER_MIN_RITUAL_DURATION_SEC &&
    configured <= USER_MAX_RITUAL_DURATION_SEC
  ) {
    return configured
  }
  return PRODUCTION_RITUAL_DURATION_SEC
}

// Kullanıcının Ayarlar > Ritüel Süresi'nden yaptığı seçim - herkese açık,
// dev kilidi YOK (bkz. useSettings.updateRitualDuration, tek gerçek yazma
// noktası; bu sadece okuma kolaylığı için).
export function getUserRitualDurationSec(): number {
  if (typeof window === 'undefined') return PRODUCTION_RITUAL_DURATION_SEC
  const configured = getStoredSettings().ritual?.durationSec
  if (
    typeof configured === 'number' &&
    Number.isFinite(configured) &&
    configured >= USER_MIN_RITUAL_DURATION_SEC &&
    configured <= USER_MAX_RITUAL_DURATION_SEC
  ) {
    return configured
  }
  return PRODUCTION_RITUAL_DURATION_SEC
}

export function setUserRitualDurationSec(seconds: number) {
  if (typeof window === 'undefined') return
  const clamped = Math.min(USER_MAX_RITUAL_DURATION_SEC, Math.max(USER_MIN_RITUAL_DURATION_SEC, Math.round(seconds)))
  const current = getStoredSettings()
  saveSettings({ ...current, ritual: { durationSec: clamped } })
}

// ---- Developer Panel'in test override'ı (üretimde hiç etkisi yok) ----

export function setRitualDurationSec(seconds: number) {
  if (!isDev || typeof window === 'undefined') return
  const clamped = Math.min(MAX_RITUAL_DURATION_SEC, Math.max(MIN_RITUAL_DURATION_SEC, Math.round(seconds)))
  window.localStorage.setItem(DEV_STORAGE_KEY, String(clamped))
}

export function resetRitualDurationSec() {
  if (!isDev || typeof window === 'undefined') return
  window.localStorage.removeItem(DEV_STORAGE_KEY)
}
