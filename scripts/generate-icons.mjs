/**
 * Génère les icônes PNG de la PWA sans aucune dépendance externe :
 * rasterisation maison + encodeur PNG basé sur le zlib de Node.
 *
 *   node scripts/generate-icons.mjs
 *
 * Les fichiers produits vont dans public/ et sont précachés par Workbox.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/* ---------------------------------------------------------------- */
/* Encodeur PNG                                                      */
/* ---------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** `rgba` : Uint8Array de taille width*height*4. */
function encodePNG(rgba, width, height) {
  const stride = width * 4
  // Un octet de filtre (0 = None) par scanline.
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------------------------------------------------------- */
/* Rasterisation                                                     */
/* ---------------------------------------------------------------- */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

const BG = hex('#1f2937') // theme_color
const CARD = hex('#ffffff')
const BAR = hex('#111827')

/** Test d'appartenance à un rectangle à coins arrondis. */
function inRoundRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

// Largeurs de modules du faux code-barres, alternance encre / blanc.
const MODULES = [3, 1, 2, 1, 1, 2, 3, 1, 1, 3, 2, 1, 2, 1, 3]

function drawIcon(size, { maskable }) {
  const SS = 4 // suréchantillonnage : 4x4 sous-pixels par pixel
  const N = size * SS
  const rgba = new Uint8Array(size * size * 4)

  // Géométrie normalisée (fraction de la taille de l'icône).
  const g = maskable
    ? // Contenu confiné dans la zone sûre centrale (80 %) exigée par le masque.
      { bgRadius: 0, cardX: 0.1875, cardY: 0.291, cardW: 0.625, cardH: 0.418, cardR: 0.05, pad: 0.05 }
    : { bgRadius: 0.1875, cardX: 0.125, cardY: 0.25, cardW: 0.75, cardH: 0.5, cardR: 0.0625, pad: 0.0625 }

  const cardX = g.cardX * N
  const cardY = g.cardY * N
  const cardW = g.cardW * N
  const cardH = g.cardH * N
  const cardR = g.cardR * N
  const pad = g.pad * N

  const barsX = cardX + pad
  const barsY = cardY + pad
  const barsW = cardW - 2 * pad
  const barsH = cardH - 2 * pad
  const totalModules = MODULES.reduce((a, b) => a + b, 0)
  const moduleW = barsW / totalModules

  // Bornes des barres encrées, précalculées.
  const inkSpans = []
  {
    let cursor = 0
    MODULES.forEach((width, index) => {
      const start = barsX + cursor * moduleW
      const end = start + width * moduleW
      if (index % 2 === 0) inkSpans.push([start, end])
      cursor += width
    })
  }

  const bgRadius = g.bgRadius * N

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let gg = 0
      let b = 0
      let a = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx + 0.5
          const py = y * SS + sy + 0.5

          let color = null
          const insideBg = g.bgRadius === 0 ? true : inRoundRect(px, py, 0, 0, N, N, bgRadius)
          if (insideBg) color = BG
          if (inRoundRect(px, py, cardX, cardY, cardW, cardH, cardR)) {
            color = CARD
            if (py >= barsY && py <= barsY + barsH) {
              for (const [s, e] of inkSpans) {
                if (px >= s && px < e) {
                  color = BAR
                  break
                }
              }
            }
          }

          if (color) {
            r += color[0]
            gg += color[1]
            b += color[2]
            a += 255
          }
        }
      }

      const samples = SS * SS
      const i = (y * size + x) * 4
      // Prémultiplication inverse : la couleur moyenne ne compte que les
      // sous-pixels opaques, sinon les bords virent au noir.
      const opaque = a / 255
      rgba[i] = opaque ? Math.round(r / opaque) : 0
      rgba[i + 1] = opaque ? Math.round(gg / opaque) : 0
      rgba[i + 2] = opaque ? Math.round(b / opaque) : 0
      rgba[i + 3] = Math.round(a / samples)
    }
  }

  return encodePNG(rgba, size, size)
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
]

for (const { file, size, maskable } of targets) {
  const png = drawIcon(size, { maskable })
  writeFileSync(join(OUT_DIR, file), png)
  console.log(`${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} Ko`)
}

// Favicon vectoriel, même dessin, embarqué dans le bundle.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1f2937"/>
  <rect x="64" y="128" width="384" height="256" rx="32" fill="#ffffff"/>
  ${(() => {
    const total = MODULES.reduce((a, b) => a + b, 0)
    const w = 384 - 64
    const unit = w / total
    let cursor = 0
    return MODULES.map((width, index) => {
      const x = 96 + cursor * unit
      cursor += width
      return index % 2 === 0
        ? `<rect x="${x.toFixed(2)}" y="160" width="${(width * unit).toFixed(2)}" height="192" fill="#111827"/>`
        : ''
    }).join('\n  ')
  })()}
</svg>
`
writeFileSync(join(OUT_DIR, 'favicon.svg'), favicon)
console.log('favicon.svg')
