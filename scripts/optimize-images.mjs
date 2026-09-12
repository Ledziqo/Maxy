import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

// Lossless derivatives only. Originals remain available for printing/downloads.
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
const sources = tracked.filter(p => /^src\/.*\.(jsx|css)$/.test(p)).concat('src/hero-blend.css', 'index.html')
const uniqueSources = [...new Set(sources)]
const texts = await Promise.all(uniqueSources.map(async p => [p, await fs.readFile(p, 'utf8')]))
const groups = new Map()
for (const file of tracked.filter(p => /^images\/.*\.(png|jpe?g)$/i.test(p))) {
  const name = path.basename(file)
  if (!texts.some(([, text]) => text.includes(name))) continue
  groups.set(name, [...(groups.get(name) || []), file])
}
const replacements = new Map()
let before = 0, after = 0, count = 0
for (const [name, files] of groups) {
  const candidates = []
  for (const file of files) {
    const original = await fs.readFile(file)
    const webp = await sharp(original).webp({ lossless: true, effort: 6 }).toBuffer()
    const a = await sharp(original).ensureAlpha().raw().toBuffer()
    const b = await sharp(webp).ensureAlpha().raw().toBuffer()
    if (!a.equals(b)) { console.log(`Keeping original (pixel check): ${file}`); candidates.push({ file, original, webp: original }); continue }
    candidates.push({ file, original, webp })
  }
  if (candidates.some(c => c.webp.length >= c.original.length)) continue
  replacements.set(name, name + '.webp')
  for (const c of candidates) {
    await fs.writeFile(c.file + '.webp', c.webp)
    before += c.original.length; after += c.webp.length; count++
    console.log(`${c.file}: ${c.original.length} -> ${c.webp.length} bytes; identical pixels`)
  }
}
for (const [file, original] of texts) {
  let updated = original
  for (const [name, replacement] of replacements) updated = updated.replaceAll(replacement, name).replaceAll(name, replacement)
  if (updated !== original) await fs.writeFile(file, updated)
}
console.log(JSON.stringify({ count, before, after, savedPercent: Math.round((1 - after / before) * 100) }))
