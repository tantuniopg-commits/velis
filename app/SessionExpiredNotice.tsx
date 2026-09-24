'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { reauthenticate } from './services/AuthService'
import type { VelisUser } from './lib/auth'
import { useLocale } from './contexts/LocaleContext'
import { SANS, fieldInputStyle, saveButtonStyle } from './profile/settings/shared'

// Oturum süresi dolduğunda (bkz. AuthService.isSessionExpired) gösterilen
// yerinde şifre alanı - "Çıkış Yap" YÖNLENDİRMEDİĞİMİZ için ayrı bir bileşen
// (o journey/stats'ı SİLİYOR, tam kurtarmaya çalıştığımız ilerlemeyi
// kaybettirirdi - bkz. AuthService.reauthenticate). Sadece şifreyi tekrar
// isteyip token'ı yeniliyor, ekran hiç kapanmıyor - kullanıcı kaldığı
// işleme (isim kaydet, fotoğraf yükle, bildir...) hemen devam edebiliyor.
export default function SessionExpiredNotice({ user, onReconnected }: { user: VelisUser; onReconnected: (user: VelisUser) => void }) {
  const { t } = useLocale()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (busy || !password) return
    setBusy(true)
    setError(null)
    const next = await reauthenticate(user, password)
    setBusy(false)
    if (!next) {
      setError(t('session.reconnectFailed'))
      return
    }
    setPassword('')
    onReconnected(next)
  }

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#E39C8C' }}>{t('common.sessionExpired')}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={onEnter}
          placeholder={t('settings.account.currentPasswordPlaceholder')}
          autoComplete="current-password"
          style={{ ...fieldInputStyle(false), flex: 1 }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !password}
          style={{ ...saveButtonStyle, padding: '0 18px', opacity: busy || !password ? 0.5 : 1, flexShrink: 0 }}
        >
          {busy ? t('common.saving') : t('session.reconnect')}
        </button>
      </div>
    </div>
  )
}
