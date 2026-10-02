'use client'

import { useEffect, useRef, useState } from 'react'
import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'
import { getStoredUser } from '../lib/auth'
import { listArchiveMonth, earliestArchiveKey, getArchiveFull, dateKeyFor, importServerStory } from '../lib/storyArchive'
import type { ArchiveEntry } from '../lib/storyArchive'
import { saveStoryImage } from '../lib/storyShare'

// Journey ekranının altındaki Hikaye Arşivi: ayın her günü bir kart (5 sütun),
// o gün oluşan before/after görseli varsa "sonra" fotoğrafı önizleme olarak,
// yoksa boş kart. Oklarla aylar arasında geçiliyor - en eski kaydın ayından
// bu aya kadar. Karta dokununca tam before/after görseli açılıyor ve film
// rulosuna kaydedilebiliyor. Veriler sadece bu cihazda (bkz. lib/storyArchive.ts).

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'M15 5L8 12L15 19' : 'M9 5L16 12L9 19'} />
    </svg>
  )
}

function monthIndex(year: number, month: number) {
  return year * 12 + month
}

export default function StoryArchive() {
  const { t, locale } = useLocale()
  const intlLocale = locale === 'tr' ? 'tr-TR' : 'en-US'
  const [userId, setUserId] = useState<string | null>(null)
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [earliest, setEarliest] = useState(monthIndex(today.getFullYear(), today.getMonth()))
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<{ dateKey: string; src: string | null } | null>(null)
  // importServerStory bir kayıt eklerse ızgarayı yeniden okumak için.
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    const id = getStoredUser()?.id ?? null
    setUserId(id)
    if (!id) return
    // Sunucuda hâlâ duran (son 24 saat) hikaye arşivde yoksa onu da ekle -
    // arşivden önce oluşturulan ya da başka cihazda paylaşılan hikaye kaybolmasın.
    importServerStory(id)
      .then((added) => {
        if (added) setReloadTick((n) => n + 1)
      })
      .catch(() => {})
    earliestArchiveKey(id)
      .then((key) => {
        if (!key) return
        const [y, m] = key.split('-').map(Number)
        setEarliest(Math.min(monthIndex(y, m - 1), monthIndex(today.getFullYear(), today.getMonth())))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    listArchiveMonth(userId, view.year, view.month)
      .then((list: ArchiveEntry[]) => {
        if (!cancelled) setEntries(Object.fromEntries(list.map((e) => [e.dateKey, e.thumb])))
      })
      .catch(() => {
        if (!cancelled) setEntries({})
      })
    return () => {
      cancelled = true
    }
  }, [userId, view, reloadTick])

  if (!userId) return null

  const current = monthIndex(view.year, view.month)
  const latest = monthIndex(today.getFullYear(), today.getMonth())
  const go = (delta: number) => {
    const next = Math.max(earliest, Math.min(latest, current + delta))
    setView({ year: Math.floor(next / 12), month: next % 12 })
  }

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const todayKey = dateKeyFor(today)
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(new Date(view.year, view.month, 1))
  const dayLabel = (day: number) =>
    new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: locale === 'tr' ? 'long' : 'short' }).format(new Date(view.year, view.month, day))

  const openEntry = (dateKey: string) => {
    setOpen({ dateKey, src: null })
    getArchiveFull(userId, dateKey)
      .then((src) => setOpen((o) => (o && o.dateKey === dateKey ? { dateKey, src } : o)))
      .catch(() => {})
  }

  return (
    <section style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ margin: 0, fontFamily: FONT_SANS, fontWeight: 600, fontSize: '26px', color: '#F5F0EA' }}>
        {t('archive.title')}
        <span style={{ color: '#E3C08C' }}>.</span>
      </h2>

      <div style={{ marginTop: '26px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
        <button
          onClick={() => go(-1)}
          disabled={current <= earliest}
          aria-label={t('archive.prevMonth')}
          style={{ background: 'none', border: 'none', padding: '6px', color: '#D9D3CB', cursor: 'pointer', opacity: current <= earliest ? 0.2 : 1, display: 'flex' }}
        >
          <ArrowIcon direction="left" />
        </button>
        <span style={{ fontFamily: FONT_SANS, fontSize: '15px', letterSpacing: '3px', color: '#F5F0EA' }}>{monthLabel}</span>
        <button
          onClick={() => go(1)}
          disabled={current >= latest}
          aria-label={t('archive.nextMonth')}
          style={{ background: 'none', border: 'none', padding: '6px', color: '#D9D3CB', cursor: 'pointer', opacity: current >= latest ? 0.2 : 1, display: 'flex' }}
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      <div style={{ marginTop: '18px', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const key = dateKeyFor(new Date(view.year, view.month, day))
          const thumb = entries[key]
          const isToday = key === todayKey
          const isFuture = key > todayKey
          return (
            <button
              key={key}
              onClick={() => thumb && openEntry(key)}
              disabled={!thumb}
              style={{
                position: 'relative',
                aspectRatio: '9 / 16',
                borderRadius: '12px',
                overflow: 'hidden',
                padding: 0,
                border: isToday ? '1.5px solid rgba(240, 190, 120, 0.85)' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isToday ? '0 0 16px rgba(255, 178, 90, 0.25)' : 'none',
                background: 'rgba(255, 255, 255, 0.025)',
                cursor: thumb ? 'pointer' : 'default',
                opacity: isFuture ? 0.4 : 1,
              }}
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element -- yerel dosya/IndexedDB önizlemesi
                <img src={thumb} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '14px 6px 6px',
                  background: thumb ? 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))' : 'none',
                  fontFamily: FONT_SANS,
                  fontSize: '10px',
                  fontWeight: 500,
                  textAlign: 'left',
                  color: thumb ? '#F5F0EA' : 'rgba(255, 255, 255, 0.35)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {dayLabel(day)}
              </span>
            </button>
          )
        })}
      </div>

      {open && <ArchiveViewer title={dayLabel(Number(open.dateKey.slice(8)))} src={open.src} onClose={() => setOpen(null)} />}
    </section>
  )
}

function ArchiveViewer({ title, src, onClose }: { title: string; src: string | null; onClose: () => void }) {
  const { t } = useLocale()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const busyRef = useRef(false)

  const handleSave = async () => {
    if (!src || busyRef.current || saveState === 'saved') return
    busyRef.current = true
    setSaveState('saving')
    const result = await saveStoryImage(src)
    busyRef.current = false
    setSaveState(result === 'saved' ? 'saved' : result === 'failed' ? 'failed' : 'idle')
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
        padding: 'calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 18px)',
        fontFamily: FONT_SANS,
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#F5F0EA' }}>{title}</span>
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- yerel arşiv görseli
          <img src={src} alt="" style={{ height: '100%', maxWidth: '100%', aspectRatio: '9 / 16', objectFit: 'contain', borderRadius: '16px' }} />
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={!src || saveState === 'saving' || saveState === 'saved'}
        style={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: '360px',
          padding: '14px 0',
          borderRadius: '999px',
          border: '1px solid rgba(255, 178, 90, 0.6)',
          background: 'rgba(255, 178, 90, 0.14)',
          color: '#F3CE8E',
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          opacity: src ? 1 : 0.45,
        }}
      >
        {saveState === 'saved' ? t('story.result.saved') : saveState === 'saving' ? t('story.result.saving') : t('story.result.save')}
      </button>
      {saveState === 'failed' && (
        <p style={{ margin: 0, textAlign: 'center', fontSize: '12px', color: '#9A948C' }}>{t('story.result.saveError')}</p>
      )}
    </div>
  )
}
