// Generates docs/privacy.html and docs/terms.html from the single source of
// truth: app/lib/legalDocuments.ts. Re-run whenever the legal text changes:
//   node docs/_build-legal.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../app/lib/legalDocuments.ts'), 'utf8')

function extract(name) {
  const start = src.indexOf(`const ${name}: LegalDocument = `)
  if (start < 0) throw new Error(`not found: ${name}`)
  let i = src.indexOf('{', start)
  let depth = 0
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        const literal = src.slice(i, j + 1)
        // eslint-disable-next-line no-new-func -- our own data literal
        return Function(`return (${literal})`)()
      }
    }
  }
  throw new Error(`unbalanced braces: ${name}`)
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function renderDoc(doc) {
  const parts = []
  parts.push(`<h2>${esc(doc.title)}</h2>`)
  parts.push(`<p class="updated">${esc(doc.lastUpdated)}</p>`)
  for (const p of doc.intro || []) parts.push(`<p>${esc(p)}</p>`)
  for (const sec of doc.sections || []) {
    parts.push(`<h3>${esc(sec.heading)}</h3>`)
    for (const p of sec.paragraphs || []) parts.push(`<p>${esc(p)}</p>`)
    if (sec.bullets && sec.bullets.length) {
      parts.push('<ul>' + sec.bullets.map((b) => `<li>${esc(b)}</li>`).join('') + '</ul>')
    }
    for (const p of sec.afterBullets || []) parts.push(`<p>${esc(p)}</p>`)
  }
  return parts.join('\n')
}

function page(slug, titleEN, en, tr) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Velis — ${titleEN}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background:#050505; color:#C9C3BA; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; line-height:1.65; padding:48px 20px 96px; }
  .wrap { max-width:680px; margin:0 auto; }
  .home { display:inline-block; margin-bottom:28px; color:#8F8A83; font-size:13px; text-decoration:none; }
  h1 { text-align:center; letter-spacing:3px; font-size:22px; color:#E3C08C; font-weight:600; }
  h2 { color:#F5F0EA; font-size:20px; font-weight:600; margin:8px 0 2px; }
  h3 { color:#E9E4DC; font-size:16px; font-weight:600; margin:26px 0 6px; }
  p { margin:8px 0; font-size:15px; }
  .updated { color:#6f6a63; font-size:13px; margin-bottom:18px; }
  ul { margin:8px 0 8px 22px; }
  li { font-size:15px; margin:4px 0; }
  a { color:#E3C08C; }
  .langbar { text-align:center; margin:20px 0 40px; }
  .langbar a { margin:0 10px; font-size:13px; }
  hr { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:64px 0; }
  footer { text-align:center; color:#6f6a63; font-size:12px; margin-top:56px; }
</style>
</head>
<body>
<div class="wrap">
  <a class="home" href="/">← Home</a>
  <h1>VELIS</h1>
  <div class="langbar"><a href="#en">English</a><a href="#tr">Türkçe</a></div>

  <div id="en">
${renderDoc(en)}
  </div>

  <hr />

  <div id="tr">
${renderDoc(tr)}
  </div>

  <footer>© 2026 Velis · contact@forsvelis.com</footer>
</div>
</body>
</html>
`
}

const privacyEN = extract('PRIVACY_POLICY_EN')
const privacyTR = extract('PRIVACY_POLICY_TR')
const termsEN = extract('TERMS_OF_SERVICE_EN')
const termsTR = extract('TERMS_OF_SERVICE_TR')

writeFileSync(join(here, 'privacy.html'), page('privacy', 'Privacy Policy', privacyEN, privacyTR))
writeFileSync(join(here, 'terms.html'), page('terms', 'Terms of Service', termsEN, termsTR))
console.log('wrote docs/privacy.html and docs/terms.html')
