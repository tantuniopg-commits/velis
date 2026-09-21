// Velis Privacy Policy / Terms of Service - içerik burada tek yerden
// geliyor (bkz. app/profile/page.tsx doküman okuyucusu, app/profile/settings/
// privacy/page.tsx). EN/TR ayrı kaynak metinler - getTermsOfService/
// getPrivacyPolicy o anki locale'e göre doğru olanı döndürüyor.
//
// Gizlilik Politikası 2026-08-30'da baştan yazıldı, 2026-09-02'de gözden
// geçirildi - uygulamanın GERÇEKTEN topladığı her veri türünü (ad, e-posta,
// cinsiyet, doğum tarihi, hash'li şifre, uygulama içi ilerleme/XP/streak,
// dil+bildirim tercihleri, hesap meta verisi) listeliyor; KVKK/GDPR
// dayanakları, uluslararası aktarım, saklama, haklar, hesap silme ve 13+
// kuralı dahil. Telefon/SMS artık toplanmıyor (telefonlu kayıt kaldırıldı).
//
// Terms of Service 2026-09-02'de genişletildi - TIBBİ SORUMLULUK REDDİ
// (Velis tıbbi cihaz/tavsiye değil), yaş şartı, hizmet tanımı, ödeme
// (ücretsiz, IAP yok), görünen ad kuralı eklendi.
//
// İki dil BİREBİR aynı yapı - biri değişirse diğeri de değişmeli.
//
// 2026-09-21: profil fotoğrafı, bildirme/engelleme ve benzersiz görünen ad için
// iki belge de güncellendi (Terms 5-7, Privacy 1-4, 6, 9). İçerik moderasyonu
// App Store Guideline 1.2 gereği. Bildirimlere "hızla" bakılacağı yazıyor;
// somut bir süre (ör. 24 saat) SÖZ VERİLMEDİ - vermek istenirse buraya ve iki
// dile birlikte eklenmeli.

export type LegalSection = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  afterBullets?: string[]
}

export type LegalDocument = {
  title: string
  lastUpdated: string
  intro: string[]
  sections: LegalSection[]
}

