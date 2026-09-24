'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, ReactNode, RefObject } from 'react'
import VelisMark from '../VelisMark'
import AvatarPhoto from '../AvatarPhoto'
import ProfileEditSheet from '../ProfileEditSheet'
import {
  getStoredStats,
  saveStats,
  getStoredToken,
  ZERO_STATS as ZERO_VELIS_STATS,
  mergeStatsPreferringMoreAdvanced,
} from '../lib/auth'
import type { VelisUser, VelisStats } from '../lib/auth'
import { getStoredSettings } from '../lib/settings'
import { syncStatsToServer } from '../lib/journey'
import { getStoredUser, validateSignupForm, createAccount, saveToken, getPasswordRuleStatus, isAdminUser } from '../services/AuthService'
import type { PasswordRuleId } from '../services/AuthService'
import { registerRequest, loginRequest, AuthApiError, checkEmailAvailableRequest, updatePreferencesRequest, avatarUrl } from '../lib/authApi'
import { getTodayIndexMondayFirst } from '../services/TimeService'
import { useAppNav } from '../contexts/AppNavContext'
import { getAppState, setAppState } from '../services/AppStateManager'
import { getUserType, saveUserType } from '../lib/onboarding'
import type { UserType } from '../lib/onboarding'
import { LeafIcon, CigaretteIcon } from '../WhoAreYouScreen'
import { SettingsRow, ChevronRightIcon, CheckIcon } from './settings/shared'
import { getPrivacyPolicy, getTermsOfService } from '../lib/legalDocuments'
import LegalReader from '../LegalReader'
import OtpStep from '../OtpStep'
import ForgotPasswordFlow from '../ForgotPasswordFlow'
import DevPanel from '../devpanel/DevPanel'
import DateWheelField from '../DateWheelField'
import { useRouter } from 'next/navigation'
import { FONT_SANS } from '../lib/typography'
import { isDev } from '../constants/env'
import { useLocale } from '../contexts/LocaleContext'

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) return { firstName: trimmed, lastName: '' }
  return { firstName: trimmed.slice(0, spaceIdx), lastName: trimmed.slice(spaceIdx + 1) }
}

// Gizli geliştirici erişimi: profil logosuna (avatar) art arda 7 kez
// dokununca Developer Panel açılıyor (bkz. devpanel/DevPanel.tsx). Sadece
// development modunda işlev görüyor - üretimde tıklamanın hiçbir etkisi yok.
const DEV_TAP_TARGET = 3
const DEV_TAP_RESET_MS = 2000

// Profile onboarding akışı - Journey Overview'dan Profile sekmesine
// dokununca açılıyor. Hesap yoksa: Account Creation -> Success -> Profile.
// Hesap varsa: doğrudan Profile. Üç faz da aynı bileşen içinde, tek bir
// ~400ms fade-out/fade-in ile birbirine geçiyor (200ms çıkış + 200ms giriş),
// uygulamanın geri kalanındaki geçiş dilinin aynısı.


type Phase = 'create' | 'legal' | 'confirmEmail' | 'success' | 'profile'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.5-7 10-7c1.6 0 3 .3 4.2.8M22 12s-1 2-2.9 3.9M9.5 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function BigCheckIcon() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none">
      <path d="M2 13L12 23L32 2" stroke="#F3CE8E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SmallCheckIcon() {
  return (
    <svg width="11" height="9" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9.5L13 1.5" stroke="#171410" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Şifre alanının canlı kural listesindeki tek satır - kural karşılanınca
// nokta amber dolu daireye + içinde küçük tike dönüşüyor, yazı amber renge
// geçiyor (bkz. spec: "yeşile dönen dinamik kural listesi" - VELIS'te yeşil
// hiç kullanılmıyor, aynı anlamı uygulamanın amber vurgu rengiyle veriyoruz).
function PasswordRuleRow({ label, met }: { label: string; met: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: '14px',
          height: '14px',
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: met ? '#E3C08C' : 'transparent',
          border: met ? 'none' : '1px solid rgba(255, 255, 255, 0.22)',
          transition: 'background 200ms ease-in-out, border 200ms ease-in-out',
        }}
      >
        {met && <SmallCheckIcon />}
      </div>
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: '12px',
          color: met ? '#E3C08C' : '#8F8A83',
          transition: 'color 200ms ease-in-out',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function StreakIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2c1 3-2 4-2 7a4 4 0 1 0 8 0c0-1-.4-2-1-2 .6 2-.6 3-1.5 3C17 8 15 5.5 12 2Z"
        stroke="#E3C08C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 14a3 3 0 1 0 6 0c0-1.3-1-2-3-5-2 3-3 3.7-3 5Z" stroke="#E3C08C" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function RitualsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#E3C08C" strokeWidth="1.5" />
      <path d="M7.5 12.5L10.5 15.5L16.5 8.5" stroke="#E3C08C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TimeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#E3C08C" strokeWidth="1.5" />
      <path d="M12 7v5l3.2 2" stroke="#E3C08C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XPIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill="#E3C08C" />
    </svg>
  )
}

function labelStyle(color: string) {
  return {
    fontFamily: FONT_SANS,
    fontWeight: 600 as const,
    fontSize: '11px',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    color,
  }
}

function primaryButtonStyle(enabled: boolean) {
  return {
    width: '100%',
    padding: '15px 0',
    borderRadius: '999px',
    border: '1px solid rgba(255, 178, 90, 0.5)',
    background: 'transparent',
    color: '#E3C08C',
    fontFamily: FONT_SANS,
    fontWeight: 600 as const,
    fontSize: '16px',
    letterSpacing: '0.3px',
    cursor: enabled ? ('pointer' as const) : ('default' as const),
    opacity: enabled ? 1 : 0.4,
    pointerEvents: enabled ? ('auto' as const) : ('none' as const),
    transition: 'opacity 250ms ease-in-out, transform 150ms ease-out',
  }
}

