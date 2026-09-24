// Kimlik/istatistik servisi - lib/auth.ts'in ince bir katmanı + hesap
// oluşturma/düzenleme/kapatma iş kurallarının toplandığı yer (daha önce
// sayfa bileşenlerinde yaşıyordu). Kullanıcı (User) okuma/yazma/temizleme
// artık userRepository üzerinden geçiyor (bkz. repositories/) - Stats hâlâ
// doğrudan lib/auth.ts üzerinden (repository soyutlaması şimdilik sadece
// User için, bkz. repositories/index.ts'teki not).
import { clearStats, clearToken, getStoredToken } from '../lib/auth'
import type { VelisUser } from '../lib/auth'
import { userRepository } from '../repositories'
import { setAppState } from './AppStateManager'
import { clearWelcomeSeen, clearUserType, clearLanguageSelected } from '../lib/onboarding'
import { clearGuideCompleted } from '../lib/guide'
import {
  updateProfileRequest,
  changePasswordRequest,
  deleteAccountRequest,
  uploadAvatarRequest,
  deleteAvatarRequest,
  reportUserRequest,
  blockUserRequest,
  unblockUserRequest,
  AuthApiError,
} from '../lib/authApi'

export * from '../lib/auth'

// Sunucu 401 dönerse token süresi dolmuş veya geçersizdir (bkz. server/src/
// middleware/auth.js) - önceden bu, diğer her hatayla aynı genel "kaydedilemedi"
// mesajına düşüyordu, kullanıcı gerçek sebebi hiç göremiyordu. Böyle bir hatadan
// sonra token'ı hemen temizliyoruz: geçersiz bir token'ı elde tutmanın faydası
// yok, sadece sonraki her isteği aynı şekilde başarısız kılar. Kullanıcı adı ve
// yerel ilerleme KORUNUYOR (resetDeviceToFirstLaunch'ın aksine) - bu bir çıkış
// değil, sadece oturumun yenilenmesi (Ayarlar > Hesap > Çıkış Yap, sonra tekrar
// giriş) gerektiği anlamına geliyor.
function isSessionExpired(e: unknown): boolean {
  if (!(e instanceof AuthApiError) || e.status !== 401) return false
  clearToken()
  return true
}

// Bu üç fonksiyon KASITLI OLARAK lib/auth.ts'in doğrudan re-export'unu
// (yukarıdaki `export *`) gölgeliyor - artık userRepository üzerinden
// geçiyorlar (bkz. repositories/UserRepository.ts). Dönüş tipleri, arayüzün
// `T | Promise<T>` imzasıyla uyumlu olacak şekilde senkron kalıyor -
// LocalStorageUserRepository senkron olduğu için bugün hiçbir çağrı
// noktasının `await` eklemesi gerekmiyor.
export function getStoredUser(): VelisUser | null {
  return userRepository.get() as VelisUser | null
}

export function saveUser(user: VelisUser): void {
  userRepository.save(user)
}

export function clearUser(): void {
  userRepository.clear()
}

// Giriş yapmış kullanıcının e-postası sunucudaki admin listesinde mi (bkz.
// server/src/lib/admins.js) - login/register yanıtında geldi, yerelde
// saklandı. Admin listesinin kendisi client'a hiç inmiyor.
export function isAdminUser(): boolean {
  return !!getStoredUser()?.isAdmin
}

export type SignupFormInput = {
  firstName: string
  lastName: string
  email: string
  gender: string
  birthDate: string
  password: string
}
export type SignupFormValidity = {
  firstNameValid: boolean
  lastNameValid: boolean
  emailValid: boolean
  genderValid: boolean
  birthDateValid: boolean
  passwordValid: boolean
  formValid: boolean
}

// Şifre kuralları - tek alan + canlı kural listesi (bkz.
// app/profile/page.tsx PasswordRuleRow). Her kural ayrı ayrı kontrol
// edilebilsin diye burada, tek bir yerde tanımlı - hem validateSignupForm
// hem de UI'daki canlı liste AYNI bu fonksiyonu kullanıyor, iki yerde
// kural tekrarlanmıyor.
export type PasswordRuleId = 'length' | 'uppercase' | 'lowercase' | 'number' | 'special'

export function getPasswordRuleStatus(password: string): Record<PasswordRuleId, boolean> {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordRuleStatus(password)).every(Boolean)
}