const TERMS_OF_SERVICE_EN: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: 'Last Updated: September 21, 2026',
  intro: [
    'These Terms of Service ("Terms") are an agreement between you and the developer of Velis ("Velis", "we", "us"). By downloading, accessing, or using the Velis app, you agree to these Terms. If you do not agree, do not use the app.',
  ],
  sections: [
    {
      heading: '1. About These Terms',
      paragraphs: [
        'Velis is operated by an independent developer based in Türkiye. You can reach us at contact@forsvelis.com.',
        'These Terms cover your use of the app. Our Privacy Policy explains how we handle your data and is part of your agreement with us.',
      ],
    },
    {
      heading: '2. What Velis Is — and Is Not',
      paragraphs: [
        'Velis is a calm, ritual-based app for the moment a craving appears. It gives you a short, deliberate practice to run, tracks your progress over time, and lets you compare streaks and XP with other users.',
        'Velis is not a medical device and does not provide medical advice, diagnosis, or treatment. It is not a smoking-cessation program and is not a substitute for professional help, a doctor, a therapist, or a quitline. Nothing in the app is medical or health advice. If you want to stop smoking or have any concerns about your health, talk to a qualified healthcare professional. Never disregard or delay professional advice because of something in Velis. Your use of the app is your own choice and responsibility.',
      ],
    },
    {
      heading: '3. Eligibility',
      paragraphs: [
        'You must be at least 13 years old to use Velis. By using the app you confirm that you meet this requirement. We ask for your date of birth at sign-up and do not allow accounts for anyone under 13.',
      ],
    },
    {
      heading: '4. Your Account',
      paragraphs: [
        'You can use the core features of Velis without an account. If you create one, you agree to provide accurate information, to keep your password confidential, and to be responsible for everything that happens under your account. One account per person. Tell us at contact@forsvelis.com if you believe your account has been accessed without your permission.',
        'You can delete your account at any time from Profile → Settings → Account → Delete Account.',
      ],
    },
    {
      heading: '5. Acceptable Use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Use the app for any unlawful purpose or in violation of these Terms',
        'Attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the app or its servers',
        "Interfere with or manipulate progress data, the leaderboard, or other users' experience",
        'Violate the rights of Velis or of any other person',
        'Add a name or photo that breaks the rules in sections 6 and 7',
      ],
    },
    {
      heading: '6. Display Names, Photos and the Leaderboard',
      paragraphs: [
        'The leaderboard shows your name, your stats (streak and XP) and, if you add one, your profile photo to other users; your email is never shown.',
        'Your display name must be unique: you cannot use a name that another account already uses (capital letters and extra spaces are ignored when we compare names). Choose a name that is not offensive, misleading, or impersonating someone else. We may change or remove a name, or remove an account from the leaderboard, if it breaks this rule.',
      ],
    },
    {
      heading: '7. Your Content, Reporting and Blocking',
      paragraphs: [
        'The only content you can add to Velis is your display name and an optional profile photo. You are responsible for it, and you keep ownership of your photo. You give us a limited, non-exclusive licence to store your photo and show it to other users inside Velis for as long as you keep it; that licence ends when you remove the photo or delete your account. You can change or remove your photo at any time with the pencil on your Profile (or in Settings → Account).',
        'Only add a photo you have the right to use, and that shows you or something appropriate. Do not add content that:',
      ],
      bullets: [
        'Is nude, sexually explicit, or sexually suggestive',
        'Is violent, graphic, hateful, harassing, or threatening',
        'Shows another person without their permission, or pretends to be someone else',
        'Infringes anyone else\'s intellectual-property, privacy, or other rights',
        'Is otherwise unlawful or objectionable',
      ],
      afterBullets: [
        'We have zero tolerance for objectionable content or abusive behaviour. We may remove any photo or name, hide a photo automatically after several different people report it, and suspend or end the account of anyone who breaks these rules, without notice.',
        'You can report any user from their leaderboard screen (••• → Report user). We review reports promptly and act on content that breaks these rules. You can also block a user there: a blocked user no longer appears on your leaderboard, and you can undo this in Settings → Privacy & Security → Blocked users.',
        'To contact us about content or a report, email contact@forsvelis.com.',
      ],
    },
    {
      heading: '8. Payments',
      paragraphs: [
        'Velis is currently free to use. There are no in-app purchases and no subscriptions. If this changes in the future, we will update these Terms and make any paid features clear before you buy.',
      ],
    },
    {
      heading: '9. Intellectual Property',
      paragraphs: [
        'The Velis app — its name, design, text, graphics, and sounds — is owned by us or our licensors and is protected by law. We grant you a personal, non-exclusive, non-transferable, revocable licence to use the app for your own personal, non-commercial use. You may not copy, modify, distribute, sell, or create derivative works from any part of the app without our permission.',
      ],
    },
    {
      heading: '10. Disclaimer of Warranties',
      paragraphs: [
        'The app is provided "as is" and "as available", without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, or uninterrupted or error-free operation. Velis relies on an internet connection and third-party services and may be unavailable at times.',
      ],
    },
    {
      heading: '11. Limitation of Liability',
      paragraphs: [
        'To the fullest extent permitted by law, Velis and its developer will not be liable for any indirect, incidental, special, or consequential damages, or for any loss of data, arising from your use of or inability to use the app. Nothing in these Terms limits liability that cannot be limited under applicable law.',
      ],
    },
    {
      heading: '12. Termination',
      paragraphs: [
        'You can stop using Velis and delete your account at any time. We may suspend or end your access if you break these Terms or if we stop offering the app. Sections that by their nature should survive termination (such as intellectual property, disclaimers, and limitation of liability) will continue to apply.',
      ],
    },
    {
      heading: '13. Changes to These Terms',
      paragraphs: [
        'We may update these Terms from time to time. If we make material changes we will update the "Last Updated" date and, where appropriate, notify you in the app. Continuing to use Velis after an update means you accept the revised Terms.',
      ],
    },
    {
      heading: '14. Governing Law',
      paragraphs: [
        'These Terms are governed by the laws of the Republic of Türkiye, without regard to conflict-of-law rules. Mandatory consumer-protection rights you have in your country of residence are not affected.',
      ],
    },
    {
      heading: '15. Contact',
      paragraphs: ['Questions about these Terms: contact@forsvelis.com'],
    },
  ],
}

