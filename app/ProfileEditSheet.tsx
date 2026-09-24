'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import ProfilePhotoEditor from './ProfilePhotoEditor'
import SessionExpiredNotice from './SessionExpiredNotice'
import { updateUserName } from './services/AuthService'
import type { VelisUser } from './lib/auth'
import { useLocale } from './contexts/LocaleContext'
import { SANS, SANS_DISPLAY, labelStyle, fieldInputStyle, saveButtonStyle } from './profile/settings/shared'

// Profil sayfasındaki kalem düğmesinin açtığı düzenleme ekranı: fotoğraf + isim.
// Fotoğraf seçilince/kaldırılınca ANINDA sunucuya kaydediliyor (bkz.
// ProfilePhotoEditor); isim "Kaydet"e basınca sunucuya + yerele yazılıyor (bkz.
// AuthService.updateUserName - sunucu başarısız olursa yerel de değişmiyor).
//
// KAPANIŞ SENKRON - hiçbir setTimeout'a bağlı değil. WKWebView uygulama ön
// planda değilken zamanlayıcıları ertelediği için tam ekran katmanların
// kapanması onlara bağlanınca ekranda takılı kalıyordu (bkz. AGENTS.md). Giriş
// animasyonu sadece CSS (bkz. globals.css .profile-sheet-*), çıkış yok.
//
// Üstten hizalı, neredeyse tam boy: klavye açılınca isim alanları ekranın
// altında kalmasın diye içerik yukarıda duruyor.
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export default function ProfileEditSheet({
  user,
  onClose,
  onUserChange,
}: {
  user: VelisUser
  onClose: () => void
  onUserChange: (user: VelisUser) => void
}) {
  const { t } = useLocale()
  const [firstName, setFirstName] = useState(user.firstName)
  const [lastName, setLastName] = useState(user.lastName)
  const [focused, setFocused] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const changed = firstName.trim() !== user.firstName || lastName.trim() !== user.lastName
  const valid = firstName.trim().length > 0 && lastName.trim().length > 0

  const save = async () => {
    if (saving) return
    // Değişen bir şey yoksa "Tamam" sadece kapatıyor.
    if (!changed) {
      onClose()
      return
    }
    if (!valid) return
    setSaving(true)
    setError(null)
    setSessionExpired(false)
    const next = await updateUserName(user, firstName, lastName)
    setSaving(false)
    if (next === 'taken') {
      setError(t('profile.edit.nameTaken'))
      return
    }
    if (next === 'expired') {
      setSessionExpired(true)
      return
    }
    if (!next) {
      setError(t('settings.account.saveFailed'))
      return
    }
    onUserChange(next)
    onClose()
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void save()
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t('profile.edit.title')} style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div
        className="profile-sheet-scrim"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.66)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      />
      <div
        className="profile-sheet-panel"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          margin: '0 auto',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          padding: '0 20px calc(28px + env(safe-area-inset-bottom, 0px))',
          borderRadius: '26px 26px 0 0',
          borderTop: '1px solid rgba(255, 178, 90, 0.24)',
          background: 'radial-gradient(ellipse 90% 30% at 50% 24%, rgba(255, 178, 90, 0.10) 0%, rgba(255, 178, 90, 0) 100%), #0B0A09',
          boxShadow: '0 -18px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.16)', marginTop: '9px', flexShrink: 0 }} />

        <div style={{ width: '100%', maxWidth: '380px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '52px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS_DISPLAY, fontWeight: 600, fontSize: '17px', color: '#F5F0EA' }}>{t('profile.edit.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('profile.edit.close')}
            className="profile-settings-btn"
            style={{ position: 'absolute', right: '-6px', background: 'none', border: 'none', padding: '6px', display: 'flex', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.55)', transition: 'color 200ms ease-in-out' }}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: '380px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <ProfilePhotoEditor user={user} onUserChange={onUserChange} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={labelStyle('#9A948C')}>{t('profile.edit.nameLabel')}</div>
            <input
              id="profile-edit-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={() => setFocused('firstName')}
              onBlur={() => setFocused(null)}
              onKeyDown={onEnter}
              placeholder={t('settings.account.firstNamePlaceholder')}
              autoComplete="given-name"
              enterKeyHint="next"
              style={fieldInputStyle(focused === 'firstName')}
            />
            <input
              id="profile-edit-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={() => setFocused('lastName')}
              onBlur={() => setFocused(null)}
              onKeyDown={onEnter}
              placeholder={t('settings.account.lastNamePlaceholder')}
              autoComplete="family-name"
              enterKeyHint="done"
              style={fieldInputStyle(focused === 'lastName')}
            />
            {sessionExpired ? (
              <SessionExpiredNotice
                user={user}
                onReconnected={(u) => {
                  setSessionExpired(false)
                  onUserChange(u)
                }}
              />
            ) : (
              error && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#E39C8C' }}>{error}</p>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || (changed && !valid)}
              style={{ ...saveButtonStyle, marginTop: '4px', opacity: saving || (changed && !valid) ? 0.4 : 1 }}
            >
              {saving ? t('common.saving') : changed ? t('common.save') : t('profile.edit.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
