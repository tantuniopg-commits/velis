// Gerçek kimlik doğrulama backend'i (bkz. /server) - Express + JWT + MongoDB.
// Aynı ağdaki telefondan da erişilebilmesi için sabit bir host yerine sayfanın
// kendi hostname'i + 4000 portu kullanılıyor (next dev --hostname 0.0.0.0 ile
// aynı mantık, bkz. next.config.ts allowedDevOrigins).
import type { VelisStats } from './auth'

const AUTH_API_PORT = 4000

// Native paket (Capacitor - bkz. capacitor.config.ts) içindeki WebView
// `window.location.hostname`'i GERÇEK sunucunun adresi olarak DEĞİL,
// `localhost`/`capacitor://` gibi kendi iç şemasını döndürür - o yüzden
// window.location'dan türetmek orada çalışmıyor. Build zamanında gömülen
// NEXT_PUBLIC_API_BASE_URL varsa (bkz. package.json build:capacitor script'i)
// o kullanılıyor, yoksa (normal web/dev) eski davranış aynen sürüyor.
export function apiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL
  if (typeof window === 'undefined') return ''
  return `${window.location.protocol}//${window.location.hostname}:${AUTH_API_PORT}`
}

export type AuthApiUser = {
  id: string
  name: string
  email: string
  phone?: string
  stats?: VelisStats
  isAdmin?: boolean
  avatarVersion?: number
  // Engellediği kullanıcıların kimlikleri (bkz. moderationController).
  blockedUsers?: string[]
}
export type AuthApiResult = { token: string; user: AuthApiUser }
export type AuthApiUserResult = { user: AuthApiUser }

export class AuthApiError extends Error {
  // HTTP durum kodu - çağıran, genel hata yerine belirli bir duruma (ör. 409
  // "isim zaten alınmış") özel mesaj gösterebilsin diye.
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

// Backend ücretsiz hosting'de (Render free) 15 dk kullanılmazsa uyuyor;
// uyandırma isteği ~50 sn sürebiliyor. O yüzden timeout uzun (45 sn) ve
// zaman aşımı ile ağ hatası ayrı mesajlar veriyor - kullanıcı "sunucu
// uyanıyor, tekrar dene" görüp butonu yeniden kullanabilsin.
const REQUEST_TIMEOUT_MS = 45000

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new AuthApiError('The server is taking too long to respond. It may be waking up — please try again in a moment.')
    }
    throw new AuthApiError('Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AuthApiError(data.error || 'Something went wrong.', res.status)
  return data as T
}

// Uygulama açılışında (bkz. contexts/AppNavContext) fire-and-forget çağrılıyor -
// Render'daki backend uyuyorsa kullanıcı giriş ekranına gelene kadar uyanmış
// olsun diye. Hata umursanmıyor.
export function warmUpServer(): void {
  const base = apiBase()
  if (!base) return
  fetch(`${base}/health`).catch(() => {})
}

// Email VE telefon her ikisi de sunucuda benzersiz (bkz. server/src/models/User.js
// unique index'leri) - aynı email veya aynı telefonla ikinci bir hesap
// açılamıyor, sunucu 409 ile "already in use" hatası dönüyor.
export function registerRequest(
  name: string,
  email: string,
  password: string,
  phone?: string,
  stats?: VelisStats,
  locale?: string,
  extra?: { gender?: string; birthDate?: string }
) {
  return request<AuthApiResult>('POST', '/api/auth/register', {
    name,
    email,
    password,
    phone,
    stats,
    locale,
    gender: extra?.gender,
    birthDate: extra?.birthDate,
  })
}

export function loginRequest(email: string, password: string) {
  return request<AuthApiResult>('POST', '/api/auth/login', { email, password })
}

// Bir ritüel tamamlandığında (bkz. lib/journey.ts completeRitual) en güncel
// ilerlemeyi sunucuya yazıyor - başka bir cihaz/tarayıcıdan bu hesaba giriş
// yapıldığında ilerlemenin "kaldığı yerden" devam etmesi bunun sayesinde.
// Best-effort: token yoksa (misafir/local-only kullanım) hiç çağrılmıyor,
// başarısız olursa sessizce yutuluyor - yerel ilerleme buna bağlı değil.
export function updateStatsRequest(token: string, stats: VelisStats) {
  return request<AuthApiUserResult>('PATCH', '/api/auth/stats', { stats }, token)
}

// Hesap Ayarları > İsmi Düzenle / Şifreyi Değiştir / Hesabı Sil - bkz.
// app/profile/settings/account/page.tsx, app/services/AuthService.ts.
export function updateProfileRequest(token: string, name: string) {
  return request<AuthApiUserResult>('PATCH', '/api/auth/profile', { name }, token)
}

// Bildirim tercihleri / dil senkronu - sunucudaki soğuma hatırlatma job'ının
// (bkz. server/src/jobs/cooldownReminder.js) kime/hangi dilde mail atacağını
// bilmesi için. Best-effort: token yoksa (misafir) hiç çağrılmıyor.
export function updatePreferencesRequest(token: string, prefs: { notificationPrefs?: { dailyRitualReminder?: boolean }; locale?: string }) {
  return request<{ ok: true }>('PATCH', '/api/auth/preferences', prefs, token)
}

