'use client'

import { useEffect, useState } from 'react'
import { SettingsShell, SettingsCard, SettingsRow, SANS, cardStyle, labelStyle, fieldInputStyle, saveButtonStyle } from '../shared'
import type { VelisUser } from '../../../lib/auth'
import ProfilePhotoEditor from '../../../ProfilePhotoEditor'
import {
  getStoredUser,
  updateUserName,
  changePassword as changePasswordService,
  logOut as logOutService,
  deleteAccount as deleteAccountService,
  getPasswordRuleStatus,
  isPasswordValid,
} from '../../../services/AuthService'
import type { PasswordRuleId } from '../../../services/AuthService'
import { useLocale } from '../../../contexts/LocaleContext'

// app/profile/page.tsx'teki PasswordRuleRow ile aynı görsel dil (amber
// dolu daire + tik) - sadece burada tekrarlanıyor çünkü orijinali export
// edilmiyor ve bu tek bir küçük satır bileşeni.
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
        {met && (
          <svg width="9" height="7" viewBox="0 0 14 11" fill="none">
            <path d="M1 5.5L5 9.5L13 1.5" stroke="#050505" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontFamily: SANS, fontSize: '12px', color: met ? '#E3C08C' : '#8F8A83', transition: 'color 200ms ease-in-out' }}>
        {label}
      </span>
    </div>
  )
}

// app/profile/page.tsx'teki EyeIcon ile aynı görsel dil - burada tekrarlanıyor
// çünkü orijinali export edilmiyor.
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

// Şifre alanları için: input + göz ikonlu göster/gizle butonu. Sadece bu
// sayfadaki 3 şifre alanı (mevcut/yeni/onay) için, tek bir yerde.
function PasswordField({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  focused,
  visible,
  onToggleVisible,
}: {
  value: string
  onChange: (v: string) => void
  onFocus: () => void
  onBlur: () => void
  placeholder: string
  focused: boolean
  visible: boolean
  onToggleVisible: () => void
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        style={fieldInputStyle(focused, true)}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255, 255, 255, 0.4)',
          display: 'flex',
          padding: 0,
        }}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  )
}

type EditMode = 'name' | 'password' | null

