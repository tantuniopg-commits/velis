'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import AvatarPhoto from './AvatarPhoto'
import { avatarUrl } from './lib/authApi'
import { fileToAvatarDataUrl, AvatarImageError } from './lib/avatarImage'
import { updateUserAvatar, removeUserAvatar } from './services/AuthService'
import type { VelisUser } from './lib/auth'
import { useLocale } from './contexts/LocaleContext'
import { SANS, saveButtonStyle } from './profile/settings/shared'

// Profil fotoğrafı seç/değiştir/kaldır bloğu. İki yerde kullanılıyor: Ayarlar >
// Hesap (bkz. app/profile/settings/account/page.tsx) ve Profil sayfasındaki
// kalem düğmesinin açtığı düzenleme ekranı (bkz. app/ProfileEditSheet.tsx) -
// davranış tek yerde. Her değişiklik anında sunucuya (MongoDB) kaydediliyor;
// başarılı olunca yeni kullanıcı `onUserChange` ile üst bileşene veriliyor.
function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.1-1.6A1.5 1.5 0 0 1 10.05 4.7h3.9a1.5 1.5 0 0 1 1.25.7L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="#E3C08C"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.6" r="3.1" stroke="#E3C08C" strokeWidth="1.6" />
    </svg>
  )
}

export default function ProfilePhotoEditor({ user, onUserChange }: { user: VelisUser; onUserChange: (user: VelisUser) => void }) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  // Yükleme başarılı olunca yeni fotoğraf hemen görünsün diye küçültülmüş
  // sürüm burada tutuluyor - sunucudan tekrar indirmeyi beklemiyoruz.
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const photoSrc = preview ?? avatarUrl(user.id, user.avatarVersion)

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Aynı dosya tekrar seçilebilsin diye sıfırlıyoruz (yoksa onChange tetiklenmez).
    e.target.value = ''
    if (!file || busy) return
    setBusy(true)
    setError(null)
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      const next = await updateUserAvatar(user, dataUrl)
      if (!next) {
        setError(t('settings.account.photo.failed'))
      } else {
        onUserChange(next)
        setPreview(dataUrl)
      }
    } catch (err) {
      setError(err instanceof AvatarImageError ? t('settings.account.photo.invalid') : t('settings.account.photo.failed'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    const next = await removeUserAvatar(user)
    setBusy(false)
    if (!next) {
      setError(t('settings.account.photo.failed'))
      return
    }
    onUserChange(next)
    setPreview(null)
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', position: 'relative' }}>
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        aria-label={photoSrc ? t('settings.account.photo.change') : t('settings.account.photo.choose')}
        style={{ position: 'relative', width: '104px', height: '104px', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {/* Profil başlığındaki avatarla aynı dil: amber ince halka + yumuşak ışıma. */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(255, 178, 90, 0.14) 0%, rgba(255, 178, 90, 0.03) 70%)',
            border: '1.5px solid rgba(255, 178, 90, 0.6)',
            boxShadow: '0 0 28px 2px rgba(255, 178, 90, 0.22)',
            opacity: busy ? 0.5 : 1,
            transition: 'opacity 200ms ease-in-out',
          }}
        >
          <AvatarPhoto
            src={photoSrc}
            fallback={
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: '34px', color: '#F3CE8E' }}>
                {(user.firstName[0] ?? '').toUpperCase()}
                {(user.lastName[0] ?? '').toUpperCase()}
              </span>
            }
          />
        </div>
        <span
          style={{
            position: 'absolute',
            right: '-2px',
            bottom: '-2px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#14110d',
            border: '1px solid rgba(255, 178, 90, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CameraIcon />
        </span>
      </button>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: '13px', color: '#8F8A83', textAlign: 'center' }}>{t('settings.account.photo.hint')}</p>
      {error && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#E39C8C', textAlign: 'center' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <button type="button" onClick={openPicker} disabled={busy} style={{ ...saveButtonStyle, flex: 1, opacity: busy ? 0.6 : 1 }}>
          {busy ? t('common.saving') : photoSrc ? t('settings.account.photo.change') : t('settings.account.photo.choose')}
        </button>
        {photoSrc && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            style={{
              ...saveButtonStyle,
              flex: 1,
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#8F8A83',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {t('settings.account.photo.remove')}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={pick}
        tabIndex={-1}
        aria-hidden
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
