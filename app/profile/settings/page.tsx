'use client'

import { useRouter } from 'next/navigation'
import { SettingsShell, SettingsCard, SettingsRow } from './shared'
import { useLocale } from '../../contexts/LocaleContext'

// Ayarların ana listesi - artık Profile sayfasına gömülü değil, kendi
// adanmış ekranı (bkz. Profile'daki sağ üst köşe simgesi). Geri butonu
// buradan tek seviye yukarı, gerçekten Profile'a dönüyor.
export default function SettingsIndex() {
  const router = useRouter()
  const { t } = useLocale()

  const items = [
    { label: t('settings.item.account'), path: '/profile/settings/account' },
    { label: t('settings.item.language'), path: '/profile/settings/language' },
    { label: t('settings.item.notifications'), path: '/profile/settings/notifications' },
    { label: t('settings.item.sound'), path: '/profile/settings/sound' },
    { label: t('settings.item.privacy'), path: '/profile/settings/privacy' },
    { label: t('settings.item.about'), path: '/profile/settings/about' },
  ]

  return (
    <SettingsShell title={t('settings.title')} backTo="/profile">
      <SettingsCard>
        {items.map((item, i) => (
          <SettingsRow key={item.path} label={item.label} onClick={() => router.push(item.path)} first={i === 0} />
        ))}
      </SettingsCard>
    </SettingsShell>
  )
}