const TERMS_OF_SERVICE_TR: LegalDocument = {
  title: 'Kullanım Koşulları',
  lastUpdated: 'Son Güncelleme: 21 Eylül 2026',
  intro: [
    'Bu Kullanım Koşulları ("Koşullar"), sizinle Velis geliştiricisi ("Velis", "biz", "bize") arasında bir sözleşmedir. Velis uygulamasını indirerek, erişerek veya kullanarak bu Koşulları kabul etmiş olursunuz. Kabul etmiyorsanız uygulamayı kullanmayın.',
  ],
  sections: [
    {
      heading: '1. Bu Koşullar Hakkında',
      paragraphs: [
        'Velis, Türkiye merkezli bağımsız bir geliştirici tarafından işletilmektedir. Bize contact@forsvelis.com adresinden ulaşabilirsiniz.',
        'Bu Koşullar uygulamayı kullanımınızı kapsar. Gizlilik Politikamız verilerinizi nasıl ele aldığımızı açıklar ve bizimle olan sözleşmenizin bir parçasıdır.',
      ],
    },
    {
      heading: '2. Velis Nedir — ve Ne Değildir',
      paragraphs: [
        'Velis, bir isteğin/dürtünün belirdiği an için tasarlanmış, ritüel temelli sakin bir uygulamadır. Uygulayabileceğiniz kısa ve bilinçli bir pratik sunar, zamanla ilerlemenizi takip eder ve seri ile XP’nizi diğer kullanıcılarla karşılaştırmanıza olanak tanır.',
        'Velis bir tıbbi cihaz değildir; tıbbi tavsiye, teşhis veya tedavi sağlamaz. Bir sigara bırakma programı değildir ve profesyonel yardımın, bir doktorun, bir terapistin veya bir bırakma danışma hattının yerini tutmaz. Uygulamadaki hiçbir şey tıbbi veya sağlıkla ilgili tavsiye değildir. Sigarayı bırakmak istiyorsanız veya sağlığınızla ilgili herhangi bir endişeniz varsa nitelikli bir sağlık uzmanına başvurun. Velis’teki herhangi bir şey nedeniyle profesyonel tavsiyeyi asla göz ardı etmeyin veya ertelemeyin. Uygulamayı kullanmak sizin kendi seçiminiz ve sorumluluğunuzdadır.',
      ],
    },
    {
      heading: '3. Uygunluk',
      paragraphs: [
        'Velis’i kullanmak için en az 13 yaşında olmalısınız. Uygulamayı kullanarak bu şartı karşıladığınızı onaylarsınız. Kayıt sırasında doğum tarihinizi sorarız ve 13 yaşın altındaki hiç kimse için hesap açılmasına izin vermeyiz.',
      ],
    },
    {
      heading: '4. Hesabınız',
      paragraphs: [
        'Velis’in çekirdek özelliklerini hesap olmadan kullanabilirsiniz. Hesap oluşturursanız; doğru bilgi vermeyi, şifrenizi gizli tutmayı ve hesabınız altında olan her şeyden sorumlu olmayı kabul edersiniz. Kişi başına bir hesap. Hesabınıza izniniz olmadan erişildiğini düşünüyorsanız contact@forsvelis.com adresinden bize bildirin.',
        'Hesabınızı istediğiniz zaman Profil → Ayarlar → Hesap → Hesabı Sil yolundan silebilirsiniz.',
      ],
    },
    {
      heading: '5. Kabul Edilebilir Kullanım',
      paragraphs: ['Aşağıdakileri yapmamayı kabul edersiniz:'],
      bullets: [
        'Uygulamayı herhangi bir yasa dışı amaçla veya bu Koşulları ihlal edecek şekilde kullanmak',
        'Uygulamayı ya da sunucularını bozmaya, aşırı yüklemeye, tersine mühendisliğe tabi tutmaya veya yetkisiz erişim sağlamaya çalışmak',
        'İlerleme verilerine, liderlik tablosuna ya da diğer kullanıcıların deneyimine müdahale etmek veya bunları manipüle etmek',
        'Velis’in veya başka bir kişinin haklarını ihlal etmek',
        '6. ve 7. bölümlerdeki kurallara aykırı bir ad veya fotoğraf eklemek',
      ],
    },
    {
      heading: '6. Görünen Adlar, Fotoğraflar ve Liderlik Tablosu',
      paragraphs: [
        'Liderlik tablosu adınızı, istatistiklerinizi (seri ve XP) ve eklediyseniz profil fotoğrafınızı diğer kullanıcılara gösterir; e-posta adresiniz asla gösterilmez.',
        'Görünen adınız benzersiz olmalıdır: başka bir hesabın zaten kullandığı bir adı kullanamazsınız (adları karşılaştırırken büyük/küçük harf ve fazla boşluklar dikkate alınmaz). Hakaret içermeyen, yanıltıcı olmayan ve başkasını taklit etmeyen bir ad seçin. Bu kurala aykırı bir adı değiştirebilir veya kaldırabilir ya da bir hesabı liderlik tablosundan çıkarabiliriz.',
      ],
    },
    {
      heading: '7. İçeriğiniz, Bildirme ve Engelleme',
      paragraphs: [
        'Velis’e ekleyebileceğiniz tek içerik görünen adınız ve isteğe bağlı bir profil fotoğrafınızdır. Bunlardan siz sorumlusunuz ve fotoğrafınızın sahibi siz kalırsınız. Fotoğrafınızı saklamamız ve Velis içinde diğer kullanıcılara göstermemiz için, onu tuttuğunuz sürece geçerli, sınırlı ve münhasır olmayan bir lisans verirsiniz; fotoğrafı kaldırdığınızda veya hesabınızı sildiğinizde bu lisans sona erer. Fotoğrafınızı istediğiniz zaman Profil’deki kalemle (veya Ayarlar → Hesap’tan) değiştirebilir ya da kaldırabilirsiniz.',
        'Yalnızca kullanma hakkınız olan ve sizi ya da uygun bir görseli gösteren bir fotoğraf ekleyin. Şu içerikleri eklemeyin:',
      ],
      bullets: [
        'Çıplaklık içeren, cinsel açıklıkta olan veya cinsel çağrışım yapan içerik',
        'Şiddet, rahatsız edici görüntü, nefret, taciz veya tehdit içeren içerik',
        'Başka bir kişiyi izni olmadan gösteren ya da başkasını taklit eden içerik',
        'Bir başkasının fikri mülkiyet, gizlilik veya diğer haklarını ihlal eden içerik',
        'Başka bir şekilde yasa dışı veya uygunsuz olan içerik',
      ],
      afterBullets: [
        'Uygunsuz içeriğe ve kötü niyetli davranışa tolerans göstermeyiz. Herhangi bir fotoğrafı veya adı kaldırabilir, birkaç farklı kişi tarafından bildirilen bir fotoğrafı otomatik olarak gizleyebilir ve bu kurallara uymayan herkesin hesabını önceden haber vermeden askıya alabilir veya sonlandırabiliriz.',
        'Herhangi bir kullanıcıyı liderlik tablosundaki ekranından bildirebilirsiniz (••• → Kullanıcıyı bildir). Bildirimleri hızla inceler, bu kurallara aykırı içeriklere işlem yaparız. Aynı yerden kullanıcıyı engelleyebilirsiniz: engellediğiniz kullanıcı liderlik tablonuzda görünmez; bunu Ayarlar → Gizlilik ve Güvenlik → Engellenen kullanıcılar’dan geri alabilirsiniz.',
        'İçerik veya bir bildirimle ilgili bize ulaşmak için contact@forsvelis.com adresine yazın.',
      ],
    },
    {
      heading: '8. Ödemeler',
      paragraphs: [
        'Velis şu anda ücretsizdir. Uygulama içi satın alma ve abonelik yoktur. İleride bu değişirse bu Koşulları güncelleriz ve satın almadan önce ücretli özellikleri açıkça belirtiriz.',
      ],
    },
    {
      heading: '9. Fikri Mülkiyet',
      paragraphs: [
        'Velis uygulaması — adı, tasarımı, metinleri, grafikleri ve sesleri — bize veya lisans verenlerimize aittir ve yasalarla korunur. Uygulamayı yalnızca kişisel, ticari olmayan kullanımınız için kullanmanıza yönelik kişisel, münhasır olmayan, devredilemez ve geri alınabilir bir lisans veririz. İznimiz olmadan uygulamanın hiçbir bölümünü kopyalayamaz, değiştiremez, dağıtamaz, satamaz veya bundan türev çalışmalar oluşturamazsınız.',
      ],
    },
    {
      heading: '10. Garanti Reddi',
      paragraphs: [
        'Uygulama, açık veya zımni hiçbir garanti verilmeksizin "olduğu gibi" ve "mevcut olduğu şekilde" sunulur; belirli bir amaca uygunluk, doğruluk veya kesintisiz ya da hatasız çalışma garantileri dahil. Velis bir internet bağlantısına ve üçüncü taraf hizmetlerine bağlıdır ve zaman zaman kullanılamayabilir.',
      ],
    },
    {
      heading: '11. Sorumluluğun Sınırlandırılması',
      paragraphs: [
        'Yasaların izin verdiği azami ölçüde, Velis ve geliştiricisi; uygulamayı kullanmanızdan veya kullanamamanızdan doğan hiçbir dolaylı, arızi, özel ya da sonuçsal zarardan veya herhangi bir veri kaybından sorumlu olmayacaktır. Bu Koşullardaki hiçbir hüküm, ilgili mevzuata göre sınırlandırılamayacak sorumluluğu sınırlandırmaz.',
      ],
    },
    {
      heading: '12. Fesih',
      paragraphs: [
        'Velis’i kullanmayı istediğiniz zaman bırakabilir ve hesabınızı silebilirsiniz. Bu Koşulları ihlal etmeniz veya uygulamayı sunmayı bırakmamız durumunda erişiminizi askıya alabilir ya da sonlandırabiliriz. Niteliği gereği fesihten sonra da geçerli kalması gereken bölümler (fikri mülkiyet, garanti reddi ve sorumluluğun sınırlandırılması gibi) uygulanmaya devam eder.',
      ],
    },
    {
      heading: '13. Bu Koşullardaki Değişiklikler',
      paragraphs: [
        'Bu Koşulları zaman zaman güncelleyebiliriz. Esaslı değişiklikler yaparsak "Son Güncelleme" tarihini günceller ve uygun olduğunda sizi uygulama içinde bilgilendiririz. Bir güncellemeden sonra Velis’i kullanmaya devam etmeniz, revize edilmiş Koşulları kabul ettiğiniz anlamına gelir.',
      ],
    },
    {
      heading: '14. Uygulanacak Hukuk',
      paragraphs: [
        'Bu Koşullar, kanunlar ihtilafı kurallarına bakılmaksızın Türkiye Cumhuriyeti kanunlarına tabidir. İkamet ettiğiniz ülkede sahip olduğunuz zorunlu tüketici hakları bundan etkilenmez.',
      ],
    },
    {
      heading: '15. İletişim',
      paragraphs: ['Bu Koşullarla ilgili sorular: contact@forsvelis.com'],
    },
  ],
}

