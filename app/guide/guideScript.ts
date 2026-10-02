// VELIS Guide - adımların tam metni. Şu an gerçekten sahnelenen adımlar
// WELCOME / USER_TYPE / RITUAL / ORB_XP / COMPLETION (bkz. WelcomeScreen.tsx,
// WhoAreYouScreen.tsx, app/page.tsx, app/aftercare/page.tsx) -
// PRIVACY/EMAIL/PHONE/PROFILE bu uygulamada Guided Registration Mode'un bir
// parçası olarak DAHA SONRA (ilk ritüelden sonra) gerçekleşiyor; metinleri
// burada hazır duruyor, o akışa bağlamak ayrı bir adım.
export type GuideStepId =
  | 'WELCOME'
  | 'USER_TYPE'
  | 'PRIVACY'
  | 'EMAIL'
  | 'PHONE'
  | 'PROFILE'
  | 'RITUAL'
  | 'ORB_XP'
  | 'COMPLETION'

import type { UserType } from '../lib/onboarding'
import type { LocaleCode } from '../lib/i18n'

// Welcome ekranının kendi metni tamamen kaldırıldı - artık TEK anlatım
// kaynağı bu, Smoker/Nonsmoker'a göre farklı (eski WelcomeScreen COPY'sinin
// yerini alıyor). Dil seçimine göre EN/TR arasında geçiş yapıyor (bkz.
// getWelcomeLines, contexts/LocaleContext.tsx).
const WELCOME_LINES_EN: Record<UserType, string[]> = {
  Smoker: [
    'VELIS acts as your guide, helping you take control of every smoking moment.',
    'XP rewards help turn that control into a lasting habit.',
    "Now, let's get to know VELIS together.",
  ],
  Nonsmoker: [
    'VELIS acts as your guide, helping you take control whenever the urge appears.',
    'XP rewards help turn that control into a lasting habit.',
    "Now, let's get to know VELIS together.",
  ],
}

const WELCOME_LINES_TR: Record<UserType, string[]> = {
  Smoker: [
    'VELIS, her sigara anında kontrolü sana geri kazandıran rehberindir.',
    'XP ödülleri, bu kontrolü kalıcı bir alışkanlığa dönüştürmene yardımcı olur.',
    "Şimdi VELIS'i birlikte tanıyalım.",
  ],
  Nonsmoker: [
    'VELIS, istek belirdiğinde kontrolü sana geri kazandıran rehberindir.',
    'XP ödülleri, bu kontrolü kalıcı bir alışkanlığa dönüştürmene yardımcı olur.',
    "Şimdi VELIS'i birlikte tanıyalım.",
  ],
}

export function getWelcomeLines(userType: UserType, locale: LocaleCode = 'en'): string[] {
  return (locale === 'tr' ? WELCOME_LINES_TR : WELCOME_LINES_EN)[userType]
}

// Geriye dönük uyumluluk için - varsayılan (İngilizce) script'i doğrudan
// isteyen eski çağrı noktaları için (artık hiçbiri kalmadı, ama tip export'u
// başka yerlerden import edilebiliyor olabilir).
export const WELCOME_LINES = WELCOME_LINES_EN

const GUIDE_SCRIPT_EN: Record<GuideStepId, string[]> = {
  WELCOME: WELCOME_LINES_EN.Smoker,
  USER_TYPE: ['Choose the journey that reflects you today.'],
  PRIVACY: ['Please read these carefully.', "When you're ready, accept to continue."],
  EMAIL: ["Let's make sure it's really you."],
  PHONE: ['One more step.'],
  PROFILE: ['This is your personal space.', 'Your streak.', 'Your XP.', 'Your journey.'],
  RITUAL: [
    'This is your ritual.',
    'Each ritual lasts at least {seconds} seconds — stay as long as you like, XP keeps adding up.',
    "Touch the Amber Core when you're ready.",
    'The object will activate in about 5 seconds.',
  ],
  ORB_XP: [
    'Watch for the amber orbs.',
    'Tap them during your ritual for bonus XP.',
    'Quick taps in a row are worth more.',
  ],
  COMPLETION: [
    'Congratulations!',
    "You've completed your first ritual.",
    "You can return and complete a ritual anytime you need or want to. That's how you'll continue earning XP.",
    'Remember: your daily streak only increases when you complete one ritual every 24 hours.',
  ],
}

const GUIDE_SCRIPT_TR: Record<GuideStepId, string[]> = {
  WELCOME: WELCOME_LINES_TR.Smoker,
  USER_TYPE: ['Bugünü en iyi yansıtan yolculuğu seç.'],
  PRIVACY: ['Lütfen bunları dikkatle oku.', 'Hazır olduğunda, devam etmek için kabul et.'],
  EMAIL: ['Gerçekten sen olduğundan emin olalım.'],
  PHONE: ['Bir adım daha.'],
  PROFILE: ['Burası senin kişisel alanın.', 'Serin.', "XP'n.", 'Yolculuğun.'],
  RITUAL: [
    'Bu senin ritüelin.',
    'Her ritüel en az {seconds} saniye sürer — istediğin kadar kal, XP birikmeye devam eder.',
    "Hazır olduğunda Amber Çekirdek'e dokun.",
    'Nesne yaklaşık 5 saniye içinde etkinleşecek.',
  ],
  ORB_XP: [
    'Amber toplara dikkat et.',
    'Ritüel sırasında onlara dokun, ekstra XP kazan.',
    'Art arda hızlı dokunuşlar daha çok değer.',
  ],
  COMPLETION: [
    'Tebrikler!',
    'İlk ritüelini tamamladın.',
    'İhtiyaç duyduğunda veya istediğinde geri dönüp ritüel tamamlayabilirsin. XP kazanmaya böyle devam edeceksin.',
    'Unutma: günlük serin, sadece her 24 saatte bir ritüel tamamladığında artar.',
  ],
}

// `ritualDurationSec` verilirse RITUAL adımındaki "{seconds}" yer tutucusu
// kullanıcının GERÇEK eşiğiyle (bkz. lib/ritualConfig.ts) değiştiriliyor -
// rehber artık sabit "30 saniye" demiyor, kullanıcının kendi ayarını söylüyor
// (bkz. app/page.tsx RITUAL adımı çağrısı). Verilmezse (eski çağrı noktaları
// için) yer tutucu olduğu gibi kalır.
export function getGuideScript(locale: LocaleCode = 'en', ritualDurationSec?: number): Record<GuideStepId, string[]> {
  const script = locale === 'tr' ? GUIDE_SCRIPT_TR : GUIDE_SCRIPT_EN
  if (ritualDurationSec == null) return script
  return {
    ...script,
    RITUAL: script.RITUAL.map((line) => line.replace('{seconds}', String(ritualDurationSec))),
  }
}

// Geriye dönük uyumluluk için - varsayılan (İngilizce) script.
export const GUIDE_SCRIPT = GUIDE_SCRIPT_EN