function FieldInput({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  type = 'text',
  inputRef,
  enterKeyHint,
  autoComplete,
  error,
  rightSlot,
  autoFocus,
  maxLength,
  inputMode,
}: {
  label: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onFocus?: () => void
  onBlur: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  type?: string
  inputRef?: RefObject<HTMLInputElement | null>
  enterKeyHint?: 'next' | 'done'
  autoComplete?: string
  error?: string | null
  rightSlot?: ReactNode
  autoFocus?: boolean
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ width: '100%' }}>
      <label style={{ display: 'block', fontFamily: FONT_SANS, fontWeight: 500, fontSize: '12px', color: '#9A948C', marginBottom: '8px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          enterKeyHint={enterKeyHint}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          inputMode={inputMode}
          onFocus={() => {
            setFocused(true)
            onFocus?.()
          }}
          onBlur={() => {
            setFocused(false)
            onBlur()
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: rightSlot ? '13px 44px 13px 16px' : '13px 16px',
            borderRadius: '14px',
            border: error
              ? '1px solid rgba(255, 130, 100, 0.5)'
              : focused
              ? '1px solid rgba(255, 178, 90, 0.55)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: focused && !error ? '0 0 0 3px rgba(255, 178, 90, 0.1)' : 'none',
            background: 'rgba(255, 255, 255, 0.03)',
            color: '#F5F0EA',
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: '16px',
            outline: 'none',
            transition: 'border 200ms ease-out, box-shadow 200ms ease-out',
          }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>{rightSlot}</div>
        )}
      </div>
      {/* Her zaman DOM'da kalıyor (koşullu mount değil) ki opacity geçişi
          gerçekten yumuşakça belirsin/kaybolsun - bkz. spec: "Errors should
          fade in gently below each field." */}
      <div
        style={{
          marginTop: error ? '6px' : 0,
          maxHeight: error ? '20px' : 0,
          overflow: 'hidden',
          opacity: error ? 1 : 0,
          transition: 'opacity 250ms ease-in-out, max-height 250ms ease-in-out, margin-top 250ms ease-in-out',
        }}
      >
        <div style={{ fontFamily: FONT_SANS, fontSize: '12px', color: 'rgba(255, 150, 120, 0.85)' }}>{error}</div>
      </div>
    </div>
  )
}