const PRIVACY_POLICY_EN: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: 'Last Updated: September 21, 2026',
  intro: [
    'Velis ("Velis", "we", "our", or "us") respects your privacy. This Privacy Policy explains what information we collect when you use the Velis mobile application, why we collect it, how it is stored and shared, and the choices and rights you have.',
    'Velis is operated by an independent developer based in Türkiye. For data-protection purposes, that developer is the data controller for your personal data and can be reached at contact@forsvelis.com.',
    'By creating an account or using Velis, you agree to this Privacy Policy. If you do not agree, please do not use the app.',
  ],
  sections: [
    {
      heading: '1. Information We Collect',
      paragraphs: ['We collect only the information needed to run the app and your account.', 'Information you provide when you create an account:'],
      bullets: [
        'Name',
        'Email address',
        'Gender (Female / Male / Other / Prefer not to say)',
        'Date of birth (used to confirm you are at least 13 years old)',
        'Password — stored only as a one-way cryptographic hash. We never store, see, or have any way to recover your actual password.',
      ],
      afterBullets: [
        'Information created as you use the app: your in-app progress and activity, including journey day, current streak, total XP, number of rituals completed, total ritual time, and your reward-claim history. If you are signed in, this is stored on our servers so it can sync across your devices.',
        'Preferences: your chosen language and notification settings.',
        'Account metadata: the date your account was created and, for security, timestamps of certain account events.',
        'Optional content and safety data: a profile photo if you add one, the reports you send about other users, and the list of users you block (see "3. Profile Photos, Reports and Blocking" below).',
        'You can use the core features of Velis (the ritual, the journey, local progress) without creating an account. In that case your progress stays only on your device and is not sent to us.',
      ],
    },
    {
      heading: '2. How We Use Your Information',
      paragraphs: ['We use your information to:'],
      bullets: [
        'Create and operate your account and authenticate you when you sign in',
        'Save your progress and sync it across your devices',
        'Show the leaderboard, which ranks registered users by streak and XP (your name, stats and, if you added one, your profile photo are visible to other users there; your email is never shown)',
        'Send you account-related emails (verification codes, password resets) and the ritual reminder emails you have not turned off',
        'Keep the service secure, prevent abuse, and troubleshoot problems',
        'Maintain basic server logs (such as error and request logs) needed to operate, protect, and improve the service',
        'Review reports about users and content, hide photos, and apply blocks so that Velis stays safe for everyone',
      ],
      afterBullets: [
        'We do not use your data for advertising, and we do not sell it.',
        'Authorized members of our team may access account data — never passwords — when reasonably necessary for support, moderation, security, or legal compliance.',
      ],
    },
    {
      heading: '3. Profile Photos, Reports and Blocking',
      paragraphs: [
        'Adding a profile photo is optional. If you add one, Velis receives only the picture you choose or take; it never has access to the rest of your photo library. The app crops the picture to a square and shrinks it on your device before uploading, so we store a small copy in our database, not the original.',
        'Your photo is shown to other Velis users on the leaderboard, next to your name and stats. It is served from a web address that does not require signing in, so anyone who has that address can open the image. You can change or remove your photo at any time (Profile → pencil icon, or Settings → Account), and it is deleted when you delete your account.',
        'Camera and photo access: Velis asks for camera or photo-library access only when you choose to add a photo, and uses it only for that purpose.',
        'Reports and blocking: you can report or block another user from their leaderboard screen. When you report someone we store the report (who reported whom, and any reason given) and email it to our support address so that we can review it. A photo that several different people report is hidden automatically. When you block someone, we store their account ID in your block list so that it applies on all your devices. Reports are used only for moderation and safety.',
      ],
    },
    {
      heading: '4. Legal Bases for Processing',
      paragraphs: [
        'Where data-protection law (such as the Turkish KVKK or the EU/UK GDPR) applies, we process your personal data on the following bases: performance of our agreement with you (to provide the app and your account); your consent (for optional reminder emails, which you can withdraw at any time in Settings); and our legitimate interests (keeping the service secure and safe, including moderating reports, and improving it), balanced against your rights.',
      ],
    },
    {
      heading: '5. Sharing and Disclosure',
      paragraphs: ['We do not sell or rent your personal data. We share it only in these cases:'],
      bullets: [
        'Other Velis users: your name, stats and profile photo are shown on the leaderboard. Your email address and password are never shown.',
        'Service providers who process data on our behalf to run Velis: application hosting, database hosting, and transactional email delivery. These providers may only use the data to provide their service to us.',
        'Legal requirements: if we are required to disclose data by law, legal process, or a valid governmental request, or to protect the rights, safety, or property of Velis, our users, or the public.',
        'Business transfer: if Velis is involved in a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction; we will notify you if this materially changes how your data is handled.',
      ],
    },
    {
      heading: '6. Where Your Data Is Processed',
      paragraphs: [
        'Our servers and some of our service providers are located outside your country, including in the European Union and the United States. When your data is transferred internationally, we rely on appropriate safeguards required by applicable law.',
      ],
    },
    {
      heading: '7. Data Retention',
      paragraphs: [
        'We keep your account data for as long as your account exists. Verification and password-reset codes are short-lived and are deleted after they expire or are used.',
        'When you delete your account, your account and its associated data are permanently removed from our servers. Backups, if any, are overwritten on a rolling basis. We may retain limited information where required to comply with legal obligations or resolve disputes.',
        'Your profile photo is kept until you remove it or delete your account. Reports about you, reports you made, and your block list are deleted when the accounts involved are deleted; reports about a photo are also cleared when that photo is replaced or removed.',
      ],
    },
    {
      heading: '8. Security',
      paragraphs: [
        'Data is transmitted over encrypted connections (HTTPS/TLS) and stored on access-controlled servers. Passwords are hashed with a strong one-way algorithm and cannot be reversed.',
        'No method of transmission or storage is completely secure. While we take reasonable measures to protect your data, we cannot guarantee absolute security.',
      ],
    },
    {
      heading: '9. Your Rights',
      paragraphs: ['Depending on where you live, you may have the right to:'],
      bullets: [
        'Access the personal data we hold about you',
        'Correct inaccurate or incomplete data',
        'Delete your data (see "Deleting Your Account" below)',
        'Object to or restrict certain processing',
        'Withdraw consent for optional processing at any time',
        'Receive a copy of your data in a portable format',
        'Lodge a complaint with your local data-protection authority',
      ],
      afterBullets: ['To exercise any of these rights, contact us at contact@forsvelis.com. We will respond within the time required by applicable law.'],
    },
    {
      heading: '10. Deleting Your Account',
      paragraphs: [
        'You can delete your account at any time from within the app: Profile → Settings → Account → Delete Account. This permanently removes your account and its data from our servers and cannot be undone.',
        'This includes your profile photo, your block list, and reports you made or that were made about you.',
      ],
    },
    {
      heading: "11. Children's Privacy",
      paragraphs: [
        'Velis is not intended for and may not be used by anyone under 13 years of age. During sign-up we ask for your date of birth and do not allow accounts for users under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, contact us and we will delete it.',
      ],
    },
    {
      heading: '12. Cookies and Similar Technologies',
      paragraphs: [
        'Velis does not use advertising or cross-app tracking technologies. The app uses local device storage only to keep you signed in and to remember your settings and offline progress.',
      ],
    },
    {
      heading: '13. Changes to This Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. If we make material changes, we will update the "Last Updated" date and, where appropriate, notify you in the app. Continued use of Velis after an update means you accept the revised policy.',
      ],
    },
    {
      heading: '14. Contact',
      paragraphs: ['If you have any questions about this Privacy Policy or your data, contact us at contact@forsvelis.com.'],
    },
  ],
}

