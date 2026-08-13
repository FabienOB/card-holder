/**
 * Planche de contrôle des pictogrammes → public/../logos-preview.png (hors dépôt).
 *
 *   npm run logos:preview
 *
 * Pourquoi cet outil : les pictogrammes sont écrits à la main en SVG et rien,
 * dans la chaîne de build, ne dit s'ils *ressemblent* à quelque chose. Sans
 * navigateur, c'était du dessin à l'aveugle.
 *
 * Principe : esbuild transpile le JSX vers une fabrique qui rend un arbre
 * d'objets, chaque forme est aplatie en polyligne, puis le trait est rendu
 * par distance au segment — ce qui reproduit exactement le rendu de
 * `stroke-linejoin: round` / `stroke-linecap: round` du composant.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------------------------------------------------------- */
/* PNG                                                               */
/* ---------------------------------------------------------------- */
const CRC = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
const crc32 = (b) => {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
const png = (rgba, w, h) => {
  const s = w * 4
  const raw = Buffer.alloc((s + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (s + 1)] = 0
    Buffer.from(rgba.buffer, y * s, s).copy(raw, y * (s + 1) + 1)
  }
  const ih = Buffer.alloc(13)
  ih.writeUInt32BE(w, 0)
  ih.writeUInt32BE(h, 4)
  ih[8] = 8
  ih[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ih),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------------------------------------------------------- */
/* Géométrie : tout devient polyligne                                */
/* ---------------------------------------------------------------- */
const STEPS = 24

function cubic(p0, p1, p2, p3, out) {
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
}

/** Arc elliptique SVG → points, via la paramétrisation du centre. */
function arc(p0, rx, ry, phiDeg, largeArc, sweep, p1, out) {
  if (rx === 0 || ry === 0) return out.push(p1)
  const phi = (phiDeg * Math.PI) / 180
  const cosP = Math.cos(phi)
  const sinP = Math.sin(phi)
  const dx = (p0[0] - p1[0]) / 2
  const dy = (p0[1] - p1[1]) / 2
  const x1 = cosP * dx + sinP * dy
  const y1 = -sinP * dx + cosP * dy
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1
  let coef = Math.sqrt(Math.max(0, num / den))
  if (largeArc === sweep) coef = -coef
  const cxp = (coef * rx * y1) / ry
  const cyp = (-coef * ry * x1) / rx
  const cx = cosP * cxp - sinP * cyp + (p0[0] + p1[0]) / 2
  const cy = sinP * cxp + cosP * cyp + (p0[1] + p1[1]) / 2
  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy)
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)))
    if (ux * vy - uy * vx < 0) a = -a
    return a
  }
  const theta = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
  let delta = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  if (sweep && delta < 0) delta += 2 * Math.PI
  for (let i = 1; i <= STEPS; i++) {
    const t = theta + (delta * i) / STEPS
    const ex = rx * Math.cos(t)
    const ey = ry * Math.sin(t)
    out.push([cosP * ex - sinP * ey + cx, sinP * ex + cosP * ey + cy])
  }
}

