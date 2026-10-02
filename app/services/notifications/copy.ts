// Bildirim metin havuzları - VELIS'in sakin, mindful tonunda (bkz. talep
// md.4). Suçlayıcı/baskıcı/utandırıcı hiçbir ifade YOK ("Yine mi kaçırdın?"
// gibi cümleler burada YASAK - PR/kod incelemesinde de aranmalı). Her tür
// için TR/EN 6-8 varyasyon; store.ts `pickCopyIndex` ile art arda aynısı
// seçilmiyor.
import type { NotificationKind } from './types'
import { getStoredSettings } from '../../lib/settings'
import { pickCopyIndex } from './store'

type Copy = { title: string; body: string }

const RITUAL_REMINDER_TR: Copy[] = [
  { title: 'Ritüel vakti', body: 'İstersen birkaç dakikanı ayır, kendine nazik bir mola ver.' },
  { title: 'VELIS', body: 'Bugünkü ritüelin seni bekliyor, acelesi yok.' },
  { title: 'Küçük bir an', body: 'Nefes al, merkeze dön - ritüelin hazır.' },
  { title: 'Sakin bir çağrı', body: 'Bugün kendine birkaç dakika ayırmak ister misin?' },
  { title: 'VELIS', body: 'Ritüelin orada, sen hazır olduğunda duruyor.' },
  { title: 'Bir mola', body: 'Günün bir yerinde kendine dönmek için güzel bir an.' },
  { title: 'VELIS seninle', body: 'İstersen şimdi birkaç dakikalığına dur, nefeslen.' },
]

const RITUAL_REMINDER_EN: Copy[] = [
  { title: 'Time for your ritual', body: 'A few quiet minutes for yourself, whenever you’re ready.' },
  { title: 'VELIS', body: 'Your ritual is waiting - no rush.' },
  { title: 'A small moment', body: 'Breathe, return to center - your ritual is ready.' },
  { title: 'A calm nudge', body: 'Want to set aside a few minutes for yourself today?' },
  { title: 'VELIS', body: 'Your ritual is there whenever you’re ready for it.' },
  { title: 'A pause', body: 'A good moment somewhere today to come back to yourself.' },
  { title: 'VELIS is here', body: 'Take a few minutes now, if you’d like - just breathe.' },
]

const HARD_MOMENT_TR: Copy[] = [
  { title: 'Şu an burada', body: 'Zor bir an yaklaşıyor olabilir - istersen ritüeline dön.' },
  { title: 'VELIS', body: 'Birkaç nefes almak için iyi bir zaman.' },
  { title: 'Sakin kal', body: 'Bu an geçecek - istersen yanında olalım.' },
  { title: 'Bir hatırlatma', body: 'Kontrol senin elinde - ritüelin hazır.' },
  { title: 'VELIS seninle', body: 'Zorlanıyorsan, birkaç dakikalık bir mola iyi gelebilir.' },
  { title: 'Nazik bir an', body: 'İstersen şimdi merkeze dön, nefes al.' },
]

const HARD_MOMENT_EN: Copy[] = [
  { title: 'Right now', body: 'A tough moment might be coming up - your ritual is here if you need it.' },
  { title: 'VELIS', body: 'A good time for a few breaths.' },
  { title: 'Stay steady', body: 'This moment will pass - we’re here if you want us.' },
  { title: 'A gentle reminder', body: 'You’re in control - your ritual is ready.' },
  { title: 'VELIS is here', body: 'If it’s hard right now, a short pause might help.' },
  { title: 'A quiet moment', body: 'Come back to center, whenever you’re ready.' },
]

const MILESTONE_TR: Copy[] = [
  { title: 'Bir kilometre taşı', body: '{days} gün - yolculuğun gözle görülür şekilde ilerliyor.' },
  { title: 'VELIS', body: '{days} gün tamamlandı - bu küçük değil.' },
  { title: 'Tebrikler', body: '{days} güne ulaştın - kendine güvenebilirsin.' },
  { title: 'Bir an dur', body: '{days} gündür yolculuktasın - bunu hissetmeye değer.' },
  { title: 'VELIS seninle', body: '{days} gün - adım adım ilerliyorsun.' },
  { title: 'Güzel bir işaret', body: '{days} güne geldin, yolculuğun devam ediyor.' },
]

const MILESTONE_EN: Copy[] = [
  { title: 'A milestone', body: '{days} days - your journey is visibly moving forward.' },
  { title: 'VELIS', body: '{days} days complete - that’s not small.' },
  { title: 'Congratulations', body: 'You’ve reached {days} days - you can trust yourself.' },
  { title: 'Take a moment', body: '{days} days on this journey - worth feeling that.' },
  { title: 'VELIS is here', body: '{days} days - one step at a time.' },
  { title: 'A good sign', body: 'You’ve reached {days} days, and the journey continues.' },
]

const CHECKIN_TR: Copy[] = [
  { title: 'VELIS', body: 'Bir süredir görüşmedik - istediğinde buradayız.' },
  { title: 'Sadece bir selam', body: 'Ne zaman istersen, VELIS burada seni bekliyor.' },
  { title: 'Nazik bir hatırlatma', body: 'İstersen bir göz at, baskı yok.' },
  { title: 'VELIS seninle', body: 'Yolculuğun burada duruyor, istediğinde devam edebilirsin.' },
  { title: 'Merhaba', body: 'Aklına geldiğinde, kapımız her zaman açık.' },
]

const CHECKIN_EN: Copy[] = [
  { title: 'VELIS', body: 'Haven’t seen you in a while - we’re here whenever you’re ready.' },
  { title: 'Just a hello', body: 'VELIS is here whenever you’d like to come back.' },
  { title: 'A gentle reminder', body: 'Take a look whenever you’d like, no pressure.' },
  { title: 'VELIS is here', body: 'Your journey is still here, ready whenever you are.' },
  { title: 'Hi there', body: 'Whenever it crosses your mind, the door’s open.' },
]

const POOLS: Record<NotificationKind, { tr: Copy[]; en: Copy[] }> = {
  ritualReminder: { tr: RITUAL_REMINDER_TR, en: RITUAL_REMINDER_EN },
  hardMoment: { tr: HARD_MOMENT_TR, en: HARD_MOMENT_EN },
  milestone: { tr: MILESTONE_TR, en: MILESTONE_EN },
  checkin: { tr: CHECKIN_TR, en: CHECKIN_EN },
}

function currentLocale(): 'tr' | 'en' {
  const lang = getStoredSettings().language
  return lang === 'tr' ? 'tr' : 'en'
}

// `vars` şu an sadece milestone'daki "{days}" yer tutucusu için -
// basit string.replace, i18n.ts'teki `translate`'ten bağımsız (bu metinler
// çeviri sözlüğünde değil, kendi rastgele havuzunda yaşıyor).
export function pickNotificationCopy(kind: NotificationKind, vars?: Record<string, string | number>): Copy {
  const locale = currentLocale()
  const pool = POOLS[kind][locale]
  const index = pickCopyIndex(kind, pool.length)
  const picked = pool[index]
  if (!vars) return picked
  let { title, body } = picked
  for (const [k, v] of Object.entries(vars)) {
    title = title.replace(`{${k}}`, String(v))
    body = body.replace(`{${k}}`, String(v))
  }
  return { title, body }
}