// Hesap oluşturma formunun doğrulama kuralları - app/profile/page.tsx'ten
// birebir taşındı (aynı regex/uzunluk kontrolleri, aynı davranış).
export function validateSignupForm(input: SignupFormInput): SignupFormValidity {
  const firstNameValid = input.firstName.trim().length > 0
  const lastNameValid = input.lastName.trim().length > 0
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  const genderValid = input.gender.trim().length > 0
  // Doğum tarihi geçmişte olmalı VE kullanıcı en az 13 yaşında olmalı
  // (COPPA / Gizlilik Politikası "13 yaş altı için değildir"). Tarih seçici
  // zaten 13'ten küçüğü seçtirmiyor - bu, kesin kural.
  const birthDateValid = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return false
    const dob = new Date(input.birthDate)
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) return false
    const thirteenAgo = new Date()
    thirteenAgo.setFullYear(thirteenAgo.getFullYear() - 13)
    return dob <= thirteenAgo
  })()
  const passwordValid = isPasswordValid(input.password)
  return {
    firstNameValid,
    lastNameValid,
    emailValid,
    genderValid,
    birthDateValid,
    passwordValid,
    formValid: firstNameValid && lastNameValid && emailValid && genderValid && birthDateValid && passwordValid,
  }
}

// Journey/XP hesap oluşturmadan ÖNCE, gerçek ritüel tamamlanınca kaydedilmiş
// oluyor (bkz. app/page.tsx, completeRitual) - burada sahte veri üretmiyoruz.
export function createAccount(input: {
  firstName: string
  lastName: string
  email: string
  id?: string
  isAdmin?: boolean
  avatarVersion?: number
  blockedUsers?: string[]
}): VelisUser {
  const user: VelisUser = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim(),
    id: input.id,
    isAdmin: input.isAdmin || undefined,
    avatarVersion: input.avatarVersion || undefined,
    blockedUsers: input.blockedUsers?.length ? input.blockedUsers : undefined,
  }
  saveUser(user)
  setAppState('REGISTERED')
  return user
}

// Token varsa (gerçek hesap) sunucudaki `name` alanı da güncelleniyor -
// başarısız olursa (ağ/sunucu hatası) yerel de değiştirilmiyor, aksi halde
// ekran "kaydedildi" gösterip DB'de sessizce eski kalır (bkz. journey stats
// senkron sorunundaki tutarsızlık, burada aynı hatayı tekrarlamıyoruz).
// Misafir modda (token yok) sadece yerel - hiç sunucu hesabı yok zaten.
// İsim benzersiz (bkz. server authController isNameTaken): başkası aynı adı
// kullanıyorsa sunucu 409 dönüyor ve burada 'taken' - çağıran genel "kaydedilemedi"
// yerine "bu isim alınmış" gösterebilsin. Yine yerel de değiştirilmiyor.
export async function updateUserName(user: VelisUser, firstName: string, lastName: string): Promise<VelisUser | null | 'taken' | 'expired'> {
  if (!firstName.trim() || !lastName.trim()) return null
  const next: VelisUser = { ...user, firstName: firstName.trim(), lastName: lastName.trim() }
  const token = getStoredToken()
  if (token) {
    try {
      await updateProfileRequest(token, `${next.firstName} ${next.lastName}`.trim())
    } catch (e) {
      if (e instanceof AuthApiError && e.status === 409) return 'taken'
      if (isSessionExpired(e)) return 'expired'
      return null
    }
  }
  saveUser(next)
  return next
}

// Profil fotoğrafı sunucuda (MongoDB) saklanıyor - başarısız olursa (ağ/sunucu
// hatası) yerel sürüm de değişmiyor, isim düzenlemedeki aynı ilke: ekran
// "kaydedildi" gösterip DB'de eski kalmasın. Token yoksa (misafir) yüklenecek
// bir hesap yok, null dönüyor. Fotoğrafın kendisi cihazda tutulmuyor, sadece
// sürüm numarası (bkz. VelisUser.avatarVersion).
export async function updateUserAvatar(user: VelisUser, imageDataUrl: string): Promise<VelisUser | null | 'expired'> {
  const token = getStoredToken()
  if (!token) return null
  try {
    const res = await uploadAvatarRequest(token, imageDataUrl)
    const next: VelisUser = { ...user, avatarVersion: res.user.avatarVersion || undefined }
    saveUser(next)
    return next
  } catch (e) {
    if (isSessionExpired(e)) return 'expired'
    return null
  }
}

export async function removeUserAvatar(user: VelisUser): Promise<VelisUser | null | 'expired'> {
  const token = getStoredToken()
  if (!token) return null
  try {
    await deleteAvatarRequest(token)
    const next: VelisUser = { ...user, avatarVersion: undefined }
    saveUser(next)
    return next
  } catch (e) {
    if (isSessionExpired(e)) return 'expired'
    return null
  }
}