/** Découpe un attribut `d` en sous-chemins de points. */
function flattenPath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []
  const subpaths = []
  let pts = []
  let cur = [0, 0]
  let start = [0, 0]
  let cmd = ''
  let i = 0
  // Dernier point de contrôle, nécessaire aux commandes lissées S/s et T/t :
  // leur premier contrôle est le reflet du précédent par rapport au point
  // courant. Sans cela, le chemin est mal interprété — et un pictogramme
  // correct paraîtrait cassé.
  let prevCtrl = null
  let prevWasCurve = false
  const num = () => parseFloat(tokens[i++])
  const flush = () => {
    if (pts.length > 1) subpaths.push(pts)
    pts = []
  }

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    if (C === 'M') {
      flush()
      const x = num()
      const y = num()
      cur = rel ? [cur[0] + x, cur[1] + y] : [x, y]
      start = cur
      pts = [cur]
      cmd = rel ? 'l' : 'L'
    } else if (C === 'L') {
      const x = num()
      const y = num()
      cur = rel ? [cur[0] + x, cur[1] + y] : [x, y]
      pts.push(cur)
    } else if (C === 'H') {
      const x = num()
      cur = [rel ? cur[0] + x : x, cur[1]]
      pts.push(cur)
    } else if (C === 'V') {
      const y = num()
      cur = [cur[0], rel ? cur[1] + y : y]
      pts.push(cur)
    } else if (C === 'C') {
      const a = [num(), num()]
      const b = [num(), num()]
      const e = [num(), num()]
      const p1 = rel ? [cur[0] + a[0], cur[1] + a[1]] : a
      const p2 = rel ? [cur[0] + b[0], cur[1] + b[1]] : b
      const p3 = rel ? [cur[0] + e[0], cur[1] + e[1]] : e
      cubic(cur, p1, p2, p3, pts)
      cur = p3
      prevCtrl = p2
      prevWasCurve = true
      continue
    } else if (C === 'S') {
      const b = [num(), num()]
      const e = [num(), num()]
      const p2 = rel ? [cur[0] + b[0], cur[1] + b[1]] : b
      const p3 = rel ? [cur[0] + e[0], cur[1] + e[1]] : e
      // Reflet du contrôle précédent ; à défaut, le point courant.
      const p1 = prevWasCurve && prevCtrl ? [2 * cur[0] - prevCtrl[0], 2 * cur[1] - prevCtrl[1]] : cur
      cubic(cur, p1, p2, p3, pts)
      cur = p3
      prevCtrl = p2
      prevWasCurve = true
      continue
    } else if (C === 'Q' || C === 'T') {
      let q
      if (C === 'Q') {
        const a = [num(), num()]
        q = rel ? [cur[0] + a[0], cur[1] + a[1]] : a
      } else {
        q = prevWasCurve && prevCtrl ? [2 * cur[0] - prevCtrl[0], 2 * cur[1] - prevCtrl[1]] : cur
      }
      const e = [num(), num()]
      const p3 = rel ? [cur[0] + e[0], cur[1] + e[1]] : e
      // Quadratique → cubique équivalente.
      cubic(
        cur,
        [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])],
        [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])],
        p3,
        pts,
      )
      cur = p3
      prevCtrl = q
      prevWasCurve = true
      continue
    } else if (C === 'A') {
      const rx = num()
      const ry = num()
      const rot = num()
      const laf = num()
      const sf = num()
      const x = num()
      const y = num()
      const end = rel ? [cur[0] + x, cur[1] + y] : [x, y]
      arc(cur, rx, ry, rot, laf, sf, end, pts)
      cur = end
    } else if (C === 'Z') {
      pts.push(start)
      cur = start
      flush()
    } else {
      // Une commande non gérée décalerait la lecture des nombres et
      // produirait un tracé faux : mieux vaut échouer bruyamment.
      throw new Error(`Commande de chemin non gérée : « ${cmd} » dans « ${d} »`)
    }
    prevCtrl = null
    prevWasCurve = false
  }
  flush()
  return subpaths
}

const ellipsePoints = (cx, cy, rx, ry) => {
  const pts = []
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * 2 * Math.PI
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)])
  }
  return [pts]
}

const roundRectPoints = (x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2)
  let d = `M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}`
  d += `V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}`
  d += `H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}`
  d += `V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`
  return flattenPath(d)
}

const applyTransform = (subpaths, t) =>
  !t ? subpaths : subpaths.map((p) => p.map(([x, y]) => t(x, y)))

const parseRotate = (value) => {
  const m = /rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(value ?? '')
  if (!m) return null
  const a = (parseFloat(m[1]) * Math.PI) / 180
  const cx = parseFloat(m[2])
  const cy = parseFloat(m[3])
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return (x, y) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]
}

