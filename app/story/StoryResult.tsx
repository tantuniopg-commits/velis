'use client'

import { useEffect, useRef, useState } from 'react'
import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'
import { composeStory, storyToShareDataUrl, storyToUploadDataUrl } from '../lib/storyImage'
import { saveStoryImage } from '../lib/storyShare'
import { uploadStoryRequest, AuthApiError } from '../lib/authApi'
import { getStoredToken } from '../lib/auth'

// Ritüel bitip "sonra" fotoğrafı da çekilince: before/after görseli üretilip
// gösteriliyor. Kullanıcı film rulosuna kaydedebilir ve İSTERSE "Hikayemde
// paylaş" ile 24 saatliğine yayınlayabilir - liderlik tablosunda profiline
// dokunan herkes görür (yüz fotoğrafı - açık onay olmadan sunucuya hiçbir şey
// gitmiyor).
// "Devam et" senkron kapanıyor (zamanlayıcı yok, bkz. AGENTS.md).

type Busy = 'none' | 'save' | 'post'

export default function StoryResult({
  before,
  after,
  name,
  day,
  onDone,
}: {
  before: string
  after: string
  name: string
  day: number
  onDone: () => void
}) {
  const { t } = useLocale()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState<Busy>('none')
  const [saved, setSaved] = useState(false)
  const [posted, setPosted] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const uploadUrlRef = useRef<string | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    composeStory({
      before,
      after,
      name,
      labels: {
        before: t('story.label.before'),
        after: t('story.label.after'),
        day: t('story.label.day', { day }),
      },
    })
      .then((canvas) => {
        if (cancelled) return
        setShareUrl(storyToShareDataUrl(canvas))
        try {
          uploadUrlRef.current = storyToUploadDataUrl(canvas)
        } catch {
          uploadUrlRef.current = null
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!shareUrl || busy !== 'none' || saved) return
    setBusy('save')
    setNotice(null)
    const result = await saveStoryImage(shareUrl)
    setBusy('none')
    if (result === 'saved') setSaved(true)
    else if (result === 'failed') setNotice(t('story.result.saveError'))
  }

  const handlePost = async () => {
    const token = getStoredToken()
    const image = uploadUrlRef.current
    if (!token || !image || busy !== 'none' || posted) return
    setBusy('post')
    setNotice(null)
    try {
      await uploadStoryRequest(token, image)
      setPosted(true)
    } catch (err) {
      // 401: oturum süresi dolmuş/geçersiz; 404: hesap sunucuda yok. İkisinde de
      // çözüm tekrar giriş yapmak - genel "bir şeyler ters gitti" yerine bunu söyle.
      const status = err instanceof AuthApiError ? err.status : undefined
      setNotice(status === 401 || status === 404 ? t('story.result.signInAgain') : t('story.result.error'))
    } finally {
      setBusy('none')
    }
  }

  const handleDone = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'calc(env(safe-area-inset-top) + 20px) 24px calc(env(safe-area-inset-bottom) + 20px)',
        fontFamily: FONT_SANS,
        gap: '16px',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {shareUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- yerel data URL önizlemesi
          <img
            src={shareUrl}
            alt=""
            style={{
              height: '100%',
              maxWidth: '100%',
              aspectRatio: '9 / 16',
              objectFit: 'contain',
              borderRadius: '18px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          />
        ) : (
          <span style={{ color: '#9A948C', fontSize: '14px' }}>{failed ? t('story.result.composeError') : t('story.result.preparing')}</span>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePost} disabled={!shareUrl || busy !== 'none' || posted} style={button(true, !shareUrl)}>
            {posted ? t('story.result.posted') : busy === 'post' ? t('story.result.posting') : t('story.result.post')}
          </button>
          <button onClick={handleSave} disabled={!shareUrl || busy !== 'none' || saved} style={button(false, !shareUrl)}>
            {saved ? t('story.result.saved') : busy === 'save' ? t('story.result.saving') : t('story.result.save')}
          </button>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: '12px', lineHeight: 1.5, color: '#9A948C', minHeight: '18px' }}>
          {notice ?? (posted ? t('story.result.postedNote') : t('story.result.postNote'))}
        </p>
        <button
          onClick={handleDone}
          style={{ background: 'none', border: 'none', color: '#D9D3CB', fontFamily: FONT_SANS, fontWeight: 600, fontSize: '15px', padding: '8px', cursor: 'pointer' }}
        >
          {t('common.continue')}
        </button>
      </div>
    </div>
  )
}

function button(primary: boolean, disabled: boolean) {
  return {
    flex: 1,
    padding: '14px 0',
    borderRadius: '999px',
    border: primary ? '1px solid rgba(255, 178, 90, 0.6)' : '1px solid rgba(255, 255, 255, 0.15)',
    background: primary ? 'rgba(255, 178, 90, 0.14)' : 'transparent',
    color: primary ? '#F3CE8E' : '#D9D3CB',
    fontFamily: FONT_SANS,
    fontWeight: 600 as const,
    fontSize: '15px',
    cursor: 'pointer' as const,
    opacity: disabled ? 0.45 : 1,
  }
}