// Moderasyon (App Store 1.2). Hepsi sunucu gerektiriyor: token yoksa (misafir)
// yapılacak bir şey yok, başarısızlık sessizce false/null - çağıran kullanıcıya
// "tekrar dene" gösteriyor ve yerel durum sunucuyla tutarlı kalıyor.
export async function reportUser(userId: string): Promise<boolean | 'expired'> {
  const token = getStoredToken()
  if (!token) return false
  try {
    await reportUserRequest(token, userId)
    return true
  } catch (e) {
    if (isSessionExpired(e)) return 'expired'
    return false
  }
}

export async function blockUser(user: VelisUser, targetId: string): Promise<VelisUser | null | 'expired'> {
  const token = getStoredToken()
  if (!token) return null
  try {
    const res = await blockUserRequest(token, targetId)
    const next: VelisUser = { ...user, blockedUsers: res.blockedUsers }
    saveUser(next)
    return next
  } catch (e) {
    if (isSessionExpired(e)) return 'expired'
    return null
  }
}

export async function unblockUser(user: VelisUser, targetId: string): Promise<VelisUser | null | 'expired'> {
  const token = getStoredToken()
  if (!token) return null
  try {
    const res = await unblockUserRequest(token, targetId)
    const next: VelisUser = { ...user, blockedUsers: res.blockedUsers }
    saveUser(next)
    return next
  } catch (e) {
    if (isSessionExpired(e)) return 'expired'
    return null
  }
}

// Gerçek şifre değişimi - hesap oluşturma formuyla BİREBİR aynı kural seti
// (bkz. isPasswordValid), sunucu mevcut şifreyi doğruladıktan sonra
// değiştiriyor (bkz. server/src/controllers/authController.js updatePassword)
// ve o anki uygulama diline göre bir bildirim e-postası gönderiyor. Misafir
// modda (token yok) değiştirilecek gerçek bir şifre yok.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  locale: string
): Promise<boolean | 'expired'> {
  if (!isPasswordValid(newPassword) || newPassword !== confirmPassword) return false
  const token = getStoredToken()
  if (!token) return false
  try {
    await changePasswordRequest(token, currentPassword, newPassword, locale)
    return true
  } catch (e) {
    if (isSessionExpired(e)) return 'expired'
    return false
  }
}

// Cihazı GERÇEKTEN ilk-açılış durumuna döndürür: hesap, token, yerel ilerleme,
// dil-seçildi/onboarding/kullanıcı-tipi/guide bayrakları, intro splash bayrağı
// ve ödül guard'ı - hepsi temizlenir, appState FIRST_LAUNCH olur. Hem çıkış
// yapma (logOut) hem hesap silme (deleteAccount) bunu kullanıyor.
//
// GEREKÇE: Velis kişisel, tek-kullanıcı-tek-cihaz bir yolculuk. "Çıkış yap"
// dendiğinde (veya telefon başkasına verildiğinde) cihaz temiz başlamalı -
// bir sonraki kişi/hesap, çıkılan hesabın gün/XP'sini DEVRALMAMALI ve dil
// seçimi + hoş geldin + VELIS Guide turunu SIFIRDAN görmeli. İlerleme kaybolmuyor:
// çıkılan hesaba tekrar giriş yapılınca sunucudan geri geliyor (bkz.
// handleSignIn saveStats). Misafir-önce-ilk-ritüel akışı etkilenmiyor -
// orada hiç giriş yapılmadığı için bu fonksiyon çağrılmıyor.
function resetDeviceToFirstLaunch(): void {
  clearUser()
  clearToken()
  clearStats()
  clearWelcomeSeen()
  clearLanguageSelected()
  clearUserType()
  clearGuideCompleted()
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('velis_intro_played')
    window.sessionStorage.removeItem('velis_ritual_session')
    window.localStorage.removeItem('velis_claimed_rewards')
  }
  setAppState('FIRST_LAUNCH')
}

export function logOut(): void {
  resetDeviceToFirstLaunch()
}

// Token varsa hesap sunucudan da GERÇEKTEN siliniyor - aksi halde silinen
// hesap DB'de kalıp Leaderboard'da görünmeye devam ederdi (bkz.
// authController.js removeAccount, leaderboard() canlı User.find({})
// sorgusu). Sunucu isteği başarısız olsa bile (ör. offline) kullanıcıyı
// yerelde kilitli bırakmamak için yerel temizlik yine de yapılıyor.
export async function deleteAccount(): Promise<void> {
  const token = getStoredToken()
  if (token) {
    try {
      await deleteAccountRequest(token)
    } catch (err) {
      console.error('[AuthService] Failed to delete account on server', err)
    }
  }
  resetDeviceToFirstLaunch()
}
