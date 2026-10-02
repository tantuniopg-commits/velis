'use client'

import { useEffect, useRef, useState } from 'react'
import { SettingsShell, SANS, cardStyle } from '../shared'
import { useSettings } from '../../../hooks/useSettings'
import { useLocale } from '../../../contexts/LocaleContext'
import { USER_MIN_RITUAL_DURATION_SEC, USER_MAX_RITUAL_DURATION_SEC, USER_RITUAL_DURATION_STEP_SEC } from '../../../lib/ritualConfig'

// Ritüelin alt eşiğini seçen tek-sütunlu tekerlek - app/DateWheelField.tsx'teki
// Wheel ile AYNI görsel dil (ortada ince amber bant, scroll-snap), ama
// bağımsız/sade bir kopya (tek sütun, tarih mantığı yok). Seçim anında
// kaydediliyor - Sound ayarlarıyla (bkz. sound/page.tsx) aynı desen, ayrı
// bir "Kaydet" adımı yok.
const ITEM_H = 44
const VISIBLE = 5
const PAD = (VISIBLE - 1) / 2

export default function RitualDurationSettings() {
  const { t } = useLocale()
  const { settings, updateRitualDuration } = useSettings()
  const ref = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Sayfa ilk açıldığında mevcut ayara kaydırmak için - sonraki her
  // kaydırma kullanıcının kendi etkileşimi, programatik olarak tekrar
  // kaydırmıyoruz (aksi halde her render'da sıfırlanırdı).
  const [scrolledToInitial, setScrolledToInitial] = useState(false)

  const options: number[] = []
  for (let s = USER_MIN_RITUAL_DURATION_SEC; s <= USER_MAX_RITUAL_DURATION_SEC; s += USER_RITUAL_DURATION_STEP_SEC) {
    options.push(s)
  }

  const current = settings?.ritual.durationSec ?? USER_MIN_RITUAL_DURATION_SEC

  useEffect(() => {
    const el = ref.current
    if (!el || scrolledToInitial || !settings) return
    const idx = Math.max(0, options.indexOf(current))
    el.scrollTop = idx * ITEM_H
    setScrolledToInitial(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, scrolledToInitial])

  const handleScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_H)))
      el.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
      const next = options[idx]
      if (next != null && next !== current) updateRitualDuration(next)
    }, 90)
  }

  if (!settings) return <SettingsShell title={t('settings.ritualDuration.title')}>{null}</SettingsShell>

  return (
    <SettingsShell title={t('settings.ritualDuration.title')}>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: '13px', lineHeight: 1.5, color: '#8F8A83' }}>
        {t('settings.ritualDuration.note')}
      </p>

      <div style={{ ...cardStyle, padding: '8px 0', position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: `${ITEM_H * PAD + 8}px`,
            left: 16,
            right: 16,
            height: `${ITEM_H}px`,
            borderRadius: '12px',
            background: 'rgba(255, 178, 90, 0.1)',
            border: '1px solid rgba(255, 178, 90, 0.25)',
            pointerEvents: 'none',
          }}
        />
        <div
          ref={ref}
          role="listbox"
          aria-label={t('settings.ritualDuration.title')}
          onScroll={handleScroll}
          style={{
            height: `${ITEM_H * VISIBLE}px`,
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ height: `${ITEM_H * PAD}px` }} />
          {options.map((seconds) => {
            const selected = seconds === current
            return (
              <div
                key={seconds}
                onClick={() => updateRitualDuration(seconds)}
                style={{
                  height: `${ITEM_H}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'center',
                  fontFamily: SANS,
                  fontSize: selected ? '19px' : '16px',
                  fontWeight: selected ? 600 : 400,
                  color: selected ? '#F3CE8E' : 'rgba(245, 240, 234, 0.4)',
                  cursor: 'pointer',
                  transition: 'color 150ms ease-out, font-size 150ms ease-out',
                }}
              >
                {t('settings.ritualDuration.seconds', { seconds })}
              </div>
            )
          })}
          <div style={{ height: `${ITEM_H * PAD}px` }} />
        </div>
      </div>
    </SettingsShell>
  )
}
