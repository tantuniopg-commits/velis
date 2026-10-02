'use client'

import { useRef, useState } from 'react'
import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'
import ModerationSheet from '../ModerationSheet'
import { getStoredUser, reportUser } from '../services/AuthService'
import { deleteStoryRequest } from '../lib/authApi'
import { getStoredToken } from '../lib/auth'

// Liderlik tablosunda birinin son 24 saatteki before/after hikayesi - tam
// ekran. Başkasının hikayesinde bildir/engelle (App Store 1.2, bkz.
// ModerationSheet); kendi hikayende "Hikayemi kaldır". Kapanış senkron.

export default function StoryViewer({
  userId,
  name,
  src,
  isYou,
  canModerate,
  onClose,
  onBlock,
  onRemoved,
}: {
  userId: string
  name: string
  src: string
  isYou: boolean
  canModerate: boolean
  onClose: () => void
  onBlock: () => Promise<boolean | 'expired'>
  onRemoved: () => void
}) {
  const { t } = useLocale()
  const [moderationOpen, setModerationOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const removingRef = useRef(false)

  const handleRemove = async () => {
    const token = getStoredToken()
    if (!token || removingRef.current) return
    removingRef.current = true
    try {
      await deleteStoryRequest(token)
      onRemoved()
    } catch {
      removingRef.current = false
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        padding: 'calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 16px)',
        fontFamily: FONT_SANS,
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#F5F0EA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {canModerate && !isYou && (
            <button
              onClick={() => setModerationOpen(true)}
              aria-label={t('mod.aria.more')}
              style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', fontSize: '18px', letterSpacing: '2px', cursor: 'pointer', padding: '6px' }}
            >
              &#8226;&#8226;&#8226;
            </button>
          )}
          <button
            onClick={onClose}
            aria-label={t('story.close')}
            style={{ background: 'none', border: 'none', color: '#D9D3CB', cursor: 'pointer', padding: '6px', display: 'flex' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {failed ? (
          <span style={{ color: '#9A948C', fontSize: '14px' }}>{t('story.result.error')}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- statik export, sunucudan gelen JPEG
          <img
            src={src}
            alt=""
            onError={() => setFailed(true)}
            style={{ height: '100%', maxWidth: '100%', aspectRatio: '9 / 16', objectFit: 'contain', borderRadius: '16px' }}
          />
        )}
      </div>

      {isYou && (
        <button
          onClick={handleRemove}
          style={{ background: 'none', border: 'none', color: '#9A948C', fontFamily: FONT_SANS, fontSize: '14px', padding: '8px', cursor: 'pointer' }}
        >
          {t('story.remove')}
        </button>
      )}

      {moderationOpen && getStoredUser() && (
        <ModerationSheet
          name={name}
          user={getStoredUser()!}
          onClose={() => setModerationOpen(false)}
          onReport={() => reportUser(userId)}
          onBlock={onBlock}
          onUserChange={() => {}}
        />
      )}
    </div>
  )
}
