'use client'

import { useState } from 'react'
import { useLocale } from './contexts/LocaleContext'
import { SANS, SANS_DISPLAY, saveButtonStyle } from './profile/settings/shared'
import SessionExpiredNotice from './SessionExpiredNotice'
import type { VelisUser } from './lib/auth'

// Başka bir kullanıcıyı bildirme / engelleme menüsü - leaderboard'daki kişi
// ekranının üç nokta düğmesi açıyor (bkz. app/leaderboard/page.tsx). App Store
// Guideline 1.2 (kullanıcı içeriği): bildirme mekanizması + engelleme.
// Her eylemden önce bir onay adımı var (yanlışlıkla bildirmeyi/engellemeyi önler).
//
// Kapanış SENKRON, hiçbir setTimeout'a bağlı değil (bkz. AGENTS.md: WKWebView
// zamanlayıcıları erteliyor). Giriş animasyonu sadece CSS (globals.css).
type Step = 'menu' | 'report' | 'block' | 'reported'

function FlagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5.5 21V4M5.5 5h11.2l-2.3 3.6 2.3 3.6H5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BlockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  width: '100%',
  padding: '16px 4px',
  background: 'none',
  border: 'none',
  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
  fontFamily: SANS,
  fontSize: '16px',
  textAlign: 'left' as const,
  cursor: 'pointer',
}

export default function ModerationSheet({
  name,
  user,
  onClose,
  onReport,
  onBlock,
  onUserChange,
}: {
  name: string
  user: VelisUser
  onClose: () => void
  onReport: () => Promise<boolean | 'expired'>
  onBlock: () => Promise<boolean | 'expired'>
  onUserChange: (user: VelisUser) => void
}) {
  const { t } = useLocale()
  const [step, setStep] = useState<Step>('menu')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const run = async (action: () => Promise<boolean | 'expired'>, onOk: () => void) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSessionExpired(false)
    const result = await action()
    setBusy(false)
    if (result === 'expired') {
      setSessionExpired(true)
      return
    }
    if (!result) {
      setError(t('mod.error'))
      return
    }
    onOk()
  }

  const back = () => {
    setError(null)
    setSessionExpired(false)
    setStep('menu')
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div
        className="profile-sheet-scrim"
        onClick={busy ? undefined : onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      />
      <div
        className="profile-sheet-panel"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          margin: '0 auto',
          maxWidth: '480px',
          padding: '14px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid rgba(255, 178, 90, 0.24)',
          background: '#0B0A09',
          boxShadow: '0 -18px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.16)', margin: '0 auto 14px' }} />

        {step === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button type="button" onClick={() => setStep('report')} style={{ ...rowStyle, borderTop: 'none', color: '#F5F0EA' }}>
              <FlagIcon />
              {t('mod.menu.report')}
            </button>
            <button type="button" onClick={() => setStep('block')} style={{ ...rowStyle, color: '#E39C8C' }}>
              <BlockIcon />
              {t('mod.menu.block', { name })}
            </button>
            <button type="button" onClick={onClose} style={{ ...saveButtonStyle, marginTop: '14px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#D9D3CB' }}>
              {t('common.cancel')}
            </button>
          </div>
        )}

        {(step === 'report' || step === 'block') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ margin: 0, fontFamily: SANS_DISPLAY, fontWeight: 600, fontSize: '19px', color: '#F5F0EA' }}>
              {step === 'report' ? t('mod.report.title') : t('mod.block.title', { name })}
            </h2>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: '14px', lineHeight: 1.5, color: '#9A948C' }}>
              {step === 'report' ? t('mod.report.body') : t('mod.block.body')}
            </p>
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
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => (step === 'report' ? run(onReport, () => setStep('reported')) : run(onBlock, () => {}))}
                style={{
                  ...saveButtonStyle,
                  flex: 1,
                  opacity: busy ? 0.6 : 1,
                  ...(step === 'block'
                    ? { borderColor: 'rgba(227, 156, 140, 0.6)', background: 'rgba(227, 156, 140, 0.1)', color: '#E39C8C' }
                    : {}),
                }}
              >
                {busy ? t('common.saving') : step === 'report' ? t('mod.report.confirm') : t('mod.block.confirm')}
              </button>
              <button type="button" disabled={busy} onClick={back} style={{ ...saveButtonStyle, flex: 1, background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#D9D3CB' }}>
                {t('common.back')}
              </button>
            </div>
          </div>
        )}

        {step === 'reported' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: '15px', lineHeight: 1.5, color: '#F5F0EA', textAlign: 'center' }}>{t('mod.report.done')}</p>
            <button type="button" onClick={onClose} style={{ ...saveButtonStyle }}>
              {t('profile.edit.done')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
