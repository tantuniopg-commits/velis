'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from './contexts/LocaleContext'
import VelisMark from './VelisMark'
import { FONT_SANS } from './lib/typography'

// VELIS çevrimiçi bir uygulama - hesap, ilerleme senkronu, leaderboard hepsi
// sunucuya bağlı. İnternet YOKKEN (uçak modu vb.) uygulamaya girilemesin:
// sadece amblem görünür.
//
// Kapı SADECE `navigator.onLine`'a bakıyor - kendi /health ucumuza bloklayan
// bir istek ATMIYOR. Nedeni: o istek yavaş bir ağda (ör. App Review'ın
// proxy'si) zaman aşımına uğrayıp interneti olan kullanıcıyı bile "offline"
// ekranına kilitliyordu. `navigator.onLine === false` uçak modunu / radyosuz
// durumu güvenilir yakalar; "wifi var ama internet yok" (captive portal)
// gibi kenar durumda uygulama açılır ama API çağrıları zaten kendi
// "sunucuya ulaşılamadı" mesajlarıyla nazikçe başarısız olur.

export default function ConnectionGate({ children }: { children: React.ReactNode }) {
  // SSR/ilk render her zaman "çevrimiçi" varsayar (deterministik, hydration-
  // safe). Gerçek durum mount sonrası okunuyor.
  const [offline, setOffline] = useState(false)

  const sync = useCallback(() => {
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false)
  }, [])

  useEffect(() => {
    sync()
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    // Uygulama arka plandan öne gelince tazele (uçak modu açıp kapatma).
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sync])

  return (
    <>
      {children}
      {offline && <OfflineScreen onRetry={sync} />}
    </>
  )
}

function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 40)
    return () => clearTimeout(id)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#050505',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px',
        padding: 'calc(24px + env(safe-area-inset-top)) 32px calc(24px + env(safe-area-inset-bottom))',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 400ms ease-in-out',
      }}
      role="alertdialog"
      aria-live="polite"
    >
      <div style={{ transform: 'scale(1.9)' }}>
        <VelisMark />
      </div>

      <div
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '13px',
          letterSpacing: '6px',
          color: 'rgba(246, 242, 235, 0.85)',
          marginTop: '10px',
        }}
      >
        VELIS
      </div>

      <p
        style={{
          margin: 0,
          maxWidth: '260px',
          textAlign: 'center',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: '20px',
          color: 'rgba(246, 242, 235, 0.5)',
        }}
      >
        {t('connection.line')}
      </p>

      <button
        onClick={onRetry}
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 500,
          fontSize: '13px',
          letterSpacing: '0.3px',
          color: '#E3C08C',
          background: 'none',
          border: '1px solid rgba(255, 178, 90, 0.3)',
          borderRadius: '999px',
          padding: '10px 24px',
          cursor: 'pointer',
        }}
      >
        {t('connection.retry')}
      </button>
    </div>
  )
}