// Profil fotoğrafı - bkz. app/profile/settings/account/page.tsx. `image`
// 320x320 JPEG data URL'i (lib/avatarImage.ts); sunucu boyutu/imzayı yeniden
// doğruluyor. PATCH (PUT değil): sunucunun CORS izin listesinde PUT yok.
export function uploadAvatarRequest(token: string, image: string) {
  return request<AuthApiUserResult>('PATCH', '/api/auth/avatar', { image }, token)
}

export function deleteAvatarRequest(token: string) {
  return request<AuthApiUserResult>('DELETE', '/api/auth/avatar', undefined, token)
}

// Bir kullanıcının fotoğrafının herkese açık URL'si (<img src>) - sürüm yoksa/0
// ise fotoğraf yok demek, çağıran baş harflere düşüyor. ?v= sürümü değişince URL
// değişiyor, tarayıcı eskisini önbellekten sunmuyor.
export function avatarUrl(userId: string | undefined, version: number | undefined): string | undefined {
  if (!userId || !version) return undefined
  const base = apiBase()
  if (!base) return undefined
  return `${base}/api/auth/avatar/${encodeURIComponent(userId)}?v=${version}`
}

// Moderasyon (App Store 1.2) - bkz. server/src/controllers/moderationController.js.
// Bildirim anında destek e-postasına düşüyor; aynı fotoğraf 3 farklı kişiden
// bildirim alırsa otomatik gizleniyor. Engel sunucuda tutuluyor (cihazlar arası).
export function reportUserRequest(token: string, userId: string, reason?: string) {
  return request<{ ok: true }>('POST', '/api/auth/report', { userId, reason }, token)
}

export function blockUserRequest(token: string, userId: string) {
  return request<{ blockedUsers: string[] }>('POST', `/api/auth/block/${encodeURIComponent(userId)}`, undefined, token)
}

export function unblockUserRequest(token: string, userId: string) {
  return request<{ blockedUsers: string[] }>('DELETE', `/api/auth/block/${encodeURIComponent(userId)}`, undefined, token)
}

export type AuthApiBlockedUser = { id: string; name: string }
export function getBlocksRequest(token: string) {
  return request<{ users: AuthApiBlockedUser[] }>('GET', '/api/auth/blocks', undefined, token)
}

export function changePasswordRequest(token: string, currentPassword: string, newPassword: string, locale: string) {
  return request<{ ok: true }>('PATCH', '/api/auth/password', { currentPassword, newPassword, locale }, token)
}

export function deleteAccountRequest(token: string) {
  return request<{ ok: true }>('DELETE', '/api/auth/account', undefined, token)
}

// Şifremi Unuttum akışı - bkz. app/ForgotPasswordFlow.tsx. Token GEREKMİYOR
// (kullanıcı henüz giriş yapamıyor, akışın amacı zaten bu).
export type ForgotPasswordResult = { sent: true; devCode?: string }
export function forgotPasswordRequest(email: string, locale: string) {
  return request<ForgotPasswordResult>('POST', '/api/auth/forgot-password', { email, locale })
}

export type VerifyResetCodeResult = { valid: boolean; error?: string }
export function verifyResetCodeRequest(email: string, code: string) {
  return request<VerifyResetCodeResult>('POST', '/api/auth/verify-reset-code', { email, code })
}

export function resetPasswordRequest(email: string, code: string, newPassword: string) {
  return request<{ ok: true }>('POST', '/api/auth/reset-password', { email, code, newPassword })
}

export type AuthApiLeaderboardUser = { id: string; name: string; stats?: VelisStats; avatarVersion?: number }
export type AuthApiLeaderboardResult = { users: AuthApiLeaderboardUser[] }

// Leaderboard - SADECE gerçekten kayıt olmuş kullanıcılardan oluşuyor (bkz.
// app/leaderboard/page.tsx). Herkese açık, token gerekmiyor.
export function getLeaderboardRequest() {
  return request<AuthApiLeaderboardResult>('GET', '/api/auth/leaderboard')
}

export type AuthApiStoredUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  gender?: string | null
  birthDate?: string | null
  locale?: string
  isAdmin?: boolean
  stats?: VelisStats
  createdAt: string
}
export type AuthApiUsersResult = { users: AuthApiStoredUser[] }

// Admin panelindeki kayıtlı hesaplar listesi (bkz. devpanel/sections/
// UserDatabase.tsx). Sunucuda requireAdmin ile korunuyor - token ŞART,
// admin olmayan token'lar 403 alır. Şifre hash'i hiç dönmüyor.
export function getUsersRequest(token: string) {
  return request<AuthApiUsersResult>('GET', '/api/auth/users', undefined, token)
}

export type AuthApiAvailabilityResult = { available: boolean }

// Hesap oluşturma formunda email/telefon alanından çıkılınca ERKEN uyarı
// için (bkz. app/profile/page.tsx) - kesin/gerçek kontrol register() içinde
// zaten yapılıyor, bu sadece kullanıcı tüm formu+OTP adımlarını doldurup en
// sonda "zaten kayıtlı" hatası almasın diye.
export function checkEmailAvailableRequest(email: string) {
  return request<AuthApiAvailabilityResult>('GET', `/api/auth/check-email?email=${encodeURIComponent(email)}`)
}

export function checkPhoneAvailableRequest(phone: string) {
  return request<AuthApiAvailabilityResult>('GET', `/api/auth/check-phone?phone=${encodeURIComponent(phone)}`)
}
