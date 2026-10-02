'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'

// Ritüel öncesi/sonrası fotoğraf ekranı - uygulamanın İÇİNDE canlı ön kamera
// (getUserMedia). Uygulamadan çıkmıyoruz: ritüel arka plana atılınca iptal
// oluyor (bkz. app/page.tsx visibilitychange), sistem kamerası buna yol
// açabilirdi. Kamera açılamazsa (izin yok, eski iOS) sistemin fotoğraf
// seçicisine (capture="user") düşüyor; her durumda fotoğrafsız devam edilebilir.
//
// Kapanış her zaman SENKRON (onConfirm/onSkip) - zamanlayıcı yok (bkz.
// AGENTS.md: WKWebView zamanlayıcıları erteliyor).

// Hikaye kartıyla aynı oran (bkz. lib/storyImage.ts PANEL_W/PANEL_H = 1:2).
const OUT_W = 640
const OUT_H = 1280

function cropToFrame(source: CanvasImageSource, sw: number, sh: number, mirror: boolean): string {
  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable.')
  const scale = Math.max(OUT_W / sw, OUT_H / sh)
  const dw = sw * scale
  const dh = sh * scale
  if (mirror) {
    // Önizleme ayna gibi gösteriliyor - kaydedilen fotoğraf da kullanıcının
    // gördüğüyle aynı olsun.
    ctx.translate(OUT_W, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, (OUT_W - dw) / 2, (OUT_H - dh) / 2, dw, dh)
  return canvas.toDataURL('image/jpeg', 0.88)
}

export default function CameraCapture({
  kind,
  onConfirm,
  onSkip,
}: {
  kind: 'before' | 'after'
  onConfirm: (dataUrl: string) => void
  onSkip: () => void
}) {
  const { t } = useLocale()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const doneRef = useRef(false)
  const [status, setStatus] = useState<'starting' | 'live' | 'error'>('starting')
  const [photo, setPhoto] = useState<string | null>(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        setStatus('live')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [])

  const handleShutter = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    try {
      setPhoto(cropToFrame(video, video.videoWidth, video.videoHeight, true))
    } catch {
      setStatus('error')
    }
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        setPhoto(cropToFrame(img, img.naturalWidth, img.naturalHeight, false))
      } catch {
        // okunamadı - kullanıcı tekrar deneyebilir ya da atlayabilir
      }
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const handleConfirm = () => {
    if (!photo || doneRef.current) return
    doneRef.current = true
    stopStream()
    onConfirm(photo)
  }

  const handleSkip = () => {
    if (doneRef.current) return
    doneRef.current = true
    stopStream()
    onSkip()
  }

  const handleRetake = () => {
    setPhoto(null)
    if (status === 'error') fileRef.current?.click()
  }

  const eyebrow = kind === 'before' ? t('story.capture.beforeEyebrow') : t('story.capture.afterEyebrow')
  const title = kind === 'before' ? t('story.capture.beforeTitle') : t('story.capture.afterTitle')

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
        padding: 'calc(env(safe-area-inset-top) + 28px) 24px calc(env(safe-area-inset-bottom) + 24px)',
        fontFamily: FONT_SANS,
        gap: '18px',
      }}
    >
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1.6px', textTransform: 'uppercase', color: '#E3C08C' }}>
          {eyebrow}
        </span>
        <span style={{ fontSize: '22px', fontWeight: 600, color: '#F5F0EA' }}>{title}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '100%',
            maxHeight: '560px',
            aspectRatio: '1 / 2',
            maxWidth: '100%',
            borderRadius: '26px',
            overflow: 'hidden',
            border: '1px solid rgba(227, 192, 140, 0.55)',
            background: '#0d0c0b',
            boxShadow: '0 0 40px rgba(240, 138, 36, 0.12)',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              opacity: status === 'live' && !photo ? 1 : 0,
            }}
          />
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- yerel data URL önizlemesi
            <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {!photo && status !== 'live' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                fontSize: '14px',
                lineHeight: 1.5,
                color: '#9A948C',
              }}
            >
              {status === 'starting' ? t('story.capture.starting') : t('story.capture.unavailable')}
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />

      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        {photo ? (
          <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
            <button onClick={handleRetake} style={secondaryButton}>
              {t('story.capture.retake')}
            </button>
            <button onClick={handleConfirm} style={primaryButton}>
              {t('story.capture.upload')}
            </button>
          </div>
        ) : status === 'error' ? (
          <button onClick={() => fileRef.current?.click()} style={{ ...primaryButton, width: '100%' }}>
            {t('story.capture.openCamera')}
          </button>
        ) : (
          <button
            onClick={handleShutter}
            disabled={status !== 'live'}
            aria-label={t('story.capture.shutter')}
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              border: '2px solid rgba(227, 192, 140, 0.8)',
              background: 'transparent',
              padding: '5px',
              cursor: 'pointer',
              opacity: status === 'live' ? 1 : 0.4,
            }}
          >
            <span
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #FFE9C4 0%, #FFC172 45%, #E8861F 100%)',
                boxShadow: '0 0 18px rgba(255, 178, 90, 0.45)',
              }}
            />
          </button>
        )}
        <button
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', color: '#9A948C', fontFamily: FONT_SANS, fontSize: '14px', cursor: 'pointer', padding: '6px' }}
        >
          {t('story.capture.skip')}
        </button>
      </div>
    </div>
  )
}

const primaryButton = {
  flex: 1,
  padding: '15px 0',
  borderRadius: '999px',
  border: '1px solid rgba(255, 178, 90, 0.6)',
  background: 'rgba(255, 178, 90, 0.14)',
  color: '#F3CE8E',
  fontFamily: FONT_SANS,
  fontWeight: 600 as const,
  fontSize: '16px',
  cursor: 'pointer' as const,
}

const secondaryButton = {
  flex: 1,
  padding: '15px 0',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'transparent',
  color: '#D9D3CB',
  fontFamily: FONT_SANS,
  fontWeight: 600 as const,
  fontSize: '16px',
  cursor: 'pointer' as const,
}
