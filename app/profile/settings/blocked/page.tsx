'use client'

import { useEffect, useState } from 'react'
import { SettingsShell, SettingsCard, SettingsRow, SANS, saveButtonStyle } from '../shared'
import { getStoredToken } from '../../../lib/auth'
import { getBlocksRequest } from '../../../lib/authApi'
import type { AuthApiBlockedUser } from '../../../lib/authApi'
import { getStoredUser, unblockUser } from '../../../services/AuthService'
import { useLocale } from '../../../contexts/LocaleContext'

// Ayarlar > Gizlilik ve Güvenlik > Engellenen kullanıcılar. Liderlik tablosunda
// engellenen kişiler burada görünüyor (liderlik tablosundakiyle aynı KISALTILMIŞ
// ad) ve engel buradan kaldırılabiliyor. Liste sunucudan geliyor - bkz.
// server/src/controllers/moderationController.js listBlocks.
type Load = 'loading' | 'ready' | 'error'

export default function BlockedUsersSettings() {
  const { t } = useLocale()
  const [users, setUsers] = useState<AuthApiBlockedUser[]>([])
  const [load, setLoad] = useState<Load>('loading')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      // Misafir: engellenecek/engellenmiş kimse yok.
      Promise.resolve().then(() => setLoad('ready'))
      return
    }
    let cancelled = false
    getBlocksRequest(token)
      .then((res) => {
        if (cancelled) return
        setUsers(res.users)
        setLoad('ready')
      })
      .catch(() => {
        if (!cancelled) setLoad('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const unblock = async (id: string) => {
    const stored = getStoredUser()
    if (!stored || busyId) return
    setBusyId(id)
    setError(null)
    const next = await unblockUser(stored, id)
    setBusyId(null)
    if (!next) {
      setError(t('mod.error'))
      return
    }
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <SettingsShell title={t('settings.blocked.title')}>
      {load === 'loading' && <p style={{ margin: 0, fontFamily: SANS, fontSize: '14px', color: '#8F8A83', textAlign: 'center' }}>{t('common.saving')}</p>}
      {load === 'error' && <p style={{ margin: 0, fontFamily: SANS, fontSize: '13px', color: '#E39C8C', textAlign: 'center' }}>{t('mod.error')}</p>}
      {load === 'ready' && users.length === 0 && (
        <p style={{ margin: 0, fontFamily: SANS, fontSize: '14px', color: '#8F8A83', textAlign: 'center' }}>{t('settings.blocked.empty')}</p>
      )}
      {users.length > 0 && (
        <SettingsCard>
          {users.map((u, i) => (
            <SettingsRow
              key={u.id}
              label={u.name}
              chevron={false}
              first={i === 0}
              rightElement={
                <button
                  type="button"
                  onClick={() => unblock(u.id)}
                  disabled={busyId !== null}
                  style={{ ...saveButtonStyle, padding: '8px 16px', fontSize: '13px', opacity: busyId === u.id ? 0.5 : 1 }}
                >
                  {t('settings.blocked.unblock')}
                </button>
              }
            />
          ))}
        </SettingsCard>
      )}
      {error && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: '#E39C8C', textAlign: 'center' }}>{error}</p>}
    </SettingsShell>
  )
}
