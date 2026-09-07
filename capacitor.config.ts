import type { CapacitorConfig } from '@capacitor/cli';

// iOS App Store paketlemesi için (bkz. npm run build:capacitor). webDir,
// Next.js'in statik export çıktısı (next.config.ts'teki CAPACITOR_BUILD=1
// modunda `output: 'export'` ile üretiliyor) - normal `npm run dev`/`build`
// buna hiç dokunmuyor, web dağıtımı bundan bağımsız çalışmaya devam ediyor.
const config: CapacitorConfig = {
  // appId (bundle identifier) kullanıcıya GÖRÜNMÜYOR - değiştirmek App
  // Store'da yeni bir uygulama + yeni provisioning demek, o yüzden aynı
  // kalıyor. Kullanıcının gördüğü isim CFBundleDisplayName (Info.plist).
  appId: 'com.forsvelis.app',
  appName: 'Velis',
  webDir: 'out',
  // WKWebView'in içerik yüklenene kadarki arka planı - varsayılan BEYAZ, bu
  // yüzden native splash kaybolduktan sonra web ilk kareyi çizene kadar
  // yarım saniyelik beyaz bir flaş oluyordu. Uygulamanın kendi zeminiyle
  // (#050505) eşleştiriyoruz - siyahtan siyaha, görünmez geçiş.
  backgroundColor: '#050505',
  ios: {
    backgroundColor: '#050505',
  },
};

export default config;