/** Parcourt l'arbre JSX et en extrait traits et disques pleins. */
function collect(node, inherited, out) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n) => collect(n, inherited, out))

  const props = node.props ?? {}
  const ctx = {
    stroke: props.stroke ?? inherited.stroke,
    fill: props.fill ?? inherited.fill,
    width: props.strokeWidth ?? inherited.width,
    transform: parseRotate(props.transform) ?? inherited.transform,
  }

  const push = (subpaths) => {
    const moved = applyTransform(subpaths, ctx.transform)
    const filled = ctx.fill && ctx.fill !== 'none'
    if (filled && node.tag === 'circle') {
      const [cx, cy] = ctx.transform
        ? ctx.transform(+props.cx, +props.cy)
        : [+props.cx, +props.cy]
      out.discs.push([cx, cy, +props.r])
    } else {
      out.strokes.push({ subpaths: moved, width: ctx.width ?? 1.7 })
    }
  }

  switch (node.tag) {
    case 'path':
      push(flattenPath(props.d ?? ''))
      break
    case 'rect':
      push(roundRectPoints(+props.x, +props.y, +props.width, +props.height, +(props.rx ?? 0)))
      break
    case 'circle':
      if (ctx.fill && ctx.fill !== 'none') push([])
      else push(ellipsePoints(+props.cx, +props.cy, +props.r, +props.r))
      break
    case 'ellipse':
      push(ellipsePoints(+props.cx, +props.cy, +props.rx, +props.ry))
      break
    default:
      break
  }

  collect(node.children, ctx, out)
}

const distSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function rasterize(shapes, size) {
  const SS = 3
  const rgba = new Uint8Array(size * size * 4).fill(255)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let ink = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = ((x * SS + sx + 0.5) / (size * SS)) * 24
          const py = ((y * SS + sy + 0.5) / (size * SS)) * 24
          let hit = false
          for (const [cx, cy, r] of shapes.discs) {
            if (Math.hypot(px - cx, py - cy) <= r) {
              hit = true
              break
            }
          }
          if (!hit) {
            outer: for (const s of shapes.strokes) {
              for (const pts of s.subpaths) {
                for (let k = 1; k < pts.length; k++) {
                  if (distSeg(px, py, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]) <= s.width / 2) {
                    hit = true
                    break outer
                  }
                }
              }
            }
          }
          if (hit) ink++
        }
      }
      const v = 255 - Math.round((255 * ink) / (SS * SS))
      const i = (y * size + x) * 4
      rgba[i] = rgba[i + 1] = rgba[i + 2] = v
      rgba[i + 3] = 255
    }
  }
  return rgba
}

/* ---------------------------------------------------------------- */
/* Assemblage                                                        */
/* ---------------------------------------------------------------- */
const tmp = mkdtempSync(join(tmpdir(), 'logos-preview-'))
try {
  const entry = join(tmp, 'entry.jsx')
  writeFileSync(
    entry,
    `globalThis.h = (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity) })
     export { LOGOS } from ${JSON.stringify(join(ROOT, 'src/lib/logos.tsx'))}`,
  )
  const bundle = join(tmp, 'logos.mjs')
  execFileSync(join(ROOT, 'node_modules', '.bin', 'esbuild'), [
    entry,
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--jsx=transform',
    '--jsx-factory=h',
    `--outfile=${bundle}`,
    '--log-level=error',
  ])

  const { LOGOS } = await import(`file://${bundle}`)

  const CELL = 72
  const GAP = 10
  const COLS = 8
  const rows = Math.ceil(LOGOS.length / COLS)
  const W = GAP + COLS * (CELL + GAP)
  const H = GAP + rows * (CELL + GAP)
  const sheet = new Uint8Array(W * H * 4).fill(255)

  LOGOS.forEach((logo, idx) => {
    const shapes = { strokes: [], discs: [] }
    collect(logo.render({}), { width: 1.7 }, shapes)
    const cell = rasterize(shapes, CELL)
    const ox = GAP + (idx % COLS) * (CELL + GAP)
    const oy = GAP + Math.floor(idx / COLS) * (CELL + GAP)
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const s = (y * CELL + x) * 4
        const d = ((y + oy) * W + (x + ox)) * 4
        sheet[d] = cell[s]
        sheet[d + 1] = cell[s + 1]
        sheet[d + 2] = cell[s + 2]
        sheet[d + 3] = 255
      }
    }
  })

  const out = process.argv[2] ?? join(ROOT, 'logos-preview.png')
  writeFileSync(out, png(sheet, W, H))
  console.log(`${LOGOS.length} pictogrammes → ${out}`)
  LOGOS.forEach((l, i) => {
    if (i % COLS === 0) process.stdout.write('\n  ')
    process.stdout.write(l.label.padEnd(16))
  })
  console.log()
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