// FieldInput ile AYNI görsel kabuk (label/border/hata) - sadece native
// Seçim alanı (Gender). Yerli <select> yerine VELIS temalı bir bottom-sheet
// açıyor - iOS'un beyaz/sistem picker'ı koyu premium arayüzde yamalı
// duruyordu ("Almost Done" sheet'iyle aynı görsel dil, bkz. aşağısı).
function SelectField({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  triggerRef,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  options: { value: string; label: string }[]
  placeholder: string
  triggerRef?: RefObject<HTMLButtonElement | null>
  error?: string | null
}) {
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label

  const close = () => {
    setOpen(false)
    onBlur()
  }

  return (
    <div style={{ width: '100%' }}>
      <label style={{ display: 'block', fontFamily: FONT_SANS, fontWeight: 500, fontSize: '12px', color: '#9A948C', marginBottom: '8px' }}>
        {label}
      </label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '13px 16px',
          borderRadius: '14px',
          border: error ? '1px solid rgba(255, 130, 100, 0.5)' : open ? '1px solid rgba(255, 178, 90, 0.55)' : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: open && !error ? '0 0 0 3px rgba(255, 178, 90, 0.1)' : 'none',
          background: 'rgba(255, 255, 255, 0.03)',
          color: selectedLabel ? '#F5F0EA' : 'rgba(245, 240, 234, 0.4)',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '16px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          transition: 'border 200ms ease-out, box-shadow 200ms ease-out',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel ?? placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M6 9L12 15L18 9" stroke="#9A948C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        style={{
          marginTop: error ? '6px' : 0,
          maxHeight: error ? '20px' : 0,
          overflow: 'hidden',
          opacity: error ? 1 : 0,
          transition: 'opacity 250ms ease-in-out, max-height 250ms ease-in-out, margin-top 250ms ease-in-out',
        }}
      >
        <div style={{ fontFamily: FONT_SANS, fontSize: '12px', color: 'rgba(255, 150, 120, 0.85)' }}>{error}</div>
      </div>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.55)',
          }}
        >
          <div
            className="velis-sheet--slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#0B0B0B',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderBottom: 'none',
              boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.5)',
              padding: '10px 14px calc(18px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
            }}
          >
            <div style={{ width: '36px', height: '5px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.2)', margin: '8px auto 14px' }} />
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 600,
                fontSize: '12px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#9A948C',
                textAlign: 'center',
                padding: '0 8px 8px',
              }}
            >
              {label}
            </div>
            {options.map((opt) => {
              const isSel = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    close()
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '15px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isSel ? 'rgba(255, 178, 90, 0.1)' : 'transparent',
                    color: isSel ? '#F3CE8E' : '#F5F0EA',
                    fontFamily: FONT_SANS,
                    fontWeight: isSel ? 600 : 400,
                    fontSize: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {opt.label}
                  {isSel && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13L9 17L19 7" stroke="#F3CE8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDuration(sec: number) {
  if (sec < 60) return `${sec} sec`
  const minutes = Math.floor(sec / 60)
  const remainder = sec % 60
  return remainder === 0 ? `${minutes} min` : `${minutes}m ${remainder}s`
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// "Almost Done" bottom sheet'indeki durum kartı - WhoAreYouScreen'deki
// ChoiceCard ile aynı görsel dil (amber halka + ikon), sheet bağlamına göre
// küçültülmüş boyutta.
function StatusCard({
  label,
  icon,
  selected,
  onTap,
}: {
  label: string
  icon: ReactNode
  selected: boolean
  onTap: () => void
}) {
  return (
    <div onClick={onTap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <div
        style={{
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: `1px solid ${selected ? 'rgba(243, 201, 139, 0.9)' : 'rgba(227, 192, 140, 0.3)'}`,
          boxShadow: selected ? '0 0 20px 3px rgba(243, 201, 139, 0.3)' : 'none',
          transform: selected ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 250ms ease, border 250ms ease, box-shadow 250ms ease',
        }}
      >
        {icon}
      </div>
      <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: '14px', color: selected ? '#E3C08C' : '#D2CCC5' }}>{label}</span>
    </div>
  )
}

export default function Profile() {
  const router = useRouter()
  const { refreshAppState } = useAppNav()
  const { t, locale } = useLocale()
  const [phase, setPhase] = useState<Phase | null>(null)
  const [displayPhase, setDisplayPhase] = useState<Phase | null>(null)
  const [fadeVisible, setFadeVisible] = useState(false)

  const [user, setUser] = useState<VelisUser | null>(null)
  const [stats, setStats] = useState<VelisStats | null>(null)
  const [todayIndex, setTodayIndex] = useState<number | null>(null)

  const [, setDevTapCount] = useState(0)
  const [devPanelOpen, setDevPanelOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const devTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogoTap = () => {
    if (!isDev && !isAdminUser()) return
    if (devTapTimerRef.current) clearTimeout(devTapTimerRef.current)
    setDevTapCount((c) => {
      const next = c + 1
      if (next >= DEV_TAP_TARGET) {
        setDevPanelOpen(true)
        return 0
      }
      return next
    })
    devTapTimerRef.current = setTimeout(() => setDevTapCount(0), DEV_TAP_RESET_MS)
  }

  // NOT: Gerçek bir backend/şifre deposu yok (bkz. AuthService.ts'teki not) -
  // "Sign In" bu yüzden bir kimlik doğrulaması YAPMIYOR, sadece isim
  // alanlarını atlayıp e-postadan türeterek aynı yerel hesabı (ve mevcut
  // istatistikleri) hızlıca geri kuruyor. Gerçek backend bağlanınca bu mod
  // gerçek bir login çağrısına dönüşecek.
  const [mode, setMode] = useState<'create' | 'signin'>('create')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  // Email alanından çıkılınca (blur) sunucuya sorulan erken "zaten kayıtlı mı"
  // kontrolü (bkz. lib/authApi.ts checkEmailAvailableRequest) - kullanıcı bütün
  // formu + OTP adımlarını doldurup EN SONDA bu hatayı almasın diye. Değer
  // değişince (onChange) hemen sıfırlanıyor - eski "taken" durumu yapışmasın.
  const [emailTaken, setEmailTaken] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showStatusSheet, setShowStatusSheet] = useState(false)
  const [sheetSelection, setSheetSelection] = useState<UserType | null>(null)
  const [privacyOpened, setPrivacyOpened] = useState(false)
  const [termsOpened, setTermsOpened] = useState(false)
  const [agreeChecked, setAgreeChecked] = useState(false)
  const [openedDocument, setOpenedDocument] = useState<'privacy' | 'terms' | null>(null)
  const [readProgress, setReadProgress] = useState(0)

  const lastNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const genderRef = useRef<HTMLButtonElement>(null)
  const birthDateRef = useRef<HTMLButtonElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const existing = getStoredUser()
    if (existing) {
      setUser(existing)
      setStats(getStoredStats())
      setPhase('profile')
    } else {
      setPhase('create')
      // Misafir (GUEST) tam olarak bu ekranı görmeye geldiğinde REGISTERING'e
      // geçiyor - bkz. services/AppStateManager.ts.
      if (getAppState() === 'GUEST') setAppState('REGISTERING')
    }
    setTodayIndex(getTodayIndexMondayFirst())
  }, [])

  // Fazlar arası ~400ms fade (200ms çıkış + 200ms giriş) - uygulamanın geri
  // kalanındaki cross-fade diliyle tutarlı. İki ayrı effect'e bölünmüş
  // durumda: biri sadece `phase` değişince displayPhase'i günceller, diğeri
  // sadece `displayPhase` değişince fade-in'i tetikler - aksi halde aynı
  // effect içinde setDisplayPhase çağrısı kendi rAF'ını iptal ediyordu.
  useEffect(() => {
    if (phase === null) return
    if (displayPhase === null) {
      setDisplayPhase(phase)
      return
    }
    if (displayPhase === phase) return
    setFadeVisible(false)
    const t = setTimeout(() => setDisplayPhase(phase), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (displayPhase === null) return
    const raf = requestAnimationFrame(() => setFadeVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [displayPhase])

  const { firstNameValid, lastNameValid, emailValid, genderValid, birthDateValid, passwordValid, formValid } = validateSignupForm({
    firstName,
    lastName,
    email,
    gender,
    birthDate,
    password,
  })
  const passwordRules = getPasswordRuleStatus(password)
  // Sign-in KASITLI OLARAK passwordValid'i (yeni hesap oluşturma kuralı)
  // kullanmıyor - var olan bir hesabın şifresi bu yeni kurallardan ÖNCE
  // oluşturulmuş olabilir, gerçek doğrulama zaten sunucuda (bkz.
  // loginRequest) yapılıyor.
  const signinValid = emailValid && password.length > 0
  const submitEnabled = mode === 'create' ? formValid && !emailTaken : signinValid

  const finishAuth = (newUser: VelisUser) => {
    setUser(newUser)
    setStats(getStoredStats())
    setPhase('success')
    // Hesap oluşturma (AuthService.createAccount) zaten appState'i
    // REGISTERED'a taşıyor - burada sadece context'i o güncel değeri
    // yansıtacak şekilde tazeliyoruz (nav'ı hemen açar, nabzı kesin kapatır).
    refreshAppState()
    // Giriş/kayıt anındaki güncel yerel tercihleri (dil + bildirimler)
    // sunucuya senkronluyoruz - aksi halde sunucudaki soğuma hatırlatma
    // job'ı (bkz. server/src/jobs/cooldownReminder.js) bir sonraki toggle
    // değişikliğine kadar varsayılan (EN, açık) değerleri görürdü.
    const token = getStoredToken()
    if (token) {
      const local = getStoredSettings()
      updatePreferencesRequest(token, {
        locale: local.language,
        notificationPrefs: {
          dailyRitualReminder: local.notifications.dailyRitualReminder,
        },
      }).catch(() => {})
    }
  }

  const [authError, setAuthError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create Account artık hesabı hemen oluşturmuyor - önce "Almost Done" bottom
  // sheet'i, sonra Legal Agreement, sonra e-posta OTP doğrulaması geliyor
  // (bkz. handleConfirmStatus, handleEmailVerified). Form burada zaten
  // doğrulanmış durumda.
  const handleContinueToConfirm = () => {
    if (!formValid || submitting) return
    setAuthError(null)
    setSheetSelection(getUserType())
    setShowStatusSheet(true)
  }

  const handleConfirmStatus = () => {
    if (sheetSelection) saveUserType(sheetSelection)
    setShowStatusSheet(false)
    setPhase('legal')
  }

  const bothDocsOpened = privacyOpened && termsOpened

  const handleOpenDocument = (doc: 'privacy' | 'terms') => {
    setReadProgress(0)
    setOpenedDocument(doc)
  }

  const handleMarkReviewed = (doc: 'privacy' | 'terms') => {
    if (doc === 'privacy') setPrivacyOpened(true)
    else setTermsOpened(true)
    setOpenedDocument(null)
  }

  // Hesap oluşturmada telefon numarası HİÇ sorulmuyor (bkz. talep) - Legal
  // onayından sonra doğrudan e-posta OTP doğrulamasına geçiliyor.
  const handleContinueFromLegal = () => {
    if (!bothDocsOpened || !agreeChecked) return
    setPhase('confirmEmail')
  }

  // Email OTP doğrulanınca hesap GERÇEKTEN oluşturuluyor - akıştaki son adım.
  // Hata dönerse (string) OtpStep bunu kod alanının altında gösteriyor.
  const handleEmailVerified = async (): Promise<string | void> => {
    try {
      // Bu cihazda ilk ritüel kaydolmadan ÖNCE tamamlanmış olabilir (bkz.
      // Guided Registration Mode akışı) - o ilerlemeyi kaybetmemek için ilk
      // anlık görüntüyü hesapla birlikte sunucuya da yazıyoruz.
      const result = await registerRequest(
        `${firstName.trim()} ${lastName.trim()}`.trim(),
        email.trim(),
        password,
        undefined,
        getStoredStats(),
        locale,
        { gender: gender || undefined, birthDate: birthDate || undefined }
      )
      saveToken(result.token)
      finishAuth(
        createAccount({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          id: result.user.id,
          isAdmin: result.user.isAdmin,
        })
      )
    } catch (e) {
      // Sunucu mesajı İngilizce - "isim alınmış" için uygulama diline çevrilmiş metin.
      if (e instanceof AuthApiError && e.status === 409 && e.message.startsWith('Name')) return t('profile.edit.nameTaken')
      return e instanceof AuthApiError ? e.message : t('profile.error.generic')
    }
  }

  const handleSignIn = async () => {
    if (!signinValid || submitting) return
    setAuthError(null)
    setSubmitting(true)
    try {
      // Bu hesaba daha önce bu cihazda girilmiş miydi - login çağrısından ve
      // createAccount'un mevcut kaydı değiştirmesinden ÖNCE bakılıyor.
      const previouslyStoredUser = getStoredUser()
      const result = await loginRequest(email.trim(), password)
      saveToken(result.token)
      const serverStats = result.user.stats ?? ZERO_VELIS_STATS
      const isSameAccountReLogin =
        !!previouslyStoredUser &&
        (previouslyStoredUser.id === result.user.id ||
          previouslyStoredUser.email.toLowerCase() === result.user.email.toLowerCase())
      // AYNI hesaba tekrar giriş: cihaz sunucudan daha ileride olabilir (ör.
      // token süresi dolup arka plan senkronları sessizce başarısız olmuşsa -
      // bkz. mergeStatsPreferringMoreAdvanced) - körü körüne ezmek yerine
      // ikisinin daha ilerisini koruyoruz.
      //
      // FARKLI bir hesaba (ya da misafirken bir hesaba) giriş: cihazdaki veri
      // bu hesaba ait DEĞİL - eskisi gibi doğrudan sunucununkiyle değiştiriyoruz,
      // aksi halde önceki hesabın/misafirin ilerlemesi bu hesaba karışırdı.
      const mergedStats = isSameAccountReLogin ? mergeStatsPreferringMoreAdvanced(getStoredStats(), serverStats) : serverStats
      saveStats(mergedStats)
      // Birleştirme cihazı öne çıkardıysa (token ölüyken biriken ilerleme gibi)
      // sunucuyu HEMEN güncelle - kullanıcı bir ritüel daha yapana kadar
      // beklemesin, giriş tek başına yeterli olsun.
      if (mergedStats.totalXP > serverStats.totalXP) syncStatsToServer(mergedStats)
      const { firstName: fn, lastName: ln } = splitName(result.user.name)
      finishAuth(
        createAccount({
          firstName: fn,
          lastName: ln,
          email: result.user.email,
          id: result.user.id,
          isAdmin: result.user.isAdmin,
          avatarVersion: result.user.avatarVersion,
          blockedUsers: result.user.blockedUsers,
        })
      )
    } catch (e) {
      setAuthError(e instanceof AuthApiError ? e.message : t('profile.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = () => {
    if (mode === 'create') handleContinueToConfirm()
    else handleSignIn()
  }

  const advance = (
    e: KeyboardEvent<HTMLInputElement>,
    next: RefObject<HTMLInputElement | null> | RefObject<HTMLSelectElement | null> | null,
    submitOnEnter?: boolean
  ) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (next?.current) {
      next.current.focus()
    } else if (submitOnEnter) {
      handleSubmit()
    }
  }

  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }))

  // Best-effort erken kontrol - başarısız olursa (ağ/sunucu) sessizce yutuluyor,
  // kesin kontrol zaten register() sırasında sunucuda tekrar yapılıyor (bkz.
  // handleEmailVerified) - kullanıcı hiçbir zaman bu yüzden takılıp kalmıyor.
  const checkEmailAvailability = async () => {
    const value = email.trim()
    if (!value || !emailValid) return
    try {
      const res = await checkEmailAvailableRequest(value)
      setEmailTaken(!res.available)
    } catch {
      // no-op
    }
  }

  if (phase === null || displayPhase === null) {
    return <main style={{ minHeight: '100vh', background: '#050505' }} />
  }

  if (showForgotPassword) {
    return (
      <ForgotPasswordFlow
        onCancel={() => setShowForgotPassword(false)}
        onDone={(resetEmail) => {
          setShowForgotPassword(false)
          setMode('signin')
          setEmail(resetEmail)
        }}
      />
    )
  }

  return (
    <div style={{ opacity: fadeVisible ? 1 : 0, transition: 'opacity 200ms ease-in-out' }}>
      {displayPhase === 'create' && (
        <main
          style={{
            height: '100dvh',
            background: '#050505',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* İçerik sınırsız kayabilsin diye main'in KENDİSİ sabit yükseklikte,
              gerçek kaydırma bu iç konteynerde oluyor (LegalReader'daki aynı
              güvenilir desen) - herhangi bir üst/dış eleman scroll'u
              engelleyemiyor, davranış her tarayıcıda garanti. */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 'calc(28px + env(safe-area-inset-top)) 24px calc(90px + env(safe-area-inset-bottom))',
            }}
          >
          {/* Hesap yokken (GUEST/REGISTERING/FIRST_LAUNCH) avatar mevcut
              değil - Dev Panel'e ulaşmanın TEK yolu bu logoya aynı 7-dokunuş
              jestini eklemek (bkz. handleLogoTap, aşağıdaki 'profile' fazındaki
              avatar ile aynı davranış). Görsel olarak HİÇBİR değişiklik yok. */}
          <div onClick={handleLogoTap}>
            <VelisMark />
          </div>
          <h1
            style={{
              margin: '14px 0 0',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: '26px',
              color: '#F5F0EA',
              textAlign: 'center',
            }}
          >
            {mode === 'create' ? t('profile.create.title') : t('profile.signin.title')}
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: FONT_SANS,
              fontWeight: 400,
              fontSize: '14px',
              color: '#D2CCC5',
              textAlign: 'center',
            }}
          >
            {mode === 'create' ? t('profile.create.subtitle') : t('profile.signin.subtitle')}
          </p>

          <div style={{ marginTop: '24px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'create' && (
              <>
                <FieldInput
                  label={t('profile.field.firstName')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => markTouched('firstName')}
                  onKeyDown={(e) => advance(e, lastNameRef)}
                  enterKeyHint="next"
                  autoComplete="given-name"
                  autoFocus
                  error={touched.firstName && !firstNameValid ? t('profile.error.firstName') : null}
                />
                <FieldInput
                  label={t('profile.field.lastName')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => markTouched('lastName')}
                  onKeyDown={(e) => advance(e, emailRef)}
                  enterKeyHint="next"
                  autoComplete="family-name"
                  error={touched.lastName && !lastNameValid ? t('profile.error.lastName') : null}
                />
              </>
            )}
            <FieldInput
              label={t('profile.field.email')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailTaken(false)
              }}
              onBlur={() => {
                markTouched('email')
                if (mode === 'create') checkEmailAvailability()
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (mode === 'create') genderRef.current?.focus()
                else passwordRef.current?.focus()
              }}
              type="email"
              enterKeyHint="next"
              autoComplete="email"
              autoFocus={mode === 'signin'}
              inputRef={emailRef}
              error={
                touched.email && !emailValid
                  ? t('profile.error.email')
                  : mode === 'create' && touched.email && emailTaken
                  ? t('profile.error.emailTaken')
                  : null
              }
            />
            {mode === 'create' && (
              <>
                <SelectField
                  label={t('profile.field.gender')}
                  value={gender}
                  onChange={(v) => setGender(v)}
                  onBlur={() => markTouched('gender')}
                  options={[
                    { value: 'Female', label: t('profile.gender.female') },
                    { value: 'Male', label: t('profile.gender.male') },
                    { value: 'Other', label: t('profile.gender.other') },
                    { value: 'Prefer not to say', label: t('profile.gender.preferNotToSay') },
                  ]}
                  placeholder={t('profile.field.genderPlaceholder')}
                  triggerRef={genderRef}
                  error={touched.gender && !genderValid ? t('profile.error.gender') : null}
                />
                <DateWheelField
                  label={t('profile.field.birthDate')}
                  value={birthDate}
                  onChange={(v) => setBirthDate(v)}
                  onBlur={() => markTouched('birthDate')}
                  placeholder={t('profile.field.birthDatePlaceholder')}
                  triggerRef={birthDateRef}
                  error={touched.birthDate && !birthDateValid ? t('profile.error.birthDate') : null}
                />
              </>
            )}
            <div>
              <FieldInput
                label={t('profile.field.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  setPasswordFocused(false)
                  markTouched('password')
                }}
                onKeyDown={(e) => advance(e, null, true)}
                type={showPassword ? 'text' : 'password'}
                enterKeyHint="done"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                inputRef={passwordRef}
                error={mode === 'create' && touched.password && !passwordValid ? t('profile.error.password') : null}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.4)', display: 'flex' }}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                }
              />
              {/* Canlı kural listesi - SADECE hesap oluştururken (bkz. spec,
                  giriş yaparken bu kurallar anlamsız - var olan bir şifre bu
                  kurallardan önce oluşturulmuş olabilir) ve sadece yazarken
                  görünüyor, odak kaybolunca kayboluyor, yerini (varsa)
                  yukarıdaki hata mesajına bırakıyor. Her kural bağımsız
                  olarak karşılanınca anında amber'e dönüyor (bkz.
                  PasswordRuleRow, getPasswordRuleStatus). */}
              {mode === 'create' && (
                <div
                  style={{
                    marginTop: passwordFocused ? '10px' : 0,
                    maxHeight: passwordFocused ? '80px' : 0,
                    overflow: 'hidden',
                    opacity: passwordFocused ? 1 : 0,
                    transition: 'opacity 250ms ease-in-out, max-height 250ms ease-in-out, margin-top 250ms ease-in-out',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '8px', columnGap: '12px' }}>
                    {(
                      [
                        ['length', t('profile.password.rule.length')],
                        ['uppercase', t('profile.password.rule.uppercase')],
                        ['lowercase', t('profile.password.rule.lowercase')],
                        ['number', t('profile.password.rule.number')],
                        ['special', t('profile.password.rule.special')],
                      ] as [PasswordRuleId, string][]
                    ).map(([rule, label]) => (
                      <PasswordRuleRow key={rule} label={label} met={passwordRules[rule]} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '20px', width: '100%', maxWidth: '380px' }}>
            <button className="velis-primary-btn" onClick={handleSubmit} style={primaryButtonStyle(submitEnabled && !submitting)}>
              {mode === 'signin' && submitting ? t('profile.submit.signingin') : mode === 'create' ? t('profile.submit.create') : t('profile.submit.signin')}
            </button>
            <div
              style={{
                marginTop: authError ? '12px' : 0,
                maxHeight: authError ? '20px' : 0,
                overflow: 'hidden',
                opacity: authError ? 1 : 0,
                textAlign: 'center',
                transition: 'opacity 250ms ease-in-out, max-height 250ms ease-in-out, margin-top 250ms ease-in-out',
              }}
            >
              <div style={{ fontFamily: FONT_SANS, fontSize: '13px', color: 'rgba(255, 150, 120, 0.85)' }}>{authError}</div>
            </div>
          </div>

          {mode === 'signin' && (
            <button
              onClick={() => setShowForgotPassword(true)}
              style={{
                marginTop: '14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: FONT_SANS,
                fontWeight: 400,
                fontSize: '13px',
                color: '#E3C08C',
              }}
            >
              {t('passwordReset.link')}
            </button>
          )}

          <button
            onClick={() => {
              setAuthError(null)
              setMode((m) => (m === 'create' ? 'signin' : 'create'))
            }}
            style={{
              marginTop: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: FONT_SANS,
              fontWeight: 400,
              fontSize: '13px',
              color: '#8F8A83',
            }}
          >
            {mode === 'create' ? (
              <>{t('profile.switchToSignin.prefix')}<span style={{ color: '#E3C08C' }}>{t('profile.switchToSignin.action')}</span></>
            ) : (
              <>{t('profile.switchToCreate.prefix')}<span style={{ color: '#E3C08C' }}>{t('profile.switchToCreate.action')}</span></>
            )}
          </button>
          </div>
        </main>
      )}

      {displayPhase === 'legal' && (
        <main
          style={{
            height: '100dvh',
            background: '#050505',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'calc(28px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
            overflow: 'hidden',
          }}
        >
          <VelisMark />
          <h1
            style={{
              marginTop: '14px',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: '26px',
              color: '#F5F0EA',
              textAlign: 'center',
            }}
          >
            {t('profile.legal.title')}
          </h1>
          <p
            style={{
              marginTop: '8px',
              fontFamily: FONT_SANS,
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: 1.4,
              color: '#D2CCC5',
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}
          >
            {t('profile.legal.subtitle')}
          </p>

          <div style={{ marginTop: '28px', width: '100%', maxWidth: '380px', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.02)', overflow: 'hidden' }}>
            <SettingsRow
              label={t('profile.legal.privacyPolicy')}
              onClick={() => handleOpenDocument('privacy')}
              chevron={false}
              first
              rightElement={privacyOpened ? <CheckIcon /> : <ChevronRightIcon />}
            />
            <SettingsRow
              label={t('profile.legal.termsOfService')}
              onClick={() => handleOpenDocument('terms')}
              chevron={false}
              rightElement={termsOpened ? <CheckIcon /> : <ChevronRightIcon />}
            />
          </div>

          <div
            onClick={() => bothDocsOpened && setAgreeChecked((v) => !v)}
            style={{
              marginTop: '22px',
              width: '100%',
              maxWidth: '380px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              opacity: bothDocsOpened ? 1 : 0.4,
              cursor: bothDocsOpened ? 'pointer' : 'default',
              transition: 'opacity 250ms ease',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                flexShrink: 0,
                marginTop: '1px',
                borderRadius: '6px',
                border: agreeChecked ? '1px solid rgba(243, 201, 139, 0.9)' : '1px solid rgba(255, 255, 255, 0.25)',
                background: agreeChecked ? '#F3C98B' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 200ms ease, border 200ms ease',
              }}
            >
              {agreeChecked && <CheckIcon color="#171410" />}
            </div>
            <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: '13px', lineHeight: 1.5, color: '#D2CCC5' }}>
              {t('profile.legal.agree')}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ width: '100%', maxWidth: '380px', marginBottom: 'calc(70px + env(safe-area-inset-bottom))' }}>
            <button
              className="velis-primary-btn"
              onClick={handleContinueFromLegal}
              style={primaryButtonStyle(bothDocsOpened && agreeChecked)}
            >
              {t('profile.legal.createAccount')}
            </button>
          </div>
        </main>
      )}

      {openedDocument && (
        <LegalReader
          doc={openedDocument === 'privacy' ? getPrivacyPolicy(locale) : getTermsOfService(locale)}
          progress={readProgress}
          onProgress={setReadProgress}
          onBack={() => setOpenedDocument(null)}
          onUnderstand={() => handleMarkReviewed(openedDocument)}
        />
      )}

      {displayPhase === 'confirmEmail' && (
        <OtpStep
          channel="email"
          destination={email.trim()}
          title={t('otp.email.title')}
          onVerified={handleEmailVerified}
          backLabel={t('otp.editDetails')}
          onBack={() => setPhase('create')}
          devSkip
        />
      )}

      {displayPhase === 'success' && (
        <main
          style={{
            minHeight: '100vh',
            background: '#050505',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 24px 96px',
          }}
        >
          <div
            style={{
              width: '86px',
              height: '86px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 178, 90, 0.55)',
              boxShadow: '0 0 18px 2px rgba(255, 178, 90, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BigCheckIcon />
          </div>
          <h1 style={{ marginTop: '28px', fontFamily: FONT_SANS, fontWeight: 600, fontSize: '26px', color: '#F5F0EA' }}>
            {t('profile.success.title')}
          </h1>
          <p style={{ marginTop: '10px', fontFamily: FONT_SANS, fontWeight: 400, fontSize: '16px', color: '#D2CCC5' }}>
            {t('profile.success.subtitle')}
          </p>
          <div style={{ marginTop: '36px', width: '100%', maxWidth: '280px' }}>
            <button onClick={() => setPhase('profile')} style={primaryButtonStyle(true)}>
              {t('common.continue')}
            </button>
          </div>
        </main>
      )}

      {displayPhase === 'profile' && user && stats && (
        <main
          style={{
            height: '100dvh',
            background: '#050505',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'calc(40px + env(safe-area-inset-top)) 20px 0',
            overflow: 'hidden',
          }}
        >
          {/* Profil düzenleme girişi - Ayarlar dişlisinin sol üstteki simetriği:
              aynı boyut, çizgi kalınlığı, amber dokunuş efekti ve güvenli alan
              hesabı. Fotoğraf + isim düzenleme ekranını açıyor (bkz.
              ProfileEditSheet). */}
          <button
            className="profile-settings-btn"
            onClick={() => setEditOpen(true)}
            aria-label={t('profile.edit.open')}
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 22px)',
              left: 'calc(env(safe-area-inset-left, 0px) + 20px)',
              background: 'none',
              border: 'none',
              padding: '6px',
              display: 'flex',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 200ms ease-in-out',
              zIndex: 5,
            }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 20l1-4.2L16.6 4.2a1.8 1.8 0 0 1 2.55 0l.65.65a1.8 1.8 0 0 1 0 2.55L8.2 19 4 20Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M14.6 6.2l3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Ayarlar girişi - Apple'ın kendi uygulamalarındaki gibi sağ üst
              köşede, gezinme eylemi olarak. Avatar/isim/istatistikler asıl
              odak kalıyor - bu yüzden büyük bir daire arka planı yok, sadece
              ince bir çizgi simgesi, güvenli alana saygılı sabit konumda. */}
          <button
            className="profile-settings-btn"
            onClick={() => router.push('/profile/settings')}
            aria-label="Settings"
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 22px)',
              right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
              background: 'none',
              border: 'none',
              padding: '6px',
              display: 'flex',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 200ms ease-in-out',
              zIndex: 5,
            }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 13.6c.05-.53.05-1.07 0-1.6l1.6-1.25a.6.6 0 0 0 .14-.77l-1.5-2.6a.6.6 0 0 0-.73-.27l-1.9.76a7.6 7.6 0 0 0-1.38-.8l-.29-2.02a.6.6 0 0 0-.6-.51h-3a.6.6 0 0 0-.6.51l-.29 2.02c-.5.2-.96.47-1.38.8l-1.9-.76a.6.6 0 0 0-.73.27l-1.5 2.6a.6.6 0 0 0 .14.77l1.6 1.25c-.05.53-.05 1.07 0 1.6l-1.6 1.25a.6.6 0 0 0-.14.77l1.5 2.6a.6.6 0 0 0 .73.27l1.9-.76c.42.33.88.6 1.38.8l.29 2.02a.6.6 0 0 0 .6.51h3a.6.6 0 0 0 .6-.51l.29-2.02c.5-.2.96-.47 1.38-.8l1.9.76a.6.6 0 0 0 .73-.27l1.5-2.6a.6.6 0 0 0-.14-.77l-1.6-1.25Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            onClick={handleLogoTap}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: '1px solid rgba(255, 178, 90, 0.5)',
              boxShadow: '0 0 14px 1px rgba(255, 178, 90, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 178, 90, 0.05)',
              cursor: isDev || isAdminUser() ? 'pointer' : 'default',
              overflow: 'hidden',
            }}
          >
            <AvatarPhoto
              src={avatarUrl(user.id, user.avatarVersion)}
              fallback={
                <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: '22px', color: '#F3CE8E' }}>
                  {(user.firstName[0] ?? '').toUpperCase()}
                  {(user.lastName[0] ?? '').toUpperCase()}
                </span>
              }
            />
          </div>
          <h1 style={{ marginTop: '18px', fontFamily: FONT_SANS, fontWeight: 600, fontSize: '26px', color: '#F5F0EA' }}>
            {t('profile.hello', { name: `${user.firstName} ${user.lastName}` })}
          </h1>
          <p style={{ marginTop: '4px', fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', color: '#8F8A83' }}>{user.email}</p>
          <p style={{ marginTop: '8px', fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', color: '#D2CCC5' }}>
            {t('profile.doingGreat')}
          </p>

          <div
            style={{
              marginTop: '32px',
              width: '100%',
              maxWidth: '560px',
              display: 'flex',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '20px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={labelStyle('#9A948C')}>{t('profile.currentDay')}</div>
              <div style={{ marginTop: '6px', fontFamily: FONT_SANS, fontWeight: 700, fontSize: '26px', color: '#F5F0EA' }}>
                {stats.journeyDay}
              </div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '0 16px' }} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={labelStyle('#9A948C')}>{t('profile.totalXP')}</div>
                <div style={{ marginTop: '6px', fontFamily: FONT_SANS, fontWeight: 700, fontSize: '26px', color: '#F3CE8E' }}>
                  {stats.totalXP}
                </div>
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.6px',
                  color: '#E3C08C',
                  border: '1px solid rgba(255, 178, 90, 0.35)',
                  borderRadius: '999px',
                  padding: '4px 10px',
                }}
              >
                {t('common.xp')}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '26px', width: '100%', maxWidth: '560px' }}>
            <div style={labelStyle('#9A948C')}>{t('profile.thisWeek')}</div>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between' }}>
              {WEEKDAY_LABELS.map((d, i) => {
                const isToday = todayIndex === i
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)' }}>{d}</span>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isToday ? 'radial-gradient(circle at 35% 30%, #FFD9A0 0%, #FFB347 45%, #F08A24 100%)' : 'transparent',
                        border: isToday ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: isToday ? '0 0 6px 1px rgba(255, 178, 90, 0.4)' : 'none',
                      }}
                    >
                      {isToday && <SmallCheckIcon />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: '28px',
              width: '100%',
              maxWidth: '560px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.02)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 20px 10px', ...labelStyle('#9A948C') }}>{t('profile.statistics')}</div>
            {[
              { icon: <StreakIcon />, label: t('profile.stat.currentStreak'), value: `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}` },
              { icon: <RitualsIcon />, label: t('profile.stat.ritualsCompleted'), value: `${stats.totalRitualCount}` },
              { icon: <TimeIcon />, label: t('profile.stat.totalTime'), value: formatDuration(stats.totalRitualTimeSec) },
              { icon: <XPIcon />, label: t('profile.stat.mindfulnessXP'), value: `${stats.totalXP} ${t('common.xp')}` },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {row.icon}
                  <span style={{ fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', color: '#D9D3CB' }}>{row.label}</span>
                </div>
                <span style={{ fontFamily: FONT_SANS, fontWeight: 600, fontSize: '14px', color: '#F5F0EA' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 'calc(80px + env(safe-area-inset-bottom))', flexShrink: 0 }} />
        </main>
      )}

      {showStatusSheet && (
        <div
          onClick={() => setShowStatusSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.55)',
          }}
        >
          <div
            className="velis-sheet--slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#0B0B0B',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderBottom: 'none',
              boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.5)',
              padding: '10px 24px calc(28px + env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ width: '36px', height: '5px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.2)', marginTop: '8px', marginBottom: '22px' }} />

            <h2 style={{ margin: 0, fontFamily: FONT_SANS, fontWeight: 600, fontSize: '20px', color: '#F5F0EA', textAlign: 'center' }}>
              {t('profile.almostDone.title')}
            </h2>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: FONT_SANS,
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: 1.4,
                color: '#9A948C',
                textAlign: 'center',
                whiteSpace: 'pre-line',
              }}
            >
              {t('profile.almostDone.subtitle')}
            </p>

            <div style={{ marginTop: '26px', display: 'flex', gap: '28px' }}>
              <StatusCard
                label={t('profile.almostDone.nonsmoker')}
                icon={<LeafIcon size={34} />}
                selected={sheetSelection === 'Nonsmoker'}
                onTap={() => setSheetSelection('Nonsmoker')}
              />
              <StatusCard
                label={t('profile.almostDone.smoker')}
                icon={<CigaretteIcon size={34} />}
                selected={sheetSelection === 'Smoker'}
                onTap={() => setSheetSelection('Smoker')}
              />
            </div>

            <div style={{ marginTop: '28px', width: '100%' }}>
              <button
                className="velis-primary-btn"
                onClick={handleConfirmStatus}
                style={primaryButtonStyle(sheetSelection !== null)}
              >
                {t('common.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && user && <ProfileEditSheet user={user} onClose={() => setEditOpen(false)} onUserChange={setUser} />}

      <DevPanel visible={devPanelOpen} onClose={() => setDevPanelOpen(false)} />
    </div>
  )
}