export default function AccountSettings() {
  const { t, locale } = useLocale()
  const [user, setUser] = useState<VelisUser | null>(null)
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [focused, setFocused] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [confirmingLogOut, setConfirmingLogOut] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [finalConfirmingDelete, setFinalConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const stored = getStoredUser()
    setUser(stored)
    if (stored) {
      setFirstName(stored.firstName)
      setLastName(stored.lastName)
    }
  }, [])

  const openEdit = (mode: EditMode) => {
    setEditMode(editMode === mode ? null : mode)
    setPasswordSaved(false)
    setPasswordError(null)
    setNameError(null)
  }

  const saveName = async () => {
    if (!user || nameSaving) return
    setNameSaving(true)
    setNameError(null)
    const next = await updateUserName(user, firstName, lastName)
    setNameSaving(false)
    if (next === 'taken') {
      setNameError(t('profile.edit.nameTaken'))
      return
    }
    if (!next) {
      setNameError(t('settings.account.saveFailed'))
      return
    }
    setUser(next)
    setEditMode(null)
  }

  const passwordRules = getPasswordRuleStatus(newPassword)
  const canSubmitPassword = isPasswordValid(newPassword) && newPassword === confirmPassword && currentPassword.length > 0

  const changePassword = async () => {
    if (passwordSaving || !canSubmitPassword) return
    setPasswordSaving(true)
    setPasswordError(null)
    const ok = await changePasswordService(currentPassword, newPassword, confirmPassword, locale)
    setPasswordSaving(false)
    if (!ok) {
      setPasswordError(t('settings.account.saveFailed'))
      return
    }
    setPasswordSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => {
      setPasswordSaved(false)
      setEditMode(null)
    }, 1400)
  }

  // Çıkış yapma ve hesap silme AYNI davranış: cihaz ilk-açılışa dönüyor
  // (bkz. AuthService.resetDeviceToFirstLaunch). Sert yenilemeyle '/'ye -
  // client-side router.push ile gidilirse ağaçta eski React state'i (ve
  // intro/guide "görüldü" işaretleri) hayatta kalıp hoş geldin + tur tekrar
  // oynamıyordu.
  const handleLogOut = () => {
    logOutService()
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  const handleDeleteAccount = async () => {
    if (deleting) return
    setDeleting(true)
    await deleteAccountService()
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  return (
    <SettingsShell title={t('settings.account.title')}>
      {user && (
        // SettingsCard yerine kendi kabımız: çok hafif amber ışık ("ambiyans")
        // fotoğrafı sahneliyor - BAŞLIĞI da kapsaması için kartın TAMAMINA
        // uygulanıyor (içerik alanına verilince başlıkla arasında sert bir
        // yatay çizgi oluşuyordu). Fotoğraf mantığı ProfilePhotoEditor'da,
        // Profil sayfasındaki kalem düğmesiyle AYNI bileşen.
        <div
          style={{
            ...cardStyle,
            background:
              'radial-gradient(ellipse 85% 60% at 50% 40%, rgba(255, 178, 90, 0.10) 0%, rgba(255, 178, 90, 0) 100%), rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ padding: '14px 20px 10px', ...labelStyle('#9A948C') }}>{t('settings.account.photo.title')}</div>
          <div style={{ padding: '6px 20px 22px' }}>
            <ProfilePhotoEditor user={user} onUserChange={setUser} />
          </div>
        </div>
      )}

      <SettingsCard>
        <SettingsRow label={t('settings.account.editName')} onClick={() => openEdit('name')} chevron={editMode !== 'name'} first />
        {editMode === 'name' && (
          <div style={{ padding: '4px 20px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={() => setFocused('firstName')}
              onBlur={() => setFocused(null)}
              placeholder={t('settings.account.firstNamePlaceholder')}
              style={fieldInputStyle(focused === 'firstName')}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={() => setFocused('lastName')}
              onBlur={() => setFocused(null)}
              placeholder={t('settings.account.lastNamePlaceholder')}
              style={fieldInputStyle(focused === 'lastName')}
            />
            {nameError && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#E39C8C' }}>{nameError}</p>}
            <button onClick={saveName} disabled={nameSaving} style={{ ...saveButtonStyle, opacity: nameSaving ? 0.6 : 1 }}>
              {nameSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        )}

        <SettingsRow label={t('settings.account.changePassword')} onClick={() => openEdit('password')} chevron={editMode !== 'password'} />
        {editMode === 'password' && (
          <div style={{ padding: '4px 20px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PasswordField
              value={currentPassword}
              onChange={setCurrentPassword}
              onFocus={() => setFocused('currentPassword')}
              onBlur={() => setFocused(null)}
              placeholder={t('settings.account.currentPasswordPlaceholder')}
              focused={focused === 'currentPassword'}
              visible={showCurrentPassword}
              onToggleVisible={() => setShowCurrentPassword((v) => !v)}
            />
            <PasswordField
              value={newPassword}
              onChange={setNewPassword}
              onFocus={() => setFocused('newPassword')}
              onBlur={() => setFocused(null)}
              placeholder={t('settings.account.newPasswordPlaceholder')}
              focused={focused === 'newPassword'}
              visible={showNewPassword}
              onToggleVisible={() => setShowNewPassword((v) => !v)}
            />
            {focused === 'newPassword' && (
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
            )}
            <PasswordField
              value={confirmPassword}
              onChange={setConfirmPassword}
              onFocus={() => setFocused('confirmPassword')}
              onBlur={() => setFocused(null)}
              placeholder={t('settings.account.confirmPasswordPlaceholder')}
              focused={focused === 'confirmPassword'}
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword((v) => !v)}
            />
            {passwordError && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#E39C8C' }}>{passwordError}</p>}
            <button
              onClick={changePassword}
              disabled={passwordSaving || !canSubmitPassword}
              style={{ ...saveButtonStyle, opacity: passwordSaving || !canSubmitPassword ? 0.4 : 1 }}
            >
              {passwordSaving ? t('common.saving') : passwordSaved ? t('settings.account.passwordUpdated') : t('settings.account.updatePassword')}
            </button>
          </div>
        )}
      </SettingsCard>

      <SettingsCard>
        {!confirmingLogOut ? (
          <SettingsRow label={t('settings.account.logOut')} onClick={() => setConfirmingLogOut(true)} chevron={false} first />
        ) : (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: '13px', color: '#8F8A83' }}>{t('settings.account.logOutConfirm')}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleLogOut} style={saveButtonStyle}>
                {t('settings.account.logOutConfirmYes')}
              </button>
              <button onClick={() => setConfirmingLogOut(false)} style={{ ...saveButtonStyle, background: 'transparent' }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </SettingsCard>

      <SettingsCard>
        {!confirmingDelete ? (
          <SettingsRow label={t('settings.account.deleteAccount')} danger onClick={() => setConfirmingDelete(true)} chevron={false} first />
        ) : !finalConfirmingDelete ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: '13px', color: '#E39C8C' }}>{t('settings.account.deleteWarning')}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setFinalConfirmingDelete(true)} style={{ ...saveButtonStyle, borderColor: 'rgba(227, 156, 140, 0.5)', color: '#E39C8C' }}>
                {t('settings.account.deleteAccount')}
              </button>
              <button onClick={() => setConfirmingDelete(false)} style={{ ...saveButtonStyle, background: 'transparent' }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: '13px', color: '#E39C8C' }}>
              {t('settings.account.deleteFinalConfirm')}
            </p>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#8F8A83' }}>{t('settings.account.deleteFinalWarning')}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{ ...saveButtonStyle, borderColor: 'rgba(227, 156, 140, 0.6)', background: 'rgba(227, 156, 140, 0.1)', color: '#E39C8C', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? t('common.saving') : t('settings.account.deleteFinalConfirmYes')}
              </button>
              <button
                onClick={() => {
                  setConfirmingDelete(false)
                  setFinalConfirmingDelete(false)
                }}
                style={{ ...saveButtonStyle, background: 'transparent' }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </SettingsCard>
    </SettingsShell>
  )
}
