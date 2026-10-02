// Push bildirimlerinin TR/EN metin havuzu - app/services/notifications
// (istemci tarafı, Faz 1'den kalan) ile AYNI ton kuralları: sakin, mindful,
// ASLA suçlayıcı/baskıcı/utandırıcı değil (bkz. AGENTS.md "Bildirimler").
// Faz 2'de içerik SUNUCUDA seçiliyor - istemcinin artık kendi metin havuzu
// yok, bu dosya o sorumluluğun yeni yeri.

const RITUAL_REMINDER = {
  tr: [
    { title: 'Ritüel vakti', body: 'İstersen birkaç dakikanı ayır, kendine nazik bir mola ver.' },
    { title: 'VELIS', body: 'Bugünkü ritüelin seni bekliyor, acelesi yok.' },
    { title: 'Küçük bir an', body: 'Nefes al, merkeze dön - ritüelin hazır.' },
    { title: 'Sakin bir çağrı', body: 'Bugün kendine birkaç dakika ayırmak ister misin?' },
    { title: 'VELIS', body: 'Ritüelin orada, sen hazır olduğunda duruyor.' },
    { title: 'Bir mola', body: 'Günün bir yerinde kendine dönmek için güzel bir an.' },
  ],
  en: [
    { title: 'Time for your ritual', body: 'A few quiet minutes for yourself, whenever you’re ready.' },
    { title: 'VELIS', body: 'Your ritual is waiting - no rush.' },
    { title: 'A small moment', body: 'Breathe, return to center - your ritual is ready.' },
    { title: 'A calm nudge', body: 'Want to set aside a few minutes for yourself today?' },
    { title: 'VELIS', body: 'Your ritual is there whenever you’re ready for it.' },
    { title: 'A pause', body: 'A good moment somewhere today to come back to yourself.' },
  ],
}

const MILESTONE = {
  tr: [
    { title: 'Bir kilometre taşı', body: '{days} gün - yolculuğun gözle görülür şekilde ilerliyor.' },
    { title: 'VELIS', body: '{days} gün tamamlandı - bu küçük değil.' },
    { title: 'Tebrikler', body: '{days} güne ulaştın - kendine güvenebilirsin.' },
    { title: 'VELIS seninle', body: '{days} gün - adım adım ilerliyorsun.' },
  ],
  en: [
    { title: 'A milestone', body: '{days} days - your journey is visibly moving forward.' },
    { title: 'VELIS', body: '{days} days complete - that’s not small.' },
    { title: 'Congratulations', body: 'You’ve reached {days} days - you can trust yourself.' },
    { title: 'VELIS is here', body: '{days} days - one step at a time.' },
  ],
}

const POOLS = { ritualReminder: RITUAL_REMINDER, milestone: MILESTONE }

function pickCopy(kind, locale, vars) {
  const pool = POOLS[kind][locale === 'tr' ? 'tr' : 'en']
  const picked = pool[Math.floor(Math.random() * pool.length)]
  if (!vars) return picked
  let { title, body } = picked
  for (const [k, v] of Object.entries(vars)) {
    title = title.replace(`{${k}}`, String(v))
    body = body.replace(`{${k}}`, String(v))
  }
  return { title, body }
}

module.exports = { pickCopy }
