'use client'

import { useEffect, useState } from 'react'
import SectionCard from '../SectionCard'
import { buttonStyle, colors, inputStyle, SANS, SANS_DISPLAY } from '../styles'
import { getUsersRequest, adminSetStatsRequest } from '../../lib/authApi'
import type { AuthApiStoredUser } from '../../lib/authApi'
import { getStoredToken } from '../../lib/auth'

// Backend'e kayıtlı HER hesabın, kayıt sırasında girdiği bilgiler + canlı
// ilerleme (journey day / streak / XP ...). Sunucuda requireAdmin ile
// korunuyor - sadece admin token'ıyla çekilebiliyor. Şifre hiç dönmüyor.
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
      <span style={{ fontFamily: SANS, fontSize: '11px', color: colors.muted }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: '11px', color: colors.white, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// Senkron koptuğunda (ör. token süresi dolup ritüel senkronları sessizce
// başarısız olmuşsa) bir hesabın CİHAZDAKİ gerçek ilerlemesini elle
// sunucuya yazmak için - bkz. server/src/controllers/authController.js
// adminSetStats. Anti-cheat artış kontrollerini bilerek atlıyor (admin
// güveniliyor), o yüzden burada dikkatli kullan - cihazdaki gerçek
// sayıları gir, tahmin etme.
function FixStatsForm({ user, onSaved }: { user: AuthApiStoredUser; onSaved: (u: AuthApiStoredUser) => void }) {
  const [journeyDay, setJourneyDay] = useState(String(user.stats?.journeyDay ?? 0))
  const [currentStreak, setCurrentStreak] = useState(String(user.stats?.currentStreak ?? 0))
  const [totalXP, setTotalXP] = useState(String(user.stats?.totalXP ?? 0))
  const [totalRitualCount, setTotalRitualCount] = useState(String(user.stats?.totalRitualCount ?? 0))
  // Saniye yerine dakika giriliyor (üstteki "Ritual time" alanıyla aynı
  // birim) - kaydederken 60 ile çarpılıyor.
  const [ritualMinutes, setRitualMinutes] = useState(String(Math.round((user.stats?.totalRitualTimeSec ?? 0) / 60)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = () => {
    const token = getStoredToken()
    if (!token) return
    const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0))
    setSaving(true)
    setError(null)
    setSaved(false)
    adminSetStatsRequest(token, user.id, {
      journeyDay: num(journeyDay),
      currentStreak: num(currentStreak),
      totalXP: num(totalXP),
      totalRitualCount: num(totalRitualCount),
      totalRitualTimeSec: num(ritualMinutes) * 60,
      // journeyTimestamp bilerek gönderilmiyor - "şimdi" olarak bırakmak
      // (dokunmamak) soğumayı sıfırdan başlatmıyor, sunucudaki mevcut
      // değeri koruyor (bkz. adminSetStats'taki 'in incoming' fallback'i).
    })
      .then((res) => {
        setSaved(true)
        onSaved({ ...user, stats: res.user.stats })
      })
      .catch(() => setError('Could not save.'))
      .finally(() => setSaving(false))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <input style={inputStyle} value={journeyDay} onChange={(e) => setJourneyDay(e.target.value)} placeholder="Journey day" inputMode="numeric" />
        <input style={inputStyle} value={currentStreak} onChange={(e) => setCurrentStreak(e.target.value)} placeholder="Streak" inputMode="numeric" />
        <input style={inputStyle} value={totalXP} onChange={(e) => setTotalXP(e.target.value)} placeholder="Total XP" inputMode="numeric" />
        <input style={inputStyle} value={totalRitualCount} onChange={(e) => setTotalRitualCount(e.target.value)} placeholder="Rituals" inputMode="numeric" />
        <input style={inputStyle} value={ritualMinutes} onChange={(e) => setRitualMinutes(e.target.value)} placeholder="Ritual time (min)" inputMode="numeric" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button style={buttonStyle('primary')} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save to server'}
        </button>
        {error && <span style={{ fontFamily: SANS, fontSize: '11px', color: colors.danger }}>{error}</span>}
      </div>
    </div>
  )
}

export default function UserDatabaseSection() {
  const [users, setUsers] = useState<AuthApiStoredUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixingId, setFixingId] = useState<string | null>(null)

  const refresh = () => {
    const token = getStoredToken()
    if (!token) {
      setError('Sign in with an admin account to view registered users.')
      return
    }
    setLoading(true)
    setError(null)
    getUsersRequest(token)
      .then((res) => setUsers(res.users))
      .catch((e) => setError(e?.message === 'Admin access required' ? 'This account is not an admin.' : 'Could not reach the server.'))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  return (
    <SectionCard title={`Registered Accounts${users ? ` — ${users.length}` : ''}`}>
      <button style={buttonStyle()} onClick={refresh} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>

      {error && <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: colors.danger }}>{error}</p>}

      {users && users.length === 0 && !error && (
        <p style={{ margin: 0, fontFamily: SANS, fontSize: '12px', color: colors.muted }}>No accounts registered yet.</p>
      )}

      {users && users.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: SANS_DISPLAY, fontWeight: 600, fontSize: '14px', color: colors.white }}>
                  {u.name}
                  {u.isAdmin && (
                    <span style={{ fontFamily: SANS, fontSize: '10px', color: colors.amber, marginLeft: '6px' }}>ADMIN</span>
                  )}
                </span>
                <span style={{ fontFamily: SANS, fontSize: '11px', color: colors.muted }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>

              <Field label="Email" value={u.email} />
              {u.phone && <Field label="Phone" value={u.phone} />}
              <Field label="Gender" value={u.gender || '—'} />
              <Field label="Birth date" value={u.birthDate || '—'} />
              <Field label="Language" value={(u.locale || 'en').toUpperCase()} />

              <div style={{ height: '1px', background: colors.cardBorder, margin: '3px 0' }} />

              <Field label="Journey day" value={String(u.stats?.journeyDay ?? 0)} />
              <Field label="Streak" value={`${u.stats?.currentStreak ?? 0} days`} />
              <Field label="Total XP" value={String(u.stats?.totalXP ?? 0)} />
              <Field label="Rituals" value={String(u.stats?.totalRitualCount ?? 0)} />
              <Field
                label="Ritual time"
                value={`${Math.round((u.stats?.totalRitualTimeSec ?? 0) / 60)} min`}
              />

              <button
                style={{ ...buttonStyle(), alignSelf: 'flex-start', marginTop: '4px' }}
                onClick={() => setFixingId(fixingId === u.id ? null : u.id)}
              >
                {fixingId === u.id ? 'Cancel' : 'Fix stats'}
              </button>
              {fixingId === u.id && (
                <FixStatsForm
                  user={u}
                  onSaved={(updated) => setUsers((list) => list?.map((x) => (x.id === updated.id ? updated : x)) ?? list)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
