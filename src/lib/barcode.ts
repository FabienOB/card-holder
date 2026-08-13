import {
  code128,
  code39,
  datamatrix,
  drawingSVG,
  ean13,
  ean8,
  interleaved2of5,
  qrcode,
  rationalizedCodabar,
  type RenderOptions,
} from 'bwip-js/browser'
import type { BarcodeFormat } from '../types'
import { is2D } from '../types'

/**
 * Notre enum → encodeur bwip-js.
 *
 * On importe **une fonction par symbologie** au lieu du `toSVG({ bcid })`
 * générique : ce dernier passe par une table de correspondance qui référence
 * les ~110 symbologies de la bibliothèque, ce qui empêche tout tree-shaking.
 * En ciblant les 8 encodeurs réellement utilisés, le bundle passe de
 * 1,25 Mo à ~330 Ko. `drawingSVG()` est le même backend de rendu que celui
 * qu'utilise `toSVG` en interne : le SVG produit est identique.
 */
type Encoder = (opts: RenderOptions, drawing: ReturnType<typeof drawingSVG>) => string

const ENCODERS: Record<BarcodeFormat, Encoder> = {
  EAN_13: ean13,
  EAN_8: ean8,
  CODE_128: code128,
  CODE_39: code39,
  ITF: interleaved2of5,
  CODABAR: rationalizedCodabar,
  QR_CODE: qrcode,
  DATA_MATRIX: datamatrix,
}

/**
 * `bcid` n'est plus utilisé pour choisir l'encodeur (il est passé
 * directement), mais reste requis par le type `RenderOptions`.
 */
const BCID: Record<BarcodeFormat, string> = {
  EAN_13: 'ean13',
  EAN_8: 'ean8',
  CODE_128: 'code128',
  CODE_39: 'code39',
  ITF: 'interleaved2of5',
  CODABAR: 'rationalizedCodabar',
  QR_CODE: 'qrcode',
  DATA_MATRIX: 'datamatrix',
}

/**
 * Quiet zone : bwip-js exprime `paddingwidth` en modules (multipliés par `scale`).
 * 10 modules de chaque côté, comme exigé par les spécifications de lecture.
 */
const QUIET_ZONE_MODULES = 10

export interface RenderedBarcode {
  svg: string
  error: string | null
}

/**
 * Rendu **synchrone** : l'encodage bwip-js ne fait aucune I/O, ce qui permet
 * d'afficher la carte au premier paint, sans état de chargement.
 */
export function renderBarcodeSVG(code: string, format: BarcodeFormat): RenderedBarcode {
  const twoD = is2D(format)
  try {
    let svg = ENCODERS[format](
      {
        bcid: BCID[format],
        text: code,
        scale: 3,
        // Hauteur en mm pour les symbologies linéaires ; ignorée en 2D.
        ...(twoD ? {} : { height: 16 }),
        includetext: false,
        paddingwidth: twoD ? 4 : QUIET_ZONE_MODULES,
        paddingheight: twoD ? 4 : 0,
        backgroundcolor: 'FFFFFF',
        barcolor: '000000',
      },
      drawingSVG(),
    )

    // bwip-js n'émet qu'un viewBox : on pilote la taille en CSS.
    // Les codes linéaires peuvent être étirés (le facteur horizontal reste
    // uniforme sur toute la largeur, les ratios de modules sont préservés) ;
    // les codes 2D doivent impérativement rester carrés.
    svg = svg.replace(
      '<svg ',
      `<svg preserveAspectRatio="${twoD ? 'xMidYMid meet' : 'none'}" style="width:100%;height:100%;display:block" `,
    )
    return { svg, error: null }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    return { svg: '', error: `Ce code ne peut pas être encodé en ${format} : ${detail}` }
  }
}

/* ------------------------------------------------------------------ */
/* BarcodeDetector : formats natifs → notre enum                       */
/* ------------------------------------------------------------------ */

/** Formats que l'on demande au détecteur natif (superset de notre enum). */
export const DETECTOR_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'codabar',
  'qr_code',
  'data_matrix',
]

/**
 * Convertit un résultat natif. UPC-A et UPC-E ne sont pas dans notre modèle :
 * ce sont des cas particuliers d'EAN-13, on les normalise à l'import.
 */
export function fromDetectedFormat(
  detected: string,
  rawValue: string,
): { code: string; format: BarcodeFormat } | null {
  switch (detected) {
    case 'ean_13':
      return { code: rawValue, format: 'EAN_13' }
    case 'ean_8':
      return { code: rawValue, format: 'EAN_8' }
    case 'upc_a':
      // UPC-A (12 chiffres) = EAN-13 préfixé d'un zéro.
      return { code: rawValue.length === 12 ? `0${rawValue}` : rawValue, format: 'EAN_13' }
    case 'upc_e': {
      const upcA = expandUpcE(rawValue)
      return upcA ? { code: `0${upcA}`, format: 'EAN_13' } : null
    }
    case 'code_128':
      return { code: rawValue, format: 'CODE_128' }
    case 'code_39':
      return { code: rawValue, format: 'CODE_39' }
    case 'itf':
      return { code: rawValue, format: 'ITF' }
    case 'codabar':
      return { code: rawValue, format: 'CODABAR' }
    case 'qr_code':
      return { code: rawValue, format: 'QR_CODE' }
    case 'data_matrix':
      return { code: rawValue, format: 'DATA_MATRIX' }
    default:
      return null
  }
}

/**
 * Déploie un UPC-E (6, 7 ou 8 chiffres) en UPC-A 12 chiffres.
 * Règle standard basée sur le dernier chiffre du corps.
 */
export function expandUpcE(value: string): string | null {
  let digits = value
  if (!/^\d+$/.test(digits)) return null
  if (digits.length === 6) digits = `0${digits}0` // sans système ni clé
  if (digits.length === 7) digits = `${digits}0` // sans clé
  if (digits.length !== 8) return null

  const system = digits[0]
  if (system !== '0' && system !== '1') return null
  const body = digits.slice(1, 7)
  const check = digits[7]
  const last = body[5]
  const d = body.slice(0, 5)

  let mfr: string
  let item: string
  switch (last) {
    case '0':
    case '1':
    case '2':
      mfr = `${d.slice(0, 2)}${last}00`
      item = `00${d.slice(2, 5)}`
      break
    case '3':
      mfr = `${d.slice(0, 3)}00`
      item = `000${d.slice(3, 5)}`
      break
    case '4':
      mfr = `${d.slice(0, 4)}0`
      item = `0000${d[4]}`
      break
    default:
      mfr = d.slice(0, 5)
      item = `0000${last}`
      break
  }
  return `${system}${mfr}${item}${check}`
}
