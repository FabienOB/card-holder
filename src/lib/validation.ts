import type { BarcodeFormat } from '../types'

/** Clé de contrôle EAN/UPC : poids 3-1 en partant de la droite. */
export function eanCheckDigit(digitsWithoutCheck: string): number {
  let sum = 0
  const reversed = digitsWithoutCheck.split('').reverse()
  for (let i = 0; i < reversed.length; i++) {
    const d = Number(reversed[i])
    sum += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (sum % 10)) % 10
}

function validateEan(code: string, length: number): string | null {
  if (!/^\d+$/.test(code)) return 'Ce format n’accepte que des chiffres.'
  if (code.length !== length) return `Il faut exactement ${length} chiffres (actuellement ${code.length}).`
  const expected = eanCheckDigit(code.slice(0, length - 1))
  if (Number(code[length - 1]) !== expected) {
    return `Clé de contrôle invalide : le dernier chiffre devrait être ${expected}.`
  }
  return null
}

const CODE_39_CHARSET = /^[0-9A-Z\-. $/+%]*$/
const CODABAR_BODY = /^[0-9\-$:/.+]*$/

/**
 * Retourne un message d'erreur affichable, ou `null` si le code est valide
 * pour le format demandé.
 */
export function validateCode(code: string, format: BarcodeFormat): string | null {
  const value = code.trim()
  if (!value) return 'Le code est obligatoire.'

  switch (format) {
    case 'EAN_13':
      return validateEan(value, 13)
    case 'EAN_8':
      return validateEan(value, 8)
    case 'CODE_39':
      if (!CODE_39_CHARSET.test(value)) {
        return 'Code 39 : uniquement 0-9, A-Z majuscules et - . $ / + % espace.'
      }
      return null
    case 'ITF':
      if (!/^\d+$/.test(value)) return 'ITF n’accepte que des chiffres.'
      if (value.length % 2 !== 0) return 'ITF exige un nombre pair de chiffres.'
      return null
    case 'CODABAR': {
      const start = value[0]?.toUpperCase()
      const stop = value[value.length - 1]?.toUpperCase()
      if (value.length < 3) return 'Codabar : code trop court.'
      if (!'ABCD'.includes(start) || !'ABCD'.includes(stop)) {
        return 'Codabar : le code doit commencer et finir par une lettre A, B, C ou D.'
      }
      if (!CODABAR_BODY.test(value.slice(1, -1))) {
        return 'Codabar : uniquement 0-9 et - $ : / . + entre les délimiteurs.'
      }
      return null
    }
    case 'CODE_128':
      // eslint-disable-next-line no-control-regex
      if (!/^[\x00-\x7F]*$/.test(value)) return 'Code 128 : caractères ASCII uniquement.'
      return null
    case 'QR_CODE':
    case 'DATA_MATRIX':
      return null
    default:
      return null
  }
}

/**
 * Devine le format le plus probable pour une saisie manuelle,
 * afin de pré-sélectionner le bon sélecteur.
 */
export function guessFormat(code: string): BarcodeFormat {
  const value = code.trim()
  if (/^\d{13}$/.test(value) && validateCode(value, 'EAN_13') === null) return 'EAN_13'
  if (/^\d{8}$/.test(value) && validateCode(value, 'EAN_8') === null) return 'EAN_8'
  return 'CODE_128'
}

/** Groupe par 4 caractères : lisible à voix haute et à la ressaisie. */
export function groupByFour(code: string): string {
  return code.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}
