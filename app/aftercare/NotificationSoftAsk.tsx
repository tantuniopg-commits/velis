'use client'

import { FONT_SANS } from '../lib/typography'
import { useLocale } from '../contexts/LocaleContext'
import { acceptSoftAsk, declineSoftAsk } from '../services/notifications'

// İlk ritüelin hemen ardından, aftercare akışının SON adımı olarak gösterilen
// "soft ask" - bkz. talep md.2. Gerçek sistem izni BURADA DEĞİL, sadece
// kullanıcı "Evet, hatırlat" dedikten SONRA tetiklenir (bkz.
// services/notifications/permissions.ts acceptSoftAsk). Aftercare'in kendi
// tasarım diliyle (siyah zemin, amber vurgu, aynı yuvarlak buton) birebir
// aynı - yeni bir route DEĞİL, aynı ekranın üstüne binen bir katman.
export default function NotificationSoftAsk({ onDecision }: { onDecision: () => void }) {
  const { t } = useLocale()

  const handleAccept = async () => {
    await acceptSoftAsk()
    onDecision()
  }

  const handleDecline = () => {
    declineSoftAsk()
    onDecision()
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '1px solid rgba(216, 174, 108, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '26px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3C9.5 3 7.8 4.8 7.8 7.3V11C7.8 12 7.4 13 6.7 13.7L5.5 15C5 15.5 5.3 16.5 6 16.5H18C18.7 16.5 19 15.5 18.5 15L17.3 13.7C16.6 13 16.2 12 16.2 11V7.3C16.2 4.8 14.5 3 12 3Z"
            stroke="#D8AE6C"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M10 19C10.4 19.8 11.1 20.3 12 20.3C12.9 20.3 13.6 19.8 14 19" stroke="#D8AE6C" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>

      <h1 style={{ margin: 0, fontFamily: FONT_SANS, fontWeight: 600, fontSize: '22px', color: '#F5F0EA', maxWidth: '280px' }}>
        {t('notifications.softAsk.title')}
      </h1>
      <p style={{ marginTop: '14px', fontFamily: FONT_SANS, fontWeight: 400, fontSize: '14px', lineHeight: 1.5, color: '#9A948C', maxWidth: '300px' }}>
        {t('notifications.softAsk.body')}
      </p>

      <button
        onClick={handleAccept}
        style={{
          marginTop: '32px',
          padding: '13px 38px',
          borderRadius: '999px',
          border: 'none',
          background: 'linear-gradient(180deg, #F3CE8E 0%, #D9A254 100%)',
          color: '#171410',
          fontFamily: FONT_SANS,
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
        }}
      >
        {t('notifications.softAsk.accept')}
      </button>
      <button
        onClick={handleDecline}
        style={{
          marginTop: '14px',
          padding: '10px 20px',
          borderRadius: '999px',
          border: 'none',
          background: 'none',
          color: '#8F8A83',
          fontFamily: FONT_SANS,
          fontWeight: 400,
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        {t('notifications.softAsk.decline')}
      </button>
    </div>
  )
}