const PRIVACY_POLICY_TR: LegalDocument = {
  title: 'Gizlilik Politikası',
  lastUpdated: 'Son Güncelleme: 21 Eylül 2026',
  intro: [
    'Velis ("Velis", "biz", "bizim" veya "bize") gizliliğinize saygı duyar. Bu Gizlilik Politikası; Velis mobil uygulamasını kullandığınızda hangi bilgileri topladığımızı, neden topladığımızı, verilerinizin nasıl saklanıp paylaşıldığını ve sahip olduğunuz seçim ve hakları açıklar.',
    'Velis, Türkiye merkezli bağımsız bir geliştirici tarafından işletilmektedir. Veri koruma açısından bu geliştirici, kişisel verilerinizin veri sorumlusudur ve contact@forsvelis.com adresinden kendisine ulaşılabilir.',
    'Hesap oluşturarak veya Velis\'i kullanarak bu Gizlilik Politikasını kabul etmiş olursunuz. Kabul etmiyorsanız lütfen uygulamayı kullanmayın.',
  ],
  sections: [
    {
      heading: '1. Topladığımız Bilgiler',
      paragraphs: ['Yalnızca uygulamayı ve hesabınızı çalıştırmak için gereken bilgileri topluyoruz.', 'Hesap oluştururken verdiğiniz bilgiler:'],
      bullets: [
        'Ad',
        'E-posta adresi',
        'Cinsiyet (Kadın / Erkek / Diğer / Belirtmek istemiyorum)',
        'Doğum tarihi (en az 13 yaşında olduğunuzu doğrulamak için kullanılır)',
        'Şifre — yalnızca tek yönlü kriptografik bir özet (hash) olarak saklanır. Gerçek şifrenizi hiçbir zaman saklamayız, göremeyiz ve geri döndürmemizin hiçbir yolu yoktur.',
      ],
      afterBullets: [
        'Uygulamayı kullandıkça oluşan bilgiler: uygulama içi ilerlemeniz ve etkinliğiniz — yolculuk günü, mevcut seri, toplam XP, tamamlanan ritüel sayısı, toplam ritüel süresi ve ödül alma geçmişiniz. Giriş yaptıysanız bu veriler, cihazlarınız arasında senkronlanabilmesi için sunucularımızda saklanır.',
        'Tercihler: seçtiğiniz dil ve bildirim ayarları.',
        'Hesap bilgileri: hesabınızın oluşturulma tarihi ve güvenlik amacıyla bazı hesap olaylarının zaman damgaları.',
        'İsteğe bağlı içerik ve güvenlik verileri: eklerseniz bir profil fotoğrafı, diğer kullanıcılar hakkında gönderdiğiniz bildirimler ve engellediğiniz kullanıcıların listesi (aşağıdaki "3. Profil Fotoğrafları, Bildirme ve Engelleme" bölümüne bakın).',
        'Velis\'in çekirdek özelliklerini (ritüel, yolculuk, yerel ilerleme) hesap oluşturmadan kullanabilirsiniz. Bu durumda ilerlemeniz yalnızca cihazınızda kalır ve bize gönderilmez.',
      ],
    },
    {
      heading: '2. Bilgilerinizi Nasıl Kullanıyoruz',
      paragraphs: ['Bilgilerinizi şu amaçlarla kullanırız:'],
      bullets: [
        'Hesabınızı oluşturmak, işletmek ve giriş yaptığınızda kimliğinizi doğrulamak',
        'İlerlemenizi kaydetmek ve cihazlarınız arasında senkronlamak',
        'Kayıtlı kullanıcıları seri ve XP\'ye göre sıralayan liderlik tablosunu göstermek (adınız, istatistikleriniz ve eklediyseniz profil fotoğrafınız orada diğer kullanıcılara görünür; e-posta adresiniz asla gösterilmez)',
        'Hesapla ilgili e-postaları (doğrulama kodları, şifre sıfırlama) ve kapatmadığınız ritüel hatırlatma e-postalarını göndermek',
        'Hizmeti güvende tutmak, kötüye kullanımı önlemek ve sorunları gidermek',
        'Hizmeti işletmek, korumak ve geliştirmek için gereken temel sunucu günlüklerini (hata ve istek günlükleri gibi) tutmak',
        'Herkes için güvenli kalması adına kullanıcı ve içerik bildirimlerini incelemek, fotoğrafları gizlemek ve engellemeleri uygulamak',
      ],
      afterBullets: [
        'Verilerinizi reklam amacıyla kullanmayız ve satmayız.',
        'Ekibimizin yetkili üyeleri; destek, moderasyon, güvenlik veya yasal uyum için makul ölçüde gerekli olduğunda hesap verilerine (şifreler hariç) erişebilir.',
      ],
    },
    {
      heading: '3. Profil Fotoğrafları, Bildirme ve Engelleme',
      paragraphs: [
        'Profil fotoğrafı eklemek isteğe bağlıdır. Eklerseniz Velis yalnızca seçtiğiniz veya çektiğiniz fotoğrafı alır; fotoğraf kitaplığınızın geri kalanına asla erişemez. Uygulama fotoğrafı yüklemeden önce cihazınızda kare olarak kırpar ve küçültür; böylece veritabanımızda orijinalini değil, küçük bir kopyasını saklarız.',
        'Fotoğrafınız, liderlik tablosunda adınızın ve istatistiklerinizin yanında diğer Velis kullanıcılarına gösterilir. Oturum açmayı gerektirmeyen bir web adresinden sunulur; dolayısıyla bu adresi bilen herkes görseli açabilir. Fotoğrafınızı istediğiniz zaman değiştirebilir veya kaldırabilirsiniz (Profil → kalem simgesi ya da Ayarlar → Hesap); hesabınızı sildiğinizde de silinir.',
        'Kamera ve fotoğraf erişimi: Velis kamera veya fotoğraf kitaplığı erişimini yalnızca bir fotoğraf eklemeyi seçtiğinizde ister ve yalnızca bu amaçla kullanır.',
        'Bildirme ve engelleme: Bir kullanıcıyı liderlik tablosundaki ekranından bildirebilir veya engelleyebilirsiniz. Birini bildirdiğinizde bildirimi (kimin kimi bildirdiği ve varsa belirttiğiniz neden) saklar ve inceleyebilmemiz için destek adresimize e-postayla göndeririz. Birkaç farklı kişi tarafından bildirilen bir fotoğraf otomatik olarak gizlenir. Birini engellediğinizde, tüm cihazlarınızda geçerli olması için hesap kimliğini engel listenizde saklarız. Bildirimler yalnızca moderasyon ve güvenlik için kullanılır.',
      ],
    },
    {
      heading: '4. İşlemenin Hukuki Dayanakları',
      paragraphs: [
        'Türk KVKK veya AB/İngiltere GDPR gibi veri koruma mevzuatının uygulandığı durumlarda kişisel verilerinizi şu dayanaklarla işleriz: sizinle olan sözleşmemizin ifası (uygulamayı ve hesabınızı sağlamak); açık rızanız (Ayarlar\'dan istediğiniz zaman geri çekebileceğiniz isteğe bağlı hatırlatma e-postaları için); ve haklarınızla dengelenmiş meşru menfaatlerimiz (hizmeti güvende tutmak — bildirimlerin moderasyonu dahil — ve geliştirmek).',
      ],
    },
    {
      heading: '5. Paylaşım ve Açıklama',
      paragraphs: ['Kişisel verilerinizi satmaz veya kiralamayız. Verilerinizi yalnızca şu durumlarda paylaşırız:'],
      bullets: [
        'Diğer Velis kullanıcıları: adınız, istatistikleriniz ve profil fotoğrafınız liderlik tablosunda gösterilir. E-posta adresiniz ve şifreniz asla gösterilmez.',
        'Velis\'i çalıştırmak için verileri bizim adımıza işleyen hizmet sağlayıcılar: uygulama barındırma, veritabanı barındırma ve işlemsel e-posta gönderimi. Bu sağlayıcılar verileri yalnızca bize hizmet sunmak için kullanabilir.',
        'Yasal gereklilikler: yasa, hukuki süreç veya geçerli bir resmi talep gereği veya Velis\'in, kullanıcılarının ya da kamunun haklarını, güvenliğini veya mülkiyetini korumak için veri açıklamamız gerekirse.',
        'İşletme devri: Velis bir birleşme, satın alma veya varlık satışına dahil olursa verileriniz bu işlemin parçası olarak devredilebilir; verilerinizin işlenme şeklini esaslı biçimde değiştirirse sizi bilgilendiririz.',
      ],
    },
    {
      heading: '6. Verilerinizin İşlendiği Yer',
      paragraphs: [
        'Sunucularımız ve bazı hizmet sağlayıcılarımız, Avrupa Birliği ve Amerika Birleşik Devletleri dahil olmak üzere ülkenizin dışında bulunur. Verileriniz uluslararası aktarıldığında, ilgili mevzuatın gerektirdiği uygun güvencelere dayanırız.',
      ],
    },
    {
      heading: '7. Veri Saklama',
      paragraphs: [
        'Hesap verilerinizi hesabınız var olduğu sürece saklarız. Doğrulama ve şifre sıfırlama kodları kısa ömürlüdür; süresi dolduğunda veya kullanıldığında silinir.',
        'Hesabınızı sildiğinizde, hesabınız ve ilişkili verileriniz sunucularımızdan kalıcı olarak kaldırılır. Varsa yedekler dönüşümlü olarak üzerine yazılır. Yasal yükümlülüklere uymak veya uyuşmazlıkları çözmek için gereken sınırlı bilgiyi saklayabiliriz.',
        'Profil fotoğrafınız, siz kaldırana veya hesabınızı silene kadar saklanır. Hakkınızdaki bildirimler, sizin yaptığınız bildirimler ve engel listeniz, ilgili hesaplar silindiğinde silinir; bir fotoğraf hakkındaki bildirimler, o fotoğraf değiştirildiğinde veya kaldırıldığında da temizlenir.',
      ],
    },
    {
      heading: '8. Güvenlik',
      paragraphs: [
        'Veriler şifreli bağlantılar (HTTPS/TLS) üzerinden aktarılır ve erişimi kontrollü sunucularda saklanır. Şifreler güçlü, tek yönlü bir algoritmayla hash\'lenir ve geri döndürülemez.',
        'Hiçbir aktarım veya saklama yöntemi tamamen güvenli değildir. Verilerinizi korumak için makul önlemler alsak da mutlak güvenliği garanti edemeyiz.',
      ],
    },
    {
      heading: '9. Haklarınız',
      paragraphs: ['Yaşadığınız yere bağlı olarak şu haklara sahip olabilirsiniz:'],
      bullets: [
        'Hakkınızda tuttuğumuz kişisel verilere erişmek',
        'Yanlış veya eksik verileri düzelttirmek',
        'Verilerinizi sildirmek (aşağıdaki "Hesabınızı Silme" bölümüne bakın)',
        'Belirli işlemelere itiraz etmek veya işlemeyi kısıtlatmak',
        'İsteğe bağlı işlemeler için rızanızı istediğiniz zaman geri çekmek',
        'Verilerinizin taşınabilir bir kopyasını almak',
        'Yerel veri koruma otoritenize şikâyette bulunmak',
      ],
      afterBullets: ['Bu haklardan herhangi birini kullanmak için contact@forsvelis.com adresinden bize ulaşın. İlgili mevzuatın gerektirdiği süre içinde yanıt veririz.'],
    },
    {
      heading: '10. Hesabınızı Silme',
      paragraphs: [
        'Hesabınızı istediğiniz zaman uygulama içinden silebilirsiniz: Profil → Ayarlar → Hesap → Hesabı Sil. Bu işlem, hesabınızı ve verilerinizi sunucularımızdan kalıcı olarak kaldırır ve geri alınamaz.',
        'Buna profil fotoğrafınız, engel listeniz ve sizin yaptığınız ya da hakkınızda yapılan bildirimler de dahildir.',
      ],
    },
    {
      heading: '11. Çocukların Gizliliği',
      paragraphs: [
        'Velis, 13 yaşın altındaki hiç kimse için tasarlanmamıştır ve onlar tarafından kullanılamaz. Kayıt sırasında doğum tarihinizi sorarız ve 13 yaşın altındaki kullanıcılar için hesap açılmasına izin vermeyiz. 13 yaşın altındaki çocuklardan bilerek kişisel veri toplamıyoruz. Bir çocuğun bize kişisel veri verdiğini düşünüyorsanız bizimle iletişime geçin, veriyi sileriz.',
      ],
    },
    {
      heading: '12. Çerezler ve Benzer Teknolojiler',
      paragraphs: [
        'Velis, reklam veya uygulamalar arası takip teknolojileri kullanmaz. Uygulama, yalnızca sizi oturumda tutmak ve ayarlarınız ile çevrimdışı ilerlemenizi hatırlamak için cihazınızdaki yerel depolamayı kullanır.',
      ],
    },
    {
      heading: '13. Bu Politikadaki Değişiklikler',
      paragraphs: [
        'Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Esaslı değişiklikler yaparsak "Son Güncelleme" tarihini güncelleriz ve uygun olduğunda sizi uygulama içinde bilgilendiririz. Bir güncellemeden sonra Velis\'i kullanmaya devam etmeniz, revize edilmiş politikayı kabul ettiğiniz anlamına gelir.',
      ],
    },
    {
      heading: '14. İletişim',
      paragraphs: ['Bu Gizlilik Politikası veya verileriniz hakkında sorularınız varsa contact@forsvelis.com adresinden bize ulaşın.'],
    },
  ],
}

export function getTermsOfService(locale: string): LegalDocument {
  return locale === 'tr' ? TERMS_OF_SERVICE_TR : TERMS_OF_SERVICE_EN
}

export function getPrivacyPolicy(locale: string): LegalDocument {
  return locale === 'tr' ? PRIVACY_POLICY_TR : PRIVACY_POLICY_EN
}
